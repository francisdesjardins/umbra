import { expect, test } from '@playwright/test';
import { readFileSync, globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The README's namespace table against the namespaces the code emits.
 *
 * A debugging path documented under a name nothing writes leads a reader nowhere, and one the code
 * writes but the table omits is invisible — which is how `dialog:native-close` went undocumented.
 * Neither shows up in any other gate: `doc-budget` already checks the `yarn` scripts the public
 * documents name, and this is the same rot in the other column.
 */
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The logger's own doc and test invent namespaces to demonstrate filtering, and those are examples
 * rather than paths a reader could switch on.
 */
const FIXTURE_SOURCES = new Set(['src/utils/logger.ts']);

/** Every `createLogger('…')` the shipped source actually emits. */
function emittedNamespaces(): Set<string> {
  const emitted = new Set<string>();
  for (const file of globSync('src/**/*.{ts,tsx}', { cwd: REPO })) {
    const path = file.split('\\').join('/');
    if (path.includes('__tests__/') || FIXTURE_SOURCES.has(path)) {
      continue;
    }
    for (const match of readFileSync(resolve(REPO, file), 'utf8').matchAll(
      /createLogger\('([^']+)'\)/g
    )) {
      emitted.add(match[1] as string);
    }
  }
  return emitted;
}

/**
 * Every namespace the README's table names, read out of its first column.
 *
 * Scoped to that one table by its own header: the entry-point table above it is also a first column
 * of backticked lowercase names, and a scan of the whole file reads `umbra` as a namespace.
 */
function documentedNamespaces(): Set<string> {
  const readme = readFileSync(resolve(REPO, 'README.md'), 'utf8');
  const heading = readme.indexOf('| Namespace');
  const table = heading === -1 ? '' : (readme.slice(heading).split('\n\n')[0] ?? '');
  return new Set(
    [...table.matchAll(/^\| `([a-z][a-z:-]*)`\s*\|/gm)].map((row) => {
      return row[1] as string;
    })
  );
}

test.describe('the documented log namespaces', () => {
  test('the scan finds something, so the checks below are not vacuous', () => {
    expect(emittedNamespaces().size).toBeGreaterThan(5);
    expect(documentedNamespaces().size).toBeGreaterThan(5);
  });

  test('every namespace the code emits is in the README table', () => {
    const documented = documentedNamespaces();
    const undocumented = [...emittedNamespaces()].filter((namespace) => {
      return !documented.has(namespace);
    });

    expect(
      undocumented.sort(),
      'These are switched on by `setLogLevel` and named nowhere a reader looks — add a row to the README table.'
    ).toEqual([]);
  });

  test('every namespace the README table names is one the code emits', () => {
    // The other direction: a row nobody writes to is a debugging path that answers with silence.
    const emitted = emittedNamespaces();
    const unwritten = [...documentedNamespaces()].filter((namespace) => {
      return !emitted.has(namespace);
    });

    expect(unwritten.sort(), 'These rows name no namespace the source emits.').toEqual([]);
  });
});
