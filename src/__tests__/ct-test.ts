import { expect, test as base } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The CT `test`, carrying two automatic fixtures: coverage, and a guard on uncaught page errors.
 * `auto: true` applies both unasked — the price is every CT file importing `test` from here, which
 * `ct-test-wiring.test.ts` holds.
 */

declare global {
  var __coverage__: Record<string, unknown> | undefined;
}

const OUTPUT_DIR = resolve(import.meta.dirname, '../../.nyc_output');

let written = 0;

export const test = base.extend<{ coverage: void; uncaught: void }>({
  /**
   * An exception nothing in the page catches fails the test that provoked it. A spec asserts what it
   * looks at, so one thrown *after* the work it measures is done leaves every assertion green — and
   * `pageerror` carries an unhandled rejection as well, on all three engines. No opt-out: a test
   * that wants an exception catches it in the page and asserts on what it caught.
   */
  uncaught: [
    async ({ page }, use) => {
      const thrown: string[] = [];
      page.on('pageerror', (error) => {
        // The stack, so a red in CI names the file rather than only the sentence.
        thrown.push(error.stack ?? error.message);
      });

      await use();

      expect(
        thrown,
        'The page threw, and nothing in it caught this — see src/__tests__/ct-test.ts'
      ).toEqual([]);
    },
    { auto: true },
  ],
  /**
   * A CT subject runs in the browser, so c8 has no Node process:
   * `scripts/vite-plugin-ct-coverage.mjs` instruments the source into the bundle, counters land on
   * `window.__coverage__` in that page, and this reads them back before the page closes, writing one
   * file per test to `.nyc_output/` for the report step to merge. Inert without `CT_COVERAGE=1`.
   * Counters carry *source* line numbers, which that plugin exists to arrange: read its note before
   * swapping in `vite-plugin-istanbul` — right totals, wrong lines. `.nyc_output/` is emptied per
   * run by `scripts/ct-coverage-reset.mjs`, since a file outliving its run merges into the next
   * report.
   */
  coverage: [
    // Playwright's fixture signature, not ours — the three parameters are the shape `extend` calls.
    // oxlint-disable-next-line max-params
    async ({ page }, use, testInfo) => {
      await use();

      // The page is still alive during fixture teardown — why this is a fixture, not an afterEach.
      const data = await page.evaluate(() => {
        return globalThis.__coverage__;
      });
      if (!data) {
        return;
      }

      mkdirSync(OUTPUT_DIR, { recursive: true });
      written += 1;
      // Unique per test *and* worker: workers are separate processes, so equal indexes collide.
      const name = `ct-${String(testInfo.workerIndex)}-${String(written)}.json`;
      writeFileSync(resolve(OUTPUT_DIR, name), JSON.stringify(data), 'utf8');
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
