#!/usr/bin/env node
// ── One engine at a time, because three at once is what made the suite unreliable ────────────
//
// `playwright test --project=a --project=b --project=c` puts all three engines into **one** worker
// pool. Locally that pool is `cpus/2` workers wide, so Chromium, Firefox and WebKit pages are live
// in the same moment, and roughly every other full run failed — one test, a different one each
// time, always green when run alone.
//
// Measured before writing this, because the two obvious explanations were both wrong:
//
//   default (8 workers, interleaved)   2 of 3 runs red
//   --workers=4, interleaved           1 of 3 runs red, and 40% slower
//   the same tests, --repeat-each=20   180 of 180 green
//   one engine at a time               1 of 21 runs red, and no slower
//
// So it is not worker count and it is not the assertions — it is three engines sharing a pool.
// CI never saw it because CI runs one engine per job, which is what this reproduces locally.
//
// Retries stay at zero here. A retry would make the runs green without making them trustworthy,
// and the point of a local suite is that a red means something.
//
// **Spawned without a shell**, which is what makes forwarding safe rather than careful: Node's
// DEP0190 warns that `shell: true` concatenates arguments instead of escaping them, so a `--grep`
// containing a space would have to be hand-quoted — and hand-quoting is the bug that warning
// exists for. Running the CLI through `process.execPath` passes the array straight to the child,
// so `yarn test:component --grep "a prepare that throws"` arrives as one argument with no help.
// A `&&` chain in package.json could not forward it at all: yarn appends to the last command only.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const PROJECTS = ['component', 'component-firefox', 'component-webkit'];
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const forwarded = process.argv.slice(2);

for (const project of PROJECTS) {
  const result = spawnSync(
    process.execPath,
    [cli, 'test', '-c', 'playwright.config.ts', `--project=${project}`, ...forwarded],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
