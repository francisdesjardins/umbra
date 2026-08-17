#!/usr/bin/env node
/**
 * Merge and report the component project's coverage: `.nyc_output/` holds one Istanbul object per
 * test, keyed by absolute source path, and a statement covered by any test is covered. Not `nyc`,
 * because the counters are already Istanbul-shaped and a report is arithmetic over three maps.
 * Line numbers are the source's own thanks to `scripts/vite-plugin-ct-coverage.mjs`. Failure mode:
 * finding no counters has four causes, printed below rather than left to guesswork.
 *
 * Usage: node scripts/ct-coverage-report.mjs [--json <path>]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const INPUT_DIR = resolve(ROOT, '.nyc_output');

const jsonFlag = process.argv.indexOf('--json');
const jsonOut = jsonFlag !== -1 ? process.argv[jsonFlag + 1] : null;

/** What "no counters" can mean — all three have happened, and the flag is only the first. */
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
      // Cloned, not referenced: the counters are summed in place, so the first test's object would
      // otherwise become the accumulator for every later one.
      merged.set(path, structuredClone(entry));
      continue;
    }
    // `?? 0` is not padding: two files instrumented from different revisions have different counter
    // ids, and summing them blind reads `undefined` and poisons the total with `NaN` — quietly, one
    // `NaN%` row under an otherwise fine summary.
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

// Spelled out: the default comparator stringifies each `[path, entry]` pair and would sort on the
// `[object Object]` tail as readily as on the path.
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
    // Forward slashes whatever the platform: half a report in `src\core\style.ts` pastes nowhere.
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
