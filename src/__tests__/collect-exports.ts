import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The names an entry point publishes, read out of its source.
 *
 * Shared rather than local to one test, because two gates need the same list and a second copy of
 * this parser is a second copy that drifts: `docs-exports.test.ts` checks that every symbol the
 * docs import really is exported, and the playground's `api-categories.test.ts` checks that every
 * export has a page in the generated reference. A name that stops being parsed here would make
 * *both* pass vacuously, which is the reason the callers assert a floor on the count.
 *
 * **Static rather than `import * as ns`**, and the reason is the whole design of this package: the
 * unit project runs in plain Node, so importing `src/react.ts` would pull `.tsx` modules it cannot
 * transform — and parsing means the check also works with React uninstalled, which is the state the
 * root is supposed to support. It is also the only way to see **type-only** exports, which leave no
 * runtime trace and are most of what the API reference documents.
 *
 * Only the three forms the entry files actually use are handled — `export { … } from`,
 * `export type { … } from`, and `export * from`. An unhandled form shows up as a missing symbol,
 * which is a loud failure rather than a silent pass.
 *
 * @param entryFile A path relative to `src/`, e.g. `'index.ts'` or `'react.ts'`.
 */
export function collectExports(entryFile: string): string[] {
  const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const source = readFileSync(resolve(srcRoot, entryFile), 'utf8');
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
      // Entry points write `./index.js` (see the comment in react.ts); map the ESM specifier back
      // to the source file.
      const file = target.replace(/^\.\//, '').replace(/\.js$/, '');
      names.push(...collectExports(`${file}.ts`));
    }
    starMatch = star.exec(source);
  }

  return names;
}
