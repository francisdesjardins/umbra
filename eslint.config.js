import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import oxlint from 'eslint-plugin-oxlint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ---------------------------------------------------------------------------
// Shared rules — applied to every TS/TSX scope below.
// ---------------------------------------------------------------------------
const sharedTsRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],
  '@typescript-eslint/no-misused-promises': [
    'error',
    {
      checksVoidReturn: {
        attributes: false,
        // Allow async functions in object properties (e.g., plain MUI callbacks like onClick, onMouseEnter)
        // This provides better DX for action handlers passed as object properties
        properties: false,
      },
    },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  // Allow void in union types for callback returns - needed for better DX
  '@typescript-eslint/no-invalid-void-type': 'off',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  eqeqeq: 'error',
  curly: ['error', 'all'],
  'arrow-parens': ['error', 'always'],
  // No implicit returns — every arrow function uses a block body with an explicit
  // `return`. Concise bodies hide the return value and make a one-line arrow awkward
  // to extend (adding a statement means rewriting the whole body).
  'arrow-body-style': ['error', 'always'],
};

const tsBase = [js.configs.recommended, ...tseslint.configs.strictTypeChecked];

// Looser base for scripts: keep type-checking but drop the
// strict-only rules (no-non-null-assertion, no-unnecessary-condition, etc.)
// that are appropriate for library code but noisy for one-shot scripts.
const tsBaseScripts = [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked];

// React 19 + React Compiler + TS: react-hooks is the rule set that catches real bugs.
// eslint-plugin-react's recommended config is largely PropTypes/legacy checks that
// are redundant under TypeScript — omitted.
const reactPluginRules = {
  ...reactHooks.configs.recommended.rules,
};

export default defineConfig(
  // -------------------------------------------------------------------------
  // Ignores (global)
  // -------------------------------------------------------------------------
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/playwright/.cache/**',
      '**/test-results/**',
      '**/coverage/**',
      'playground/dist/**',
      '**/.vite/**',
      '**/*.d.ts',
      // Vendored Yarn release (committed so Corepack resolves a pinned version) — third-party
      // bundled output, not project source.
      '.yarn/**',
    ],
  },

  // -------------------------------------------------------------------------
  // Scope 1 — Library source (browser runtime, React)
  // -------------------------------------------------------------------------
  {
    extends: tsBase,
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser },
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactPluginRules,
      ...sharedTsRules,
    },
  },

  // -------------------------------------------------------------------------
  // Scope 2 — Playground (browser runtime, React, Vite HMR)
  // -------------------------------------------------------------------------
  {
    extends: tsBase,
    files: ['playground/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser },
      parserOptions: {
        project: ['./playground/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactPluginRules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      ...sharedTsRules,
    },
  },
  // Playground template sub-scope: enforce gap/Stack over margin props
  {
    files: ['playground/src/shared/templates/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='mt']",
          message: 'Templates: use gap/Stack instead of vertical spacing props (mt).',
        },
        {
          selector: "JSXAttribute[name.name='mb']",
          message: 'Templates: use gap/Stack instead of vertical spacing props (mb).',
        },
        {
          selector: "JSXAttribute[name.name='gutterBottom']",
          message: 'Templates: use gap/Stack instead of vertical spacing props (gutterBottom).',
        },
        {
          selector: "Property[key.name='marginTop']",
          message: 'Templates: use gap instead of marginTop.',
        },
        {
          selector: "Property[key.name='marginBottom']",
          message: 'Templates: use gap instead of marginBottom.',
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Scope 3 — Node scripts, root config files
  // -------------------------------------------------------------------------
  {
    extends: tsBaseScripts,
    files: ['vite.config.ts', 'vite.config.esm.ts', 'playwright.config.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.node },
      parserOptions: {
        project: ['./tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedTsRules,
      'no-console': 'off',
    },
  },

  // -------------------------------------------------------------------------
  // Scope 3b — Debug/dev scripts under .claude (Node + Playwright browser eval)
  // These drive a real browser: the top level is Node, but `page.evaluate` bodies
  // reference browser globals. Console output is the whole point, so allow it.
  // -------------------------------------------------------------------------
  {
    // Standalone Node scripts: the repo's own tooling (`.claude/` probes, `scripts/`
    // pre-publish checks). Reporting to stdout is their entire output contract.
    files: ['.claude/**/*.{mjs,js}', 'scripts/**/*.{mjs,js}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
    },
  },

  // -------------------------------------------------------------------------
  // Scope 3d — The microfrontend demo, served verbatim from `public/`
  //
  // Plain browser JavaScript with no build step, which is the demonstration: the import map is
  // what resolves `umbra`, so nothing may compile these files. That puts them outside every
  // TS scope above — and shipped code the code viewer prints is exactly the code worth linting.
  // Untyped, so the type-aware rules cannot apply; `no-undef` does the work instead.
  // -------------------------------------------------------------------------
  {
    extends: [js.configs.recommended],
    files: ['playground/public/mfe/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      eqeqeq: 'error',
      curly: ['error', 'all'],
      'arrow-parens': ['error', 'always'],
      'arrow-body-style': ['error', 'always'],
      // The two logs on the page are the demo's output; `console` is not.
      'no-console': 'error',
    },
  },

  // -------------------------------------------------------------------------
  // Scope 3c — JSDoc examples, extracted by `scripts/check-examples.mjs`
  //
  // A doc example is code a reader copies, so it is linted — but as a snippet, not as library
  // source. It shows a call and stops, so it leaves bindings unread; it leans on `declare`d
  // `any` stand-ins for the app around it; and it uses concise arrows on purpose, which is the
  // opposite of what `arrow-body-style` asks of the library. What is left on is the class of
  // rule that would make the example teach a bug — a floating promise, a `==`.
  //
  // `generated/` is not committed, so this scope matches nothing until the script runs.
  // -------------------------------------------------------------------------
  {
    extends: tsBaseScripts,
    files: ['scripts/examples/generated/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser },
      parserOptions: {
        project: ['./scripts/examples/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      // The harness wraps a snippet in an `async` function so it can host an awaited call
      // site; whether that wrapper awaits is not the example's business.
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      eqeqeq: 'error',
      'no-console': 'off',
    },
  },

  // -------------------------------------------------------------------------
  // Scope 4 — Tests (overlays scopes 1 & 2)
  // -------------------------------------------------------------------------
  {
    files: ['**/*.ct.tsx', '**/*.test.ts', '**/*.story.tsx'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // -------------------------------------------------------------------------
  // Prettier — disable ESLint rules that conflict with Prettier formatting.
  // Formatting itself is enforced separately via `prettier --check` (see the
  // `format:check` / `check` scripts), not as an ESLint rule.
  // -------------------------------------------------------------------------
  prettier,

  // -------------------------------------------------------------------------
  // oxlint — turn off ESLint rules already covered by oxlint (runs first).
  // -------------------------------------------------------------------------
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json')
);
