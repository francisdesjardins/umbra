import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Empty `.nyc_output/` once, before any worker starts writing into it.
 *
 * The fixture writes one file per test as `ct-<worker>-<n>.json`, and `ct-coverage-report.mjs`
 * merges everything it finds — so counters outlive the run that produced them. A full run leaves
 * 21 files; a targeted one (`--grep`, a single spec) writes three and the report happily sums the
 * eighteen still lying there, reporting a coverage nobody just measured. The failure is silent in
 * the way that matters: the numbers are plausible, and the header even prints the file count as
 * "N tests", so the wrong total is on screen looking ordinary. c8 cannot do this to the unit
 * project — it owns its temp directory and clears it per run.
 *
 * A `globalSetup` rather than a `rimraf` in front of the yarn script, because the invocation that
 * gets this wrong is the ad-hoc one: `CT_COVERAGE=1 playwright test --grep …` while chasing a
 * single file's number. This runs once in the main process for any of them — and it must not be
 * the fixture's job, since parallel workers are separate processes and each would delete the
 * others' output mid-run.
 *
 * Gated on the same flag as the instrumentation: with coverage off there is nothing being
 * written, and a test run has no business deleting a report someone is still reading.
 */
export default function resetCtCoverage() {
  if (process.env['CT_COVERAGE'] !== '1') {
    return;
  }
  rmSync(resolve(import.meta.dirname, '..', '.nyc_output'), { recursive: true, force: true });
}
