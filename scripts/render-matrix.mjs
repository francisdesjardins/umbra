#!/usr/bin/env node
// The compatibility matrix, rendered into API.md between its markers. The table lives once as data
// in `src/__tests__/compatibility-matrix.ts`; `compatibility-matrix.test.ts` fails when the two
// disagree. Written through prettier, which owns this repo's markdown layout (padded columns,
// `*em*` → `_em_`) — raw output left `API.md` dirty every run, and a `--list` run once rewrote it.
// Usage:
//   node scripts/render-matrix.mjs           # write the block if it changed
//   node scripts/render-matrix.mjs --check   # exit 1 if it would change, write nothing
//   node scripts/render-matrix.mjs --list    # print the worklist only, touch nothing

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { renderMatrix, worklist } from '../src/__tests__/compatibility-matrix.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = resolve(ROOT, 'API.md');

const BEGIN = '<!-- BEGIN COMPATIBILITY MATRIX -->';
const END = '<!-- END COMPATIBILITY MATRIX -->';

const CHECK = process.argv.includes('--check');
const LIST_ONLY = process.argv.includes('--list');

const { open, watch } = worklist();

// The age is computed here rather than in the table module, which owns no clock: a pure data module
// that reads the date renders differently on two days and the gate comparing it to `API.md` fails on
// the calendar. So the module carries the dates and this prints how old they are.
const DAY = 24 * 60 * 60 * 1000;
const TODAY = Date.now();
const age = (entry) => {
  if (entry.since === undefined) {
    return '      ';
  }
  return `${String(Math.floor((TODAY - Date.parse(entry.since)) / DAY)).padStart(4)}d `;
};

const printList = (heading, entries) => {
  console.log(`\n${String(entries.length)} ${heading}`);
  for (const entry of entries) {
    console.log(`  ${age(entry)} ${entry.line}`);
  }
};

/**
 * Two lists, oldest first — and the split is the output's whole point.
 *
 * Printed as one list, a cell waiting on typedoc's peer range read exactly like a test somebody owes,
 * so the backlog could never be finished and stopped being read. The watch half is dated by when it
 * was last measured, which is the only thing this repo controls about it.
 */
const printWorklist = () => {
  printList('open — the worklist the matrix produces, oldest first:', open);
  if (watch.length > 0) {
    printList('on the watch list — nothing to do here until somebody else ships:', watch);
  }
};

if (LIST_ONLY) {
  printWorklist();
  process.exit(0);
}

const doc = readFileSync(DOC, 'utf8');
const start = doc.indexOf(BEGIN);
const end = doc.indexOf(END);

if (start === -1 || end < start) {
  console.error(`render-matrix: API.md needs both markers.\n  ${BEGIN}\n  ${END}`);
  process.exit(1);
}

const spliced = `${doc.slice(0, start + BEGIN.length)}\n\n${renderMatrix().trim()}\n\n${doc.slice(end)}`;
const options = await prettier.resolveConfig(DOC);
const next = await prettier.format(spliced, { ...options, filepath: DOC });

if (next === doc) {
  console.log('compatibility matrix: API.md is up to date');
} else if (CHECK) {
  console.error('compatibility matrix: API.md is stale — run `yarn docs:matrix`');
  process.exit(1);
} else {
  writeFileSync(DOC, next);
  console.log('compatibility matrix: API.md rewritten');
}

printWorklist();
