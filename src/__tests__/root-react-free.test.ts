import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The package root is the framework-agnostic dialog manager: it must resolve and run with
 * React absent entirely. React is one binding, published separately on `./react`, and
 * `peerDependenciesMeta` marks it optional on that promise.
 *
 * A single value import of `react` anywhere in the root's graph breaks it, and nothing else
 * in the pipeline notices: it type-checks, it builds, and the failure surfaces only as a
 * non-React consumer crashing on import.
 *
 * So: walk the real import graph from `src/index.ts` and fail here instead.
 *
 * The walker deliberately follows *value* edges only. Type-only imports are erased by the
 * compiler, so `import type { CSSProperties } from 'react'` is legitimate anywhere.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Extensions tried, in order, when resolving a relative specifier back to its source file. */
const CANDIDATE_SUFFIXES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

/**
 * Source specifiers carry the `.js` extension the emitted declarations need (see
 * `tsconfig.build.json`), so map it back to the `.ts`/`.tsx` file that actually holds the code.
 * Extensionless specifiers still resolve, so this keeps working if one slips in.
 */
const readModule = (absPath: string) => {
  const absPathWithoutExt = absPath.replace(/\.js$/, '');
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${absPathWithoutExt}${suffix}`;
    try {
      return { path: candidate, source: readFileSync(candidate, 'utf8') };
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};

/**
 * Every `import`/`export ... from '<specifier>'` in a module, with the leading
 * `import type` / `export type` form flagged — those are erased by the compiler and so
 * cannot drag a runtime dependency in.
 */
const parseImports = (source: string) => {
  // Matches `import ... from 'x'`, `export ... from 'x'`, and bare `import 'x'`.
  const pattern = /(?:^|\n)\s*(import|export)(\s+type)?\b([^;'"]*?)from\s*['"]([^'"]+)['"]/g;
  const results: { specifier: string; typeOnly: boolean; clause: string }[] = [];

  let match = pattern.exec(source);
  while (match !== null) {
    const [, , typeKeyword, clause = '', specifier = ''] = match;
    results.push({
      specifier,
      typeOnly: typeKeyword !== undefined,
      clause,
    });
    match = pattern.exec(source);
  }
  return results;
};

/**
 * A React import is harmless when it is fully erased: `import type { X } from 'react'`, or a
 * clause whose every named binding carries an inline `type` marker. Anything else — a default
 * import, a namespace import, or one un-marked binding — survives to runtime.
 */
const isErasedReactImport = (entry: { typeOnly: boolean; clause: string }) => {
  if (entry.typeOnly) {
    return true;
  }
  const named = /\{([^}]*)\}/.exec(entry.clause);
  if (named === null) {
    // No braces at all → default or namespace import → a real runtime binding.
    return false;
  }
  const beforeBraces = entry.clause.slice(0, entry.clause.indexOf('{')).trim();
  if (beforeBraces.replace(/,$/, '').trim() !== '') {
    // A default import sits alongside the named ones, e.g. `React, { useState }`.
    return false;
  }
  return (named[1] ?? '')
    .split(',')
    .map((binding) => {
      return binding.trim();
    })
    .filter((binding) => {
      return binding !== '';
    })
    .every((binding) => {
      return binding.startsWith('type ');
    });
};

/** Transitively collect every source file reachable from `entry` via relative imports. */
const collectGraph = (entryAbsPath: string) => {
  const visited = new Set<string>();
  const offenders: { module: string; specifier: string }[] = [];
  const queue = [entryAbsPath];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const source = readFileSync(current, 'utf8');

    for (const entry of parseImports(source)) {
      if (entry.specifier === 'react' || entry.specifier.startsWith('react/')) {
        if (!isErasedReactImport(entry)) {
          offenders.push({ module: current, specifier: entry.specifier });
        }
        continue;
      }

      if (!entry.specifier.startsWith('.')) {
        // A bare specifier other than react — not part of the source graph.
        continue;
      }

      // Type-only edges are erased; they cannot pull a runtime dependency along.
      if (entry.typeOnly) {
        continue;
      }

      const resolved = readModule(resolve(dirname(current), entry.specifier));
      if (resolved !== null) {
        queue.push(resolved.path);
      }
    }
  }

  return { visited, offenders };
};

test.describe('package root entry point', () => {
  test('reaches no module that imports React at runtime', () => {
    const entry = resolve(SRC_ROOT, 'index.ts');
    const { visited, offenders } = collectGraph(entry);

    // Sanity: the walker actually traversed something. A resolution bug that silently
    // visited only the entry file would make the assertion below pass for the wrong reason.
    expect(visited.size).toBeGreaterThan(3);

    expect(
      offenders.map((offender) => {
        return `${offender.module.replace(SRC_ROOT, 'src')} imports '${offender.specifier}'`;
      })
    ).toEqual([]);
  });

  test('./react does reach React — the walker is not blind', () => {
    // The mirror of the test above. If the walker silently failed to resolve anything, the
    // root assertion would pass for the wrong reason; the React binding must come back dirty.
    const { offenders } = collectGraph(resolve(SRC_ROOT, 'react.ts'));
    expect(offenders.length).toBeGreaterThan(0);
  });

  test('the walker would catch a React import (meta-test)', () => {
    // Guards the guard: if `isErasedReactImport` or the regex ever stopped matching, the
    // test above would pass vacuously. These are the shapes that must be rejected...
    expect(isErasedReactImport({ typeOnly: false, clause: ' { useState } ' })).toBe(false);
    expect(isErasedReactImport({ typeOnly: false, clause: ' React ' })).toBe(false);
    expect(isErasedReactImport({ typeOnly: false, clause: ' * as React ' })).toBe(false);
    expect(isErasedReactImport({ typeOnly: false, clause: ' React, { useState } ' })).toBe(false);
    expect(isErasedReactImport({ typeOnly: false, clause: ' { type X, useState } ' })).toBe(false);

    // ...and the shapes that are genuinely erased.
    expect(isErasedReactImport({ typeOnly: true, clause: ' { CSSProperties } ' })).toBe(true);
    expect(isErasedReactImport({ typeOnly: false, clause: ' { type CSSProperties } ' })).toBe(true);
    expect(isErasedReactImport({ typeOnly: false, clause: ' { type A, type B } ' })).toBe(true);

    // The regex must see both `import ... from` and `export ... from` edges.
    const parsed = parseImports(
      [
        "import { a } from './a';",
        "import type { B } from './b';",
        "export { c } from './c';",
        "import './side-effect';",
      ].join('\n')
    );
    expect(
      parsed.map((entry) => {
        return entry.specifier;
      })
    ).toEqual(['./a', './b', './c']);
    expect(parsed[1]?.typeOnly).toBe(true);
  });
});
