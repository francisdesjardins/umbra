import { expect, test } from '@playwright/test';
// Reaching into the library's own test helpers, deliberately and by relative path: this file is the
// only place that has to compare *both* sides — the library's exports and the playground's table of
// contents — and the unit project runs raw TypeScript through Playwright with none of the `umbra`
// aliases the playground's Vite config provides. A second copy of the export parser is the
// alternative, and a parser that drifts would make this gate pass while it stopped seeing anything.
import { collectExports } from '../../../src/__tests__/collect-exports.js';
import { CATEGORIES } from '../../vite-plugins/api-model.ts';

/**
 * Every root export has a page in the generated API reference.
 *
 * `buildModel` already refuses to build a model with an uncategorised export in it — an export
 * belonging to no page is an export nobody can find. The problem is *when* it refuses: the model is
 * generated at serve time and at build time, so an orphan is invisible to `type-check`, `lint`,
 * `docs:check`, `verify:package` and the whole test suite, and shows up as `/api` answering 500 in a
 * browser or a deploy failing.
 *
 * That is not a theoretical ordering. It has happened: `isOwnEventTarget` was exported from the root
 * and left out of `CATEGORIES`, every gate stayed green, and the reference route was broken until
 * someone opened it. This is the cheap half of that check — names against names, no typedoc, no
 * browser — so the failure arrives in the suite instead of in a deploy log.
 *
 * Scoped to the root's own categories, because a bare name is not an identity here: `HotkeyDef` is
 * documented under `umbra` *and* under `umbra/react`, which is correct and must not read as a
 * duplicate. The bindings' exports are not checked — they re-export the root wholesale, so the same
 * comparison would report every core symbol as missing from three more chapters.
 */

const CORE_SPECIFIER = 'umbra';

const rootExports = collectExports('index.ts');

const coreCategorySymbols = CATEGORIES.filter((category) => {
  return category.specifier === CORE_SPECIFIER;
}).flatMap((category) => {
  return category.symbols.map((name) => {
    return { name, category: category.id };
  });
});

test.describe('the API reference covers the root', () => {
  test('every export the root publishes belongs to a category', () => {
    // Guards the guard: a parser that stopped matching would make the assertion below pass with an
    // empty list, which is exactly the silent failure this file exists to prevent.
    expect(rootExports.length).toBeGreaterThan(30);

    const categorised = new Set(
      coreCategorySymbols.map((entry) => {
        return entry.name;
      })
    );
    const orphans = rootExports.filter((name) => {
      return !categorised.has(name);
    });

    expect(
      orphans,
      `Add these to a CORE category in playground/vite-plugins/api-model.ts, or /api will answer 500: ${orphans.join(', ')}`
    ).toEqual([]);
  });

  test('no export is listed under two of the root categories', () => {
    // The reference renders a chapter per category, so a name in two of them appears twice with one
    // declaration behind it — and the reader cannot tell which page is the one to link to.
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { name, category } of coreCategorySymbols) {
      const first = seen.get(name);
      if (first === undefined) {
        seen.set(name, category);
      } else {
        duplicates.push(`${name} (${first} and ${category})`);
      }
    }

    expect(duplicates).toEqual([]);
  });

  test('no category lists a name the root does not export', () => {
    // The other direction, and it fails differently: typedoc finds no declaration, so the symbol is
    // dropped from the page rather than reported — a renamed export leaves a hole nobody sees.
    const published = new Set(rootExports);
    const stale = coreCategorySymbols
      .filter((entry) => {
        return !published.has(entry.name);
      })
      .map((entry) => {
        return `${entry.name} (${entry.category})`;
      });

    expect(stale).toEqual([]);
  });
});
