#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = resolve(dirname(require.resolve('@playwright/test/package.json')), 'cli.js');

const argv = process.argv.slice(2);
const forwarded = [];
let shard = process.env['PLAYWRIGHT_SHARD']?.trim() ?? '';

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];

  if (arg === '--shard') {
    shard = argv[i + 1]?.trim() ?? '';
    i += 1;
    continue;
  }

  if (arg.startsWith('--shard=')) {
    shard = arg.slice('--shard='.length).trim();
    continue;
  }

  forwarded.push(arg);
}

if (shard && !/^\d+\/\d+$/.test(shard)) {
  console.error(`playwright-shard: invalid shard "${shard}" — expected format like "1/3".`);
  process.exit(1);
}

const commandArgs = ['test', '-c', 'playwright.config.ts', ...forwarded];
if (shard) {
  commandArgs.push(`--shard=${shard}`);
}

const result = spawnSync(process.execPath, [cliPath, ...commandArgs], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
