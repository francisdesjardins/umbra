import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Empty `.nyc_output/` once, before any worker writes into it. Failure mode: the report merges
 * every file it finds, so a targeted run (`--grep`, one spec) writes three and silently sums the
 * eighteen a full run left behind — plausible numbers for a coverage nobody just measured.
 *
 * A `globalSetup` rather than a `rimraf` in the yarn script, because the invocation that gets this
 * wrong is the ad-hoc `CT_COVERAGE=1 playwright test --grep …`; not the fixture's job, since
 * parallel workers are separate processes and each would delete the others' output mid-run. Gated
 * on the same flag as the instrumentation, so a run with coverage off deletes nothing.
 */
export default function resetCtCoverage() {
  if (process.env['CT_COVERAGE'] !== '1') {
    return;
  }
  rmSync(resolve(import.meta.dirname, '..', '.nyc_output'), { recursive: true, force: true });
}
