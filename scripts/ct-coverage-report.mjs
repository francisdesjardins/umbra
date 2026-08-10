#!/usr/bin/env node
/**
 * Merge and report the component project's coverage.
 *
 * `.nyc_output/` holds one Istanbul object per component test — every counter that test's page
 * incremented, keyed by absolute source path. Merging is summing them: a statement covered by any
 * test is covered, so the union is what a report has to describe.
 *
 * Deliberately not `nyc`. The counters are already Istanbul-shaped, so a report is arithmetic over
 * three maps, and adding a coverage framework to read a format we already have would be a
 * dependency bought for its name.
 *
 * **The counts are sound; the line numbers are not.** Istanbul instruments the output *after*
 * TypeScript's types and comments have been stripped, and its statement map is in those
 * coordinates — so a file's totals are right while every position is shifted up by however many
 * comment lines precede it. Measured on `solid/modal-outlet.ts`: `createLogger` at line 12 is
 * attributed correctly, and everything below its 20-line JSDoc block lands 16 lines early, with
 * counters sitting on prose. `build: { sourcemap: true }` on the CT config does not help — the
 * plugin is not consuming the input map, which is the thing to fix before anyone reads a line
 * number here. Until then this reports percentages, and nothing points at a line.
 *
 * Usage: node scripts/ct-coverage-report.mjs [--json <path>]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const INPUT_DIR = resolve(ROOT, '.nyc_output');

const jsonFlag = process.argv.indexOf('--json');
const jsonOut = jsonFlag !== -1 ? process.argv[jsonFlag + 1] : null;

let files;
try {
  files = readdirSync(INPUT_DIR).filter((name) => {
    return name.endsWith('.json');
  });
} catch {
  console.error(`No ${relative(ROOT, INPUT_DIR)}/ — run the component project with CT_COVERAGE=1.`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`${relative(ROOT, INPUT_DIR)}/ is empty — was CT_COVERAGE=1 set?`);
  process.exit(1);
}

/** @type {Map<string, any>} */
const merged = new Map();

for (const name of files) {
  const data = JSON.parse(readFileSync(resolve(INPUT_DIR, name), 'utf8'));
  for (const [path, entry] of Object.entries(data)) {
    const existing = merged.get(path);
    if (!existing) {
      // Structured-cloned rather than referenced: the counters below are summed in place, and the
      // first test's object would otherwise become the accumulator for every later one.
      merged.set(path, structuredClone(entry));
      continue;
    }
    for (const key of Object.keys(entry.s)) {
      existing.s[key] += entry.s[key];
    }
    for (const key of Object.keys(entry.f)) {
      existing.f[key] += entry.f[key];
    }
    for (const key of Object.keys(entry.b)) {
      entry.b[key].forEach((count, index) => {
        existing.b[key][index] += count;
      });
    }
  }
}

const ratio = (covered, total) => {
  return total === 0 ? 100 : (100 * covered) / total;
};

const rows = [];
const totals = { s: [0, 0], b: [0, 0], f: [0, 0] };

for (const [path, entry] of [...merged].sort()) {
  const statements = Object.values(entry.s);
  const functions = Object.values(entry.f);
  const branches = Object.values(entry.b).flat();

  const covered = {
    s: statements.filter(Boolean).length,
    f: functions.filter(Boolean).length,
    b: branches.filter(Boolean).length,
  };

  totals.s[0] += covered.s;
  totals.s[1] += statements.length;
  totals.f[0] += covered.f;
  totals.f[1] += functions.length;
  totals.b[0] += covered.b;
  totals.b[1] += branches.length;

  rows.push({
    file: relative(ROOT, path),
    statements: ratio(covered.s, statements.length),
    missed: statements.length - covered.s,
    branches: ratio(covered.b, branches.length),
    functions: ratio(covered.f, functions.length),
  });
}

rows.sort((a, b) => {
  return a.statements - b.statements;
});

const pad = (value) => {
  return `${value.toFixed(1)}%`.padStart(7);
};

console.log(`\nComponent project — ${String(files.length)} tests, ${String(rows.length)} files\n`);
console.log('   stmt     br     fn   miss  file');
for (const row of rows) {
  console.log(
    `${pad(row.statements)}${pad(row.branches)}${pad(row.functions)}  ${String(row.missed).padStart(5)}  ${row.file}`
  );
}

console.log('\n=============================== Coverage summary ===============================');
console.log(
  `Statements   : ${ratio(...totals.s).toFixed(2)}% ( ${String(totals.s[0])}/${String(totals.s[1])} )`
);
console.log(
  `Branches     : ${ratio(...totals.b).toFixed(2)}% ( ${String(totals.b[0])}/${String(totals.b[1])} )`
);
console.log(
  `Functions    : ${ratio(...totals.f).toFixed(2)}% ( ${String(totals.f[0])}/${String(totals.f[1])} )`
);
console.log('================================================================================\n');

if (jsonOut) {
  writeFileSync(resolve(ROOT, jsonOut), JSON.stringify(Object.fromEntries(merged)), 'utf8');
  console.log(`Merged Istanbul data written to ${jsonOut}`);
}
