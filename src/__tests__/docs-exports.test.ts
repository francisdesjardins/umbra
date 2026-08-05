import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The docs claim specific symbols come from specific entry points. This checks that they do.
 *
 * `API.md` opens with "handwritten and must be kept in sync with the library source manually",
 * which is an accurate description of a file that will drift. Renaming an export updates every
 * call site and every test, and leaves 1300 lines of documentation quietly wrong — and a wrong
 * import line in a README is the first thing a new consumer copies.
 *
 * Scope and its limits: only *value* imports are checked, because type-only symbols leave no
 * runtime trace to assert against. The asymmetry works in our favour on the case that actually
 * breaks people — `./react` re-exports the root, so a core symbol documented under `./react`
 * still resolves, while a React symbol wrongly documented on the root does not resolve at all,
 * and that is the direction this catches.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SRC_ROOT, '..');

const DOCS = ['README.md', 'API.md'] as const;

/**
 * Names an entry point re-exports, read statically.
 *
 * Static rather than `import * as ns`: the unit project runs in plain Node, and importing
 * `src/react.ts` pulls `.tsx` modules it cannot transform. Parsing also means this works with
 * React uninstalled, which is the state the root is supposed to support.
 *
 * Only the forms the two entry files actually use are handled — `export { … } from`,
 * `export type { … } from`, and `export * from` — and an unhandled form would show up as a
 * missing symbol, i.e. a loud failure rather than a silent pass.
 */
const collectExports = (entryFile: string): string[] => {
  const source = readFileSync(resolve(SRC_ROOT, entryFile), 'utf8');
  const names: string[] = [];

  const named = /export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'[^']+';/g;
  let match = named.exec(source);
  while (match !== null) {
    for (const raw of (match[1] ?? '').split(',')) {
      // `export { A as B }` publishes B.
      const name = raw
        .trim()
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim();
      if (name !== undefined && name !== '') {
        names.push(name);
      }
    }
    match = named.exec(source);
  }

  const star = /export\s+\*\s+from\s*'([^']+)';/g;
  let starMatch = star.exec(source);
  while (starMatch !== null) {
    const target = starMatch[1] ?? '';
    if (target.startsWith('.')) {
      // Entry points write `./index.js` (see the comment in react.ts); map the ESM
      // specifier back to the source file.
      const file = target.replace(/^\.\//, '').replace(/\.js$/, '');
      names.push(...collectExports(`${file}.ts`));
    }
    starMatch = star.exec(source);
  }

  return names;
};

/** `import { a, type B } from '<specifier>';` — captures the type-only marker and the names. */
const IMPORT_PATTERN = /import(\s+type)?\s*\{([^}]*)\}\s*from\s*'(umbra(?:\/react)?)';/g;

type DocumentedImport = {
  readonly doc: string;
  readonly line: number;
  readonly specifier: string;
  readonly valueNames: readonly string[];
};

const collectDocumentedImports = (): DocumentedImport[] => {
  const results: DocumentedImport[] = [];

  for (const doc of DOCS) {
    const text = readFileSync(resolve(REPO_ROOT, doc), 'utf8');

    let match = IMPORT_PATTERN.exec(text);
    while (match !== null) {
      const statementIsTypeOnly = match[1] !== undefined;
      const names = (match[2] ?? '')
        .split(',')
        .map((name) => {
          return name.trim();
        })
        .filter((name) => {
          return name !== '';
        });

      results.push({
        doc,
        line: text.slice(0, match.index).split('\n').length,
        specifier: match[3] ?? '',
        // Inline `type X` markers are erased too, so both forms are excluded.
        valueNames: statementIsTypeOnly
          ? []
          : names.filter((name) => {
              return !name.startsWith('type ');
            }),
      });
      match = IMPORT_PATTERN.exec(text);
    }
  }

  return results;
};

const rootExports = collectExports('index.ts');
const reactExports = collectExports('react.ts');

test.describe('documented imports', () => {
  test('every value symbol the docs import is exported by the stated entry point', () => {
    const documented = collectDocumentedImports();

    // Guards the guard: a regex that stopped matching would make this pass vacuously.
    expect(documented.length).toBeGreaterThan(10);

    const exportsBySpecifier: Record<string, readonly string[]> = {
      umbra: rootExports,
      'umbra/react': reactExports,
    };

    const missing: string[] = [];
    for (const entry of documented) {
      const available = exportsBySpecifier[entry.specifier];
      if (available === undefined) {
        missing.push(`${entry.doc}:${String(entry.line)} unknown specifier ${entry.specifier}`);
        continue;
      }
      for (const name of entry.valueNames) {
        if (!available.includes(name)) {
          missing.push(
            `${entry.doc}:${String(entry.line)} — '${name}' is not exported by '${entry.specifier}'`
          );
        }
      }
    }

    expect(missing).toEqual([]);
  });

  test('the React binding re-exports the whole root', () => {
    // The docs tell React consumers they can use one import path for everything. That promise
    // is what lets every root-specifier snippet in API.md also be valid from './react'.
    const missingFromBinding = rootExports.filter((name) => {
      return !reactExports.includes(name);
    });
    expect(missingFromBinding).toEqual([]);
  });

  test('the root exports no React bindings', () => {
    // Complements root-react-free.test.ts: that one proves the root does not *import* React,
    // this one proves no hook leaked onto it, which would be a resolvable-but-wrong export.
    const hookLike = rootExports.filter((name) => {
      return /^use[A-Z]/.test(name);
    });
    expect(hookLike).toEqual([]);
  });
});
