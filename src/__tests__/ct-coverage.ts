import { test as base } from '@playwright/experimental-ct-react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The CT `test`, with coverage attached. A CT subject runs in the browser, so c8 has no Node
 * process: `scripts/vite-plugin-ct-coverage.mjs` instruments the source into the bundle, counters
 * land on `window.__coverage__` in that page, and this fixture reads them back before the page
 * closes, writing one file per test to `.nyc_output/` for the report step to merge. `auto: true`
 * applies it unasked — the price is every CT file importing `test` from here, which is also where a
 * `page`-level default would go. Inert without `CT_COVERAGE=1`, costing one `evaluate`. Counters
 * carry *source* line numbers, which that plugin exists to arrange: read its note before swapping
 * in `vite-plugin-istanbul` — right totals, wrong lines. `.nyc_output/` is emptied per run by
 * `scripts/ct-coverage-reset.mjs`, since a file outliving its run merges into the next report.
 */

declare global {
  var __coverage__: Record<string, unknown> | undefined;
}

const OUTPUT_DIR = resolve(import.meta.dirname, '../../.nyc_output');

let written = 0;

export const test = base.extend<{ coverage: void }>({
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

export { expect } from '@playwright/experimental-ct-react';
