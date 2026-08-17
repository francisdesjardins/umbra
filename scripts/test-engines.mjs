#!/usr/bin/env node
// One engine at a time: `--project=a --project=b --project=c` puts all three into one worker pool
// (`cpus/2` wide locally), which made the suite flaky. Measured — 8 workers 2/3 red, `--workers=4`
// 1/3 red and 40% slower, the same tests `--repeat-each=20` 180/180 green, one engine at a time
// 1/21 red and no slower — so neither worker count nor the assertions. CI never saw it because CI
// runs one engine per job. Retries stay at zero: green without trustworthy is worth nothing.
//
// Spawned without a shell (DEP0190: `shell: true` concatenates arguments instead of escaping them),
// so `yarn test:component --grep "a prepare that throws"` reaches the child as one argument with no
// hand-quoting. A `&&` chain in package.json could not forward it: yarn appends to the last only.

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
