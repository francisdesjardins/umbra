import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every component test takes its `test` from [ct-test.ts](ct-test.ts), and **two things go
 * quiet where one does not**: its counters are dropped, so the report is wrong rather than merely
 * low, and its page may throw with nothing watching. The tests of `raiseDialog`, `reclaimFocus` and
 * the opening-focus decline sit on `.c8rc.json`'s exclude list, so the component report is their
 * only possible measurement. A test, not a lint rule, because the claim is about a *set of files*
 * being complete — hence the counts, which are per root, since a glob that stopped matching would
 * pass over nothing and a harness is a harness wherever it ships.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOTS = [resolve(REPO_ROOT, 'src'), resolve(REPO_ROOT, 'playground', 'src')];

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

const componentTests = ROOTS.flatMap(findComponentTests);

test.describe('CT test wiring', () => {
  test('both roots have component tests to check', () => {
    // Per root, not just the total: the library's files clear the count alone, so a playground scan
    // that stopped matching would vanish in the sum.
    const empty = ROOTS.filter((root) => {
      return findComponentTests(root).length === 0;
    }).map((root) => {
      return relative(REPO_ROOT, root);
    });

    expect(empty).toEqual([]);
    expect(componentTests.length).toBeGreaterThan(10);
  });

  test('none of them import test from the runner directly', () => {
    const unwired = componentTests
      .filter((path) => {
        return /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*'@playwright\/test'/.test(
          readFileSync(path, 'utf8')
        );
      })
      .map((path) => {
        return relative(REPO_ROOT, path);
      });

    expect(
      unwired,
      `These import \`test\` from the runner, so their coverage is discarded and nothing watches their page for an uncaught error. Import { expect, test } from the ct-test fixture instead: ${unwired.join(', ')}`
    ).toEqual([]);
  });

  test('each one reaches the fixture', () => {
    // The positive half — the check above rejects one spelling; this fails if the fixture moves and
    // the imports point nowhere, which `type-check` catches only for files it still compiles.
    const missing = componentTests
      .filter((path) => {
        return !readFileSync(path, 'utf8').includes("__tests__/ct-test.js'");
      })
      .map((path) => {
        return relative(REPO_ROOT, path);
      });

    expect(missing).toEqual([]);
  });
});
