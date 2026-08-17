#!/usr/bin/env node
// The coverage pair, measured and written down in one move: the rule is "re-measure both or
// neither", and holding it by hand drifted README.md and CLAUDE.md apart twice, in both directions.
// The replacements below are anchored on the surrounding prose and must match exactly once each, so
// a reworded paragraph fails loudly instead of leaving a stale number. The write goes through
// prettier, which owns this repository's markdown layout.
// Usage: `yarn coverage:update` — run both coverage commands, rewrite README.md and CLAUDE.md.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Run a yarn script and hand back everything it printed. */
const run = (script) => {
  console.log(`coverage: running ${script} …`);
  return execSync(`yarn ${script}`, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
};

const unitOut = run('test:unit:coverage');
const componentOut = run('test:component:coverage');

// c8's text summary: `Statements   : 95.46% ( 5538/5801 )`
const unitMatch = unitOut.match(/Statements\s*:\s*([\d.]+)%/);
if (!unitMatch) {
  console.error('coverage: could not find the unit Statements line in c8 output');
  process.exit(1);
}
const unit = unitMatch[1];

// ct-coverage-report prints a per-file table then the same summary shape.
const componentMatch = componentOut.match(/Statements\s*:\s*([\d.]+)%/);
if (!componentMatch) {
  console.error('coverage: could not find the component Statements line — see the four failure');
  console.error('modes ct-coverage-report.mjs prints when it finds nothing.');
  process.exit(1);
}
const component = componentMatch[1];
const fileCount = (componentOut.match(/\s\ssrc\//g) ?? []).length;
if (fileCount === 0) {
  console.error('coverage: the component report listed no files');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
console.log(`coverage: unit ${unit}% · component ${component}% over ${fileCount} files · ${today}`);

/** Each edit must apply exactly once — a pattern that stopped matching means the prose moved. */
const rewrite = async (relative, edits) => {
  const path = resolve(ROOT, relative);
  const original = readFileSync(path, 'utf8');
  let next = original;
  for (const [pattern, replacement] of edits) {
    const matches = next.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? [];
    if (matches.length !== 1) {
      console.error(
        `coverage: expected exactly one match for ${String(pattern)} in ${relative}, found ${String(matches.length)} — update the pattern alongside the prose`
      );
      process.exit(1);
    }
    next = next.replace(pattern, replacement);
  }
  const options = await prettier.resolveConfig(path);
  next = await prettier.format(next, { ...options, filepath: path });
  if (next === original) {
    console.log(`coverage: ${relative} already up to date`);
    return;
  }
  writeFileSync(path, next);
  console.log(`coverage: ${relative} rewritten`);
};

const badge = (value) => {
  return String(Math.round(Number(value)));
};

await rewrite('README.md', [
  [/unit_coverage-\d+%25/, `unit_coverage-${badge(unit)}%25`],
  [/component_coverage-\d+%25/, `component_coverage-${badge(component)}%25`],
  [/in Node \(c8\) — \*\*[\d.]+%\*\*/, `in Node (c8) — **${unit}%**`],
  [
    /\*\*[\d.]+%\*\* statements over \d+ files/,
    `**${component}%** statements over ${fileCount} files`,
  ],
  [/Both measured \d{4}-\d{2}-\d{2}/, `Both measured ${today}`],
]);

await rewrite('CLAUDE.md', [
  [
    /Measured \d{4}-\d{2}-\d{2}: \*\*[\d.]+%\s+over \d+ files\*\*, against unit's \*\*[\d.]+%\*\*/,
    `Measured ${today}: **${component}% over ${fileCount} files**, against unit's **${unit}%**`,
  ],
]);
