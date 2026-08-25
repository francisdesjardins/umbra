#!/usr/bin/env node
// ── The JSDoc examples are code, so they are held to the code gates ──────────
// Extracts every `@example` under `src/` (`@internal` modules included, not just the entry points),
// writes each as a module under `scripts/examples/generated/`, and runs prettier, `tsc` and oxlint
// over them — nothing else looks inside a comment, and two examples here were wrong when written.
// The type pass runs twice: the first reports the free identifiers an example assumes (`store`,
// `api`), the second declares them `any`, so what remains is misuse of *this library*.
//
// Usage:
//   node scripts/check-examples.mjs          # check (exit 1 on any failure)
//   node scripts/check-examples.mjs --fix    # rewrite examples through prettier, then check
//   node scripts/check-examples.mjs --keep   # leave the generated modules for inspection

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const EXAMPLES_DIR = join(ROOT, 'scripts', 'examples');
const GENERATED = join(EXAMPLES_DIR, 'generated');

const FIX = process.argv.includes('--fix');
const KEEP = process.argv.includes('--keep');

// ── Collection ───────────────────────────────────────────────────────────────

/** Every `.ts`/`.tsx` under `src/`, tests included — a story's examples are docs too. */
function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const DOC_START = /^\s*\/\*\*/;
const DOC_END = /\*\//;
const EXAMPLE_TAG = /^(\s*)\*\s*@example\s*(.*)$/;
const BLOCK_TAG = /^\s*\*\s*@\w+/;
const FENCE = /^\s*```/;
/** The declaration a doc block is attached to — used to name the generated module. */
const DECLARATION =
  /^\s*export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|type|class)\s+([A-Za-z_$][\w$]*)/;

/**
 * Pull the `@example` blocks out of one file. Line-based, because the rewrite puts formatted code
 * back between the exact lines it came from, ` * ` prefix and indentation intact.
 */
function collectFromFile(path) {
  // `\r?\n`: a stray `\r` would ride into the code and break the parse and the comparison.
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const found = [];

  for (let i = 0; i < lines.length; i++) {
    if (!DOC_START.test(lines[i]) || DOC_END.test(lines[i])) {
      continue;
    }

    let end = i;
    while (end < lines.length && !DOC_END.test(lines[end])) {
      end++;
    }

    const declaration = lines.slice(end + 1, end + 4).find((line) => {
      return DECLARATION.test(line);
    });
    const symbol = declaration ? (DECLARATION.exec(declaration)?.[1] ?? 'anonymous') : 'anonymous';

    for (let j = i; j < end; j++) {
      const tag = EXAMPLE_TAG.exec(lines[j]);
      if (!tag) {
        continue;
      }
      const indent = tag[1];
      let last = j + 1;
      while (last < end && !BLOCK_TAG.test(lines[last])) {
        last++;
      }

      const body = lines.slice(j + 1, last).map((line) => {
        // Strip the comment gutter, keeping the code's own indentation.
        return line.replace(/^\s*\*( |$)/, '');
      });
      while (body.length > 0 && body.at(-1).trim() === '') {
        body.pop();
      }

      const fenced = body.length > 0 && FENCE.test(body[0]);
      const code = (fenced ? body.slice(1, FENCE.test(body.at(-1) ?? '') ? -1 : undefined) : body)
        .join('\n')
        .trimEnd();

      found.push({
        file: path,
        // 1-based, and pointing at the `@example` line the reader would open.
        line: j + 1,
        symbol,
        caption: tag[2].trim(),
        indent,
        fence: fenced ? body[0].trim() : null,
        start: j + 1,
        end: last,
        code,
      });
      j = last - 1;
    }

    i = end;
  }

  return found;
}

function collectExamples() {
  return sourceFiles(SRC).flatMap((path) => {
    return collectFromFile(path);
  });
}

// ── Format ───────────────────────────────────────────────────────────────────

/**
 * Format one example with the repo's prettier config. `null` when prettier cannot parse it, which
 * is not a failure: a few are deliberately elliptical (`useDialog({ ... })`) or show sibling JSX
 * call sites, and the normalisation below type-checks them anyway.
 */
async function formatExample(example, options) {
  try {
    const formatted = await prettier.format(example.code, { ...options, parser: 'typescript' });
    return formatted.trimEnd();
  } catch {
    return null;
  }
}

/** Splice formatted examples back into their doc comments, bottom-up so line numbers hold. */
function rewrite(examples) {
  const byFile = new Map();
  for (const example of examples) {
    if (example.formatted === null || example.formatted === example.code) {
      continue;
    }
    const list = byFile.get(example.file) ?? [];
    list.push(example);
    byFile.set(example.file, list);
  }

  for (const [file, list] of byFile) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (const example of list.sort((a, b) => {
      return b.start - a.start;
    })) {
      const gutter = `${example.indent}*`;
      const body = [
        ...(example.fence ? [example.fence] : []),
        ...example.formatted.split('\n'),
        ...(example.fence ? ['```'] : []),
      ].map((line) => {
        return line === '' ? gutter : `${gutter} ${line}`;
      });
      lines.splice(example.start, example.end - example.start, ...body);
    }
    writeFileSync(file, lines.join('\n'));
  }

  return byFile;
}

// ── Generated modules ────────────────────────────────────────────────────────

/** An ellipsis standing in for options the example is not about. */
const ELLIPSIS = /\{\s*\.\.\.\s*\}/g;
/** Sibling JSX call sites shown one per line; without a parent they parse as one expression. */
const BARE_JSX = /^(<[A-Za-z][^\n]*(?:<\/[A-Za-z][\w.]*>|\/>))[ \t]*$/gm;

function normalise(code) {
  return code.replace(ELLIPSIS, '{} as never').replace(BARE_JSX, 'void ($1);');
}

function moduleName(example, index) {
  const file = relative(SRC, example.file)
    .replace(/\W+/g, '-')
    .replace(/-tsx?$/, '');
  return `${file}--${example.symbol}-${index}`;
}

function buildModule(example, from) {
  const { exportsBySpecifier, stubs } = from;
  const specifier = specifierFor(example.file);
  const exported = exportsBySpecifier.get(specifier) ?? new Map();
  const code = normalise(example.code);
  const used = (kind) => {
    return [...exported]
      .filter(([, symbolKind]) => {
        return kind === 'type' ? symbolKind === 'type' : symbolKind !== 'type';
      })
      .map(([name]) => {
        return name;
      })
      .filter((name) => {
        return new RegExp(`\\b${name}\\b`).test(code);
      });
  };

  // An example that writes its own import is showing the import; do not add a second one.
  const selfImporting = /from 'umbra/.test(code);
  const values = selfImporting ? [] : used('value');
  const types = selfImporting ? [] : used('type');
  // Hooks and JSX only make sense inside a component; `await` only inside an async function.
  const component = /\buse[A-Z]/.test(code) || /<[A-Za-z]/.test(code);
  const topLevelAwait = !component && /\bawait\b/.test(code);
  const name = example.symbol.replace(/\W/g, '');

  const header = [
    `// ${relative(ROOT, example.file).replaceAll('\\', '/')}:${String(example.line)} — @example on \`${example.symbol}\``,
    values.length > 0 ? `import { ${values.join(', ')} } from '${specifier}';` : '',
    types.length > 0 ? `import type { ${types.join(', ')} } from '${specifier}';` : '',
    'export {};',
    ...stubs.map((stub) => {
      return `declare const ${stub}: any;`;
    }),
  ].filter(Boolean);

  // `async` too: some examples show a component *and* the awaited call driving it.
  const body = component
    ? `export async function Example_${name}() {\n${code}\n  return null;\n}`
    : topLevelAwait
      ? `export async function example_${name}() {\n${code}\n}`
      : code;

  return `${header.join('\n')}\n\n${body}\n`;
}

/**
 * Which entry point an example's file belongs to. The bindings export the same names, so a
 * `src/solid/` example handed `useLookup` from `umbra/react` fails as if it, not this, were wrong.
 */
function specifierFor(file) {
  const path = relative(SRC, file).replaceAll('\\', '/');
  for (const binding of ['solid', 'vanilla']) {
    if (path === `${binding}.ts` || path.startsWith(`${binding}/`)) {
      return `umbra/${binding}`;
    }
  }
  return 'umbra/react';
}

/** Every public export of one entry point (plus the root it re-exports), by specifier. */
function publicExports(binding) {
  const exported = new Map();
  for (const entry of ['index.ts', binding]) {
    const source = readFileSync(join(SRC, entry), 'utf8');
    for (const match of source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)) {
      for (const name of match[2].split(',')) {
        const clean = name
          .trim()
          .split(/\s+as\s+/)
          .at(-1)
          ?.trim();
        if (clean && /^[A-Za-z_$][\w$]*$/.test(clean)) {
          exported.set(clean, match[1] ? 'type' : 'value');
        }
      }
    }
  }
  return exported;
}

function writeModules(examples, from) {
  const { exported, stubsByModule } = from;
  rmSync(GENERATED, { recursive: true, force: true });
  mkdirSync(GENERATED, { recursive: true });
  for (const example of examples) {
    writeFileSync(
      join(GENERATED, `${example.module}.tsx`),
      buildModule(example, {
        exportsBySpecifier: exported,
        stubs: stubsByModule[example.module] ?? [],
      })
    );
  }
}

// ── Gates ────────────────────────────────────────────────────────────────────

function run(command, args) {
  try {
    execFileSync(command, args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    return '';
  } catch (error) {
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

/**
 * Every published specifier must be mapped to source in the examples tsconfig. An unmapped one does
 * not fail — it falls through the workspace self-link into `dist/`, so the example checks against
 * whatever was last built and reports TS2307 where nothing was, invisible until CI disagrees.
 */
function assertSpecifiersMapped() {
  const { exports: published } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  // JSONC: the config is commented, and `tsc` reads it happily — strip before `JSON.parse`.
  const config = readFileSync(join(EXAMPLES_DIR, 'tsconfig.json'), 'utf8').replace(
    /^\s*\/\/.*$/gm,
    ''
  );
  const mapped = new Set(Object.keys(JSON.parse(config).compilerOptions.paths ?? {}));

  const missing = Object.keys(published)
    .map((subpath) => {
      return subpath === '.' ? 'umbra' : `umbra${subpath.slice(1)}`;
    })
    .filter((specifier) => {
      return !mapped.has(specifier);
    });

  if (missing.length > 0) {
    console.error(
      `\n${String(missing.length)} published specifier(s) are not mapped in ` +
        `scripts/examples/tsconfig.json: ${missing.join(', ')}.\n` +
        `Add each to "paths" pointing at its source entry, or an @example importing one ` +
        `resolves through dist/ and this check stops meaning anything.`
    );
    process.exit(1);
  }
}

function typeCheck() {
  return run(process.execPath, [
    join(ROOT, 'node_modules', 'typescript-7', 'bin', 'tsc'),
    '-p',
    join(EXAMPLES_DIR, 'tsconfig.json'),
  ]);
}

/**
 * Lint the generated modules as structured results. `--type-aware` is not a copied flag: the rules
 * this scope keeps — `no-floating-promises`, `await-thenable` — are type-aware, so without it the
 * pass silently reports the syntax half only.
 */
function lint() {
  const output = run(join(ROOT, 'node_modules', '.bin', 'oxlint'), [
    relative(ROOT, GENERATED).replaceAll('\\', '/'),
    '--type-aware',
    '-f',
    'json',
  ]);
  const start = output.indexOf('{');
  if (start === -1) {
    return [];
  }
  const { diagnostics = [], number_of_files: linted } = JSON.parse(output.slice(start));
  // Its one silent failure, and it happened: oxlint reports zero files and exits clean for a
  // git-ignored path, indistinguishable from a clean lint — so count, do not trust.
  if (linted === 0) {
    console.error(
      `check-examples: oxlint linted 0 files under ${relative(ROOT, GENERATED)} — the lint gate is not running.\n` +
        'Most likely the directory has become ignored again (oxlint honours .gitignore unconditionally).'
    );
    process.exit(1);
  }
  return diagnostics.map((diagnostic) => {
    const line = diagnostic.labels?.[0]?.span?.line;
    return {
      module: /generated[/\\]([^(:]+)\.tsx/.exec(diagnostic.filename ?? '')?.[1],
      text: `${diagnostic.code ?? 'parse error'}: ${diagnostic.message}${
        line === undefined ? '' : ` (line ${String(line)})`
      }`,
    };
  });
}

/** `Cannot find name 'x'` — the application the snippet assumes, not a mistake in it. */
const UNKNOWN_NAME =
  /generated[/\\]([^(]+)\.tsx\(\d+,\d+\): error TS(?:2304|2552): Cannot find name '([^']+)'/;

function collectStubs(output) {
  const stubs = {};
  for (const line of output.split('\n')) {
    const match = UNKNOWN_NAME.exec(line);
    if (match) {
      stubs[match[1]] = [...new Set([...(stubs[match[1]] ?? []), match[2]])];
    }
  }
  return stubs;
}

/** Map a generated-module diagnostic back to the doc comment it came from. */
function where(module, byModule) {
  const example = module === undefined ? undefined : byModule.get(module);
  return example
    ? `${relative(ROOT, example.file).replaceAll('\\', '/')}:${String(example.line)} (@example on ${example.symbol})`
    : 'unknown';
}

/** Inference through an `any` stub: `watch(store, { select })` leaves the snapshot `unknown`. */
const STUB_INFERENCE = /error TS18046/;

function attributeTypes(output, byModule) {
  return output
    .split('\n')
    .filter((line) => {
      return line.includes('generated') && !STUB_INFERENCE.test(line);
    })
    .map((line) => {
      const module = /generated[/\\]([^(:]+)\.tsx/.exec(line)?.[1];
      return `  ${where(module, byModule)}\n    ${line.trim().replace(/^.*\.tsx/, '')}`;
    });
}

function attributeLint(messages, byModule) {
  return messages.map((message) => {
    return `  ${where(message.module, byModule)}\n    ${message.text}`;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

const examples = collectExamples();
const exported = new Map([
  ['umbra/react', publicExports('react.ts')],
  ['umbra/solid', publicExports('solid.ts')],
  ['umbra/vanilla', publicExports('vanilla.ts')],
]);
examples.forEach((example, index) => {
  example.module = moduleName(example, index);
});
const byModule = new Map(
  examples.map((example) => {
    return [example.module, example];
  })
);

const prettierOptions = (await prettier.resolveConfig(join(SRC, 'index.ts'))) ?? {};
for (const example of examples) {
  example.formatted = await formatExample(example, prettierOptions);
}

const unformatted = examples.filter((example) => {
  return example.formatted !== null && example.formatted !== example.code;
});
const unparsable = examples.filter((example) => {
  return example.formatted === null;
});

let rewritten = new Map();
if (FIX) {
  rewritten = rewrite(examples);
  for (const example of examples) {
    if (example.formatted !== null) {
      example.code = example.formatted;
    }
  }
}

// Before the first `tsc`, so a forgotten mapping reports once rather than as N TS2307s.
assertSpecifiersMapped();

writeModules(examples, { exported, stubsByModule: {} });
const stubs = collectStubs(typeCheck());
writeModules(examples, { exported, stubsByModule: stubs });

const typeErrors = attributeTypes(typeCheck(), byModule);
const lintErrors = attributeLint(lint(), byModule);

if (!KEEP) {
  rmSync(GENERATED, { recursive: true, force: true });
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log(
  `examples: ${String(examples.length)} from ${String(new Set(examples.map((e) => e.file)).size)} files`
);

if (FIX && rewritten.size > 0) {
  console.log(
    `formatted: ${String([...rewritten.values()].flat().length)} example(s) rewritten in:`
  );
  for (const file of rewritten.keys()) {
    console.log(`  ${relative(ROOT, file).replaceAll('\\', '/')}`);
  }
}

if (unparsable.length > 0) {
  console.log(
    `not formattable (illustrative snippets, still type-checked): ${String(unparsable.length)}`
  );
  for (const example of unparsable) {
    console.log(
      `  ${relative(ROOT, example.file).replaceAll('\\', '/')}:${String(example.line)} — ${example.symbol}`
    );
  }
}

const problems = [];
if (!FIX && unformatted.length > 0) {
  problems.push(
    `${String(unformatted.length)} example(s) are not formatted — run \`yarn docs:examples:fix\`:`
  );
  for (const example of unformatted) {
    problems.push(
      `  ${relative(ROOT, example.file).replaceAll('\\', '/')}:${String(example.line)} — ${example.symbol}`
    );
  }
}
if (typeErrors.length > 0) {
  problems.push(`${String(typeErrors.length)} type error(s):`, ...typeErrors);
}
if (lintErrors.length > 0) {
  problems.push(`lint:`, ...lintErrors);
}

if (problems.length > 0) {
  console.error(`\n${problems.join('\n')}`);
  process.exit(1);
}

console.log('format, types and lint: clean');
