#!/usr/bin/env node
// ── The compatibility matrix, rendered into API.md ───────────────────────────
//
// The table lives once, as data, in `src/__tests__/compatibility-matrix.ts`. This writes it between
// the markers in `API.md`, and `compatibility-matrix.test.ts` fails when the two disagree — so the
// document cannot drift from the table, which is the failure a hand-kept second copy guarantees.
//
// Usage:
//   node scripts/render-matrix.mjs           # write the block, report whether it changed
//   node scripts/render-matrix.mjs --check   # exit 1 if it would change, write nothing

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMatrix, worklist } from '../src/__tests__/compatibility-matrix.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = resolve(ROOT, 'API.md');

const BEGIN = '<!-- BEGIN COMPATIBILITY MATRIX -->';
const END = '<!-- END COMPATIBILITY MATRIX -->';

const CHECK = process.argv.includes('--check');

const doc = readFileSync(DOC, 'utf8');
const start = doc.indexOf(BEGIN);
const end = doc.indexOf(END);

if (start === -1 || end < start) {
  console.error(`render-matrix: API.md needs both markers.\n  ${BEGIN}\n  ${END}`);
  process.exit(1);
}

const next = `${doc.slice(0, start + BEGIN.length)}\n\n${renderMatrix().trim()}\n\n${doc.slice(end)}`;

if (next === doc) {
  console.log('compatibility matrix: API.md is up to date');
} else if (CHECK) {
  console.error('compatibility matrix: API.md is stale — run `yarn docs:matrix`');
  process.exit(1);
} else {
  writeFileSync(DOC, next);
  console.log('compatibility matrix: API.md rewritten');
}

const open = worklist();
console.log(`\n${String(open.length)} open cells — the worklist the matrix produces:`);
for (const entry of open) {
  console.log(`  ${entry}`);
}
