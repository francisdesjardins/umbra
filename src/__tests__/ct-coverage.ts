import { test as base } from '@playwright/experimental-ct-react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The CT `test`, with coverage collection attached.
 *
 * A component test's subject runs in the browser, so there is no Node process for c8 to measure.
 * `vite-plugin-istanbul` instruments the source on the way into the bundle instead, and every
 * counter it increments lands on `window.__coverage__` **in that test's page**, which is thrown
 * away when the page closes. So it has to be read back before then: this fixture runs after the
 * test body and writes what it finds to `.nyc_output/`, one file per test, for a report step to
 * merge.
 *
 * `auto: true` is what makes it apply without a test asking for it — the price is that every CT
 * file has to import `test` from here rather than from the runner, which is also the only place
 * a future `page`-level default would go.
 *
 * Inert unless `CT_COVERAGE=1` put the instrumentation there in the first place: with no
 * `__coverage__` on the page there is nothing to write, and the fixture costs one `evaluate`.
 *
 * **Known defect, and it decides what these numbers are good for.** The counters are attributed to
 * the wrong lines — see the note in `scripts/ct-coverage-report.mjs`. Totals and comparisons
 * between files are sound; "which line is uncovered" is not, and reading one will send you to a
 * comment.
 */

declare global {
  /** Written by the instrumented bundle; absent when instrumentation is off. */
  var __coverage__: Record<string, unknown> | undefined;
}

const OUTPUT_DIR = resolve(import.meta.dirname, '../../.nyc_output');

let written = 0;

export const test = base.extend<{ coverage: void }>({
  coverage: [
    async ({ page }, use, testInfo) => {
      await use();

      // The page is still alive during fixture teardown, which is the whole reason this is a
      // fixture rather than an afterEach in each file.
      const data = await page.evaluate(() => {
        return globalThis.__coverage__;
      });
      if (!data) {
        return;
      }

      mkdirSync(OUTPUT_DIR, { recursive: true });
      written += 1;
      // Unique per test *and* per worker: parallel workers are separate processes, and two of
      // them finishing a test at the same index would otherwise write the same file.
      const name = `ct-${String(testInfo.workerIndex)}-${String(written)}.json`;
      writeFileSync(resolve(OUTPUT_DIR, name), JSON.stringify(data), 'utf8');
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/experimental-ct-react';
