import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectExports } from './collect-exports.js';

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
 * `import { a, type B } from '<specifier>';` — captures the type-only marker and the names.
 *
 * **All four entry points**, and the alternation is not padding: matching only the two most-used
 * ones left every `umbra/solid` and `umbra/vanilla` snippet checked by nothing, which is how
 * `bindAction` came to be documented as an export of `./vanilla` when it is a member of the
 * controller. An unknown specifier is a failure rather than a skip, so a fifth binding cannot
 * arrive with its snippets silently unguarded.
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
    // The docs tell each binding's consumers they can use one import path for everything. That
    // promise is what lets every root-specifier snippet in API.md also be valid from './react',
    // './solid' and './vanilla' — so it is asserted for all three rather than for the one whose
    // snippets happen to outnumber the others.
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
    // Complements entry-isolation.test.ts: that one proves the root does not *import* React,
    // this one proves no hook leaked onto it, which would be a resolvable-but-wrong export.
    const hookLike = rootExports.filter((name) => {
      return /^use[A-Z]/.test(name);
    });
    expect(hookLike).toEqual([]);
  });
});
