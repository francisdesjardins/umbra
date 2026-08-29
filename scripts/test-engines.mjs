#!/usr/bin/env node
// One engine at a time: `--project=a --project=b --project=c` puts all three into one worker pool
// (`cpus/2` wide locally), which made the suite flaky. Measured — 8 workers 2/3 red, `--workers=4`
// 1/3 red and 40% slower, the same tests `--repeat-each=20` 180/180 green, one engine at a time
// 1/21 red and no slower — so neither worker count nor the assertions. CI never saw it because CI
// runs one engine per job. Retries stay at zero **locally**, where this arrangement is the whole
// defence: green without trustworthy is worth nothing, and a local retry would hide exactly what
// splitting the engines exposes. CI sets 2, against one worker rather than `cpus/2` — a different
// bargain, since a job that is not competing for the machine has no contention to retry through.
//
// Spawned without a shell (DEP0190: `shell: true` concatenates arguments instead of escaping them),
// so `yarn test:component --grep "a prepare that throws"` reaches the child as one argument with no
// hand-quoting. A `&&` chain in package.json could not forward it: yarn appends to the last only.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

// The three engines, then the same two of them with a touchscreen — a device rather than an engine,
// and the only place the `@touch` set runs at all.
const PROJECTS = [
  'component',
  'component-firefox',
  'component-webkit',
  'component-touch',
  'component-touch-webkit',
];
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
