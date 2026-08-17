import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectExports } from './collect-exports.js';

/**
 * The docs claim specific symbols come from specific entry points; this checks they do. `API.md` is
 * handwritten, so a rename leaves 1300 lines quietly wrong. Only *value* imports are checked —
 * type-only symbols leave no runtime trace — which catches the breaking direction: a React symbol
 * on the root does not resolve, while a core one under `./react` does — `./react` re-exports it.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SRC_ROOT, '..');

const DOCS = ['README.md', 'API.md'] as const;

/**
 * `import { a, type B } from '<specifier>';` — the type marker and the names, for **all four**
 * entry points: matching only the two most-used left every Solid and vanilla snippet unchecked,
 * which is how `bindAction` was documented as an export of `./vanilla` when it is a controller
 * member. An unknown specifier fails rather than skips, so a fifth binding cannot arrive unguarded.
 */
const IMPORT_PATTERN =
  /import(\s+type)?\s*\{([^}]*)\}\s*from\s*'(umbra(?:\/(?:react|solid|vanilla))?)';/g;

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
const solidExports = collectExports('solid.ts');
const vanillaExports = collectExports('vanilla.ts');

test.describe('documented imports', () => {
  test('every value symbol the docs import is exported by the stated entry point', () => {
    const documented = collectDocumentedImports();

    // Guards the guard: a regex that stopped matching would make this pass vacuously.
    expect(documented.length).toBeGreaterThan(10);

    const exportsBySpecifier: Record<string, readonly string[]> = {
      umbra: rootExports,
      'umbra/react': reactExports,
      'umbra/solid': solidExports,
      'umbra/vanilla': vanillaExports,
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

  test('every binding re-exports the whole root', () => {
    // All three, not just the busiest: every root snippet in API.md must work from each binding.
    const missingFromBinding = Object.entries({
      'umbra/react': reactExports,
      'umbra/solid': solidExports,
      'umbra/vanilla': vanillaExports,
    }).flatMap(([specifier, names]) => {
      return rootExports
        .filter((name) => {
          return !names.includes(name);
        })
        .map((name) => {
          return `${specifier} is missing '${name}'`;
        });
    });
    expect(missingFromBinding).toEqual([]);
  });

  test('the root exports no React bindings', () => {
    // entry-isolation proves the root does not *import* React; this proves no hook leaked onto it.
    const hookLike = rootExports.filter((name) => {
      return /^use[A-Z]/.test(name);
    });
    expect(hookLike).toEqual([]);
  });
});
