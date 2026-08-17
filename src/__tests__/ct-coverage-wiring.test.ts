import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every component test takes its `test` from the coverage fixture: [ct-coverage.ts](ct-coverage.ts)
 * reads `window.__coverage__` before the page closes, so a file importing `test` from
 * `@playwright/experimental-ct-react` passes while contributing **nothing** — a report wrong
 * rather than merely low. Five of sixteen once did, including the only tests of `raiseDialog`,
 * `reclaimFocus` and the opening-focus decline, all on `.c8rc.json`'s exclude list too, so the
 * component report was their only possible measurement. A test, not a lint rule, because the
 * claim is about a *set of files* being complete — hence the asserted count, since a glob that
 * stopped matching would pass over nothing.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
    // The positive half — the check above rejects one spelling; this fails if the fixture moves and
    // the imports point nowhere, which `type-check` catches only for files it still compiles.
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
