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
 * Positions are the source's own, and that took a plugin to arrange: instrumentation happens
 * before anything transforms the file (`scripts/vite-plugin-ct-coverage.mjs`), because the
 * off-the-shelf route instruments stripped output and remaps, which lands every counter below a
 * file's JSDoc block sixteen lines early. A line number here can be trusted; the CHANGELOG for
 * 2026-08-10 has the measurement.
 *
 * Usage: node scripts/ct-coverage-report.mjs [--json <path>]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const INPUT_DIR = resolve(ROOT, '.nyc_output');

const jsonFlag = process.argv.indexOf('--json');
const jsonOut = jsonFlag !== -1 ? process.argv[jsonFlag + 1] : null;

/**
 * What "no counters" can actually mean — all three have happened, and the flag is only the first.
 *
 * Naming the other two is the whole value of this message: an empty `.nyc_output` says nothing
 * about which stage produced nothing, and reading it as "you forgot the flag" is how an afternoon
 * goes missing.
 */
const NOTHING_WRITTEN = [
  'No component coverage was written. One of:',
  '  · CT_COVERAGE=1 was not set, so nothing instrumented the bundle;',
  '  · the instrumenter changed but playwright/.cache-coverage/ did not — the freshness check',
  '    walks the component sources, so delete that directory by hand;',
  "  · scripts/vite-plugin-ct-coverage.mjs matched no files (check its path filter's separators).",
].join('\n');

let files;
try {
  files = readdirSync(INPUT_DIR).filter((name) => {
    return name.endsWith('.json');
  });
} catch {
  console.error(NOTHING_WRITTEN);
  process.exit(1);
}

if (files.length === 0) {
  console.error(NOTHING_WRITTEN);
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
    // `?? 0` on every read, and it is not defensive padding: two files instrumented from
    // different revisions of the same source have different counter ids, and summing them blind
    // reads `undefined` and poisons the total with `NaN` — silently, since a NaN percentage
    // prints as `NaN%` in one row and leaves the summary looking fine. `.nyc_output/` is cleared
    // per run so this should not arise; if it ever does, an id nobody else counted is zero.
    for (const key of Object.keys(entry.s)) {
      existing.s[key] = (existing.s[key] ?? 0) + entry.s[key];
    }
    for (const key of Object.keys(entry.f)) {
      existing.f[key] = (existing.f[key] ?? 0) + entry.f[key];
    }
    for (const key of Object.keys(entry.b)) {
      existing.b[key] ??= entry.b[key].map(() => {
        return 0;
      });
      entry.b[key].forEach((count, index) => {
        existing.b[key][index] = (existing.b[key][index] ?? 0) + count;
      });
    }
  }
}

const ratio = (covered, total) => {
  return total === 0 ? 100 : (100 * covered) / total;
};

const rows = [];
const totals = { s: [0, 0], b: [0, 0], f: [0, 0] };

// Sorted by path, spelled out: the default comparator would stringify each `[path, entry]` pair
// and sort on the object's `[object Object]` tail as readily as on the path.
const byPath = [...merged].sort(([a], [b]) => {
  return a.localeCompare(b);
});

for (const [path, entry] of byPath) {
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
    // Forward slashes whatever the platform: this column is read as a path into the repo, and
    // half a report in `src\core\style.ts` is a report nobody can paste anywhere.
    file: relative(ROOT, path).replaceAll('\\', '/'),
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
