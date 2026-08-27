import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The names an entry point publishes, read out of its source. Shared because two gates need the
 * same list — `docs-exports.test.ts` (documented symbols are exported) and the playground's
 * `api-categories.test.ts` (every export has a reference page) — and a name that stopped parsing
 * would make both pass vacuously, hence the floor on the count. Static rather than `import * as
 * ns`: the unit project is plain Node, and only parsing works with React uninstalled or sees
 * **type-only** exports, which leave no runtime trace and are most of the API reference. Only
 * `export { … } from`, `export type { … } from` and `export * from` are handled.
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
      // Entry points write `./index.js` (see react.ts); map the ESM specifier back to the source.
      const file = target.replace(/^\.\//, '').replace(/\.js$/, '');
      names.push(...collectExports(`${file}.ts`));
    }
    starMatch = star.exec(source);
  }

  return names;
}
