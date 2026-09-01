import { expect, test } from '@playwright/test';
// By relative path: the unit project runs raw TypeScript with none of the playground's `umbra`
// aliases, and a second copy of the export parser would drift and leave this gate passing blindly.
import { collectExports } from '../../../src/__tests__/collect-exports.js';
import { CATEGORIES } from '../../vite-plugins/api-model.ts';

/**
 * Every root export has a page in the generated API reference. `buildModel` refuses an uncategorised
 * one only at serve/build time, so an orphan is invisible to `type-check`, `lint`, `docs:check`,
 * `verify:package` and the suite, surfacing as `/api` answering 500 — as `isOwnEventTarget` did.
 * **Every entry point, not just the root** — `buildModel` refuses an orphan under any specifier, and
 * scoping this to `umbra` let `ActionRunContext` reach a build. A bare name is not an identity
 * (`HotkeyDef` is documented under `umbra` *and* `umbra/react`), so each binding is checked against
 * its own categories; `collectExports` reads named re-exports only, so the wholesale `export *` of
 * the root does not come with it.
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
    // Guards the guard: a parser that stopped matching would pass the assertion below on an empty list.
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

  test('every export a binding publishes of its own belongs to a category', () => {
    const orphans = [
      ['react.ts', 'umbra/react'],
      ['solid.ts', 'umbra/solid'],
      ['vanilla.ts', 'umbra/vanilla'],
    ].flatMap(([entry, specifier]) => {
      // Minus the root's: a binding re-exports it wholesale and the model resolves those names
      // against the core's categories, which is why `HotkeyDef` needs no second home.
      const own = collectExports(entry ?? '').filter((name) => {
        return !rootExports.includes(name);
      });
      // Guards the guard, per binding: an empty list would pass the filter below silently.
      expect(own.length, `${String(entry)} parsed to nothing`).toBeGreaterThan(5);

      const categorised = new Set(
        CATEGORIES.filter((category) => {
          return category.specifier === specifier;
        }).flatMap((category) => {
          return category.symbols;
        })
      );
      return own
        .filter((name) => {
          return !categorised.has(name);
        })
        .map((name) => {
          return `${String(specifier)}#${name}`;
        });
    });

    expect(
      orphans,
      `Add these to their binding's category in playground/vite-plugins/api-model.ts, or the build fails: ${orphans.join(', ')}`
    ).toEqual([]);
  });

  test('no export is listed under two of the root categories', () => {
    // A chapter per category, so a name in two appears twice over one declaration, with no page to link.
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
    // Fails differently: typedoc drops a symbol it finds no declaration for rather than reporting it.
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
