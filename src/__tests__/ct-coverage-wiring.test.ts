import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every component test takes its `test` from the coverage fixture.
 *
 * The fixture in [ct-coverage.ts](ct-coverage.ts) is what reads `window.__coverage__` off the page
 * before it closes; a file importing `test` straight from `@playwright/experimental-ct-react` runs
 * perfectly, passes, and contributes **nothing** to the report. That is the worst shape a coverage
 * failure can take, because the number it produces is not low — it is wrong, and it is wrong in the
 * direction that reads as "this code is untested" for code that is, or as "covered" for code that is
 * not, depending on which files forgot.
 *
 * It has happened, and to the files that mattered most: five of sixteen were on the raw runner,
 * including the only tests of `raiseDialog`, `reclaimFocus` and the opening-focus decline — every one
 * of which sits on `.c8rc.json`'s exclude list too, so the component report was their only possible
 * measurement and it never saw them. The fixture's own doc names the cost ("every CT file has to
 * import `test` from here"); this is the part that enforces it.
 *
 * A lint rule could say the same thing. This is a test because the rule is about a *set of files*
 * rather than about a line, and because the assertion worth making is "the set is complete" — which
 * is why the count is asserted too: a glob that stopped matching would leave this passing over
 * nothing at all.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every `*.ct.tsx` under `src/`, found by walking rather than by a hand-kept list. */
function findComponentTests(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...findComponentTests(path));
    } else if (entry.name.endsWith('.ct.tsx')) {
      found.push(path);
    }
  }
  return found;
}

const componentTests = findComponentTests(SRC_ROOT);

test.describe('CT coverage wiring', () => {
  test('there are component tests to check', () => {
    expect(componentTests.length).toBeGreaterThan(10);
  });

  test('none of them import test from the runner directly', () => {
    const unwired = componentTests
      .filter((path) => {
        return /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*'@playwright\/experimental-ct-react'/.test(
          readFileSync(path, 'utf8')
        );
      })
      .map((path) => {
        return relative(SRC_ROOT, path);
      });

    expect(
      unwired,
      `These import \`test\` from the runner, so their coverage is silently discarded. Import { expect, test } from the ct-coverage fixture instead: ${unwired.join(', ')}`
    ).toEqual([]);
  });

  test('each one reaches the fixture', () => {
    // The positive half. The check above only rejects one spelling of the mistake; this one is what
    // fails if the fixture is renamed or moved and the imports are left pointing nowhere — a state
    // `type-check` would catch, but only for files it still compiles.
    const missing = componentTests
      .filter((path) => {
        return !readFileSync(path, 'utf8').includes("__tests__/ct-coverage.js'");
      })
      .map((path) => {
        return relative(SRC_ROOT, path);
      });

    expect(missing).toEqual([]);
  });
});
