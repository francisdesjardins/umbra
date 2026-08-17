import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Each entry point must reach exactly its own framework, and no other. The root runs with React
 * and Solid both absent — what `peerDependenciesMeta`'s optional peers promise — and one *value*
 * import in the wrong graph breaks that while nothing else notices: it type-checks, it builds, and
 * surfaces only as a consumer crashing on import. So the real graph is walked. Type-only edges are
 * erased by the compiler, so `import type { CSSProperties } from 'react'` is legitimate anywhere.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Extensions tried, in order, when resolving a relative specifier back to its source file. */
const CANDIDATE_SUFFIXES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

/** The frameworks the package can bind to, by the specifier prefix each one owns. */
const FRAMEWORKS = {
  react: ['react', 'react-dom'],
  solid: ['solid-js'],
} as const;

type Framework = keyof typeof FRAMEWORKS;

const ownsSpecifier = (framework: Framework, specifier: string) => {
  return FRAMEWORKS[framework].some((root) => {
    return specifier === root || specifier.startsWith(`${root}/`);
  });
};

/**
 * Specifiers carry the `.js` the emitted declarations need, so map back to the real `.ts`/`.tsx`;
 * extensionless ones still resolve, so this keeps working if one slips in.
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

/** Every `import`/`export ... from` edge in a module, with the erased type-only form flagged. */
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

/** Erased only by `import type`, or by every named binding carrying an inline `type` marker. */
const isErasedImport = (entry: { typeOnly: boolean; clause: string }) => {
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
  const offenders: { module: string; specifier: string; framework: Framework }[] = [];
  const queue = [entryAbsPath];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const source = readFileSync(current, 'utf8');

    for (const entry of parseImports(source)) {
      const framework = (Object.keys(FRAMEWORKS) as Framework[]).find((name) => {
        return ownsSpecifier(name, entry.specifier);
      });

      if (framework !== undefined) {
        if (!isErasedImport(entry)) {
          offenders.push({ module: current, specifier: entry.specifier, framework });
        }
        continue;
      }

      if (!entry.specifier.startsWith('.')) {
        continue;
      }

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

/** The frameworks an entry point actually pulls in at runtime. */
const frameworksReachedFrom = (entryFile: string) => {
  const { visited, offenders } = collectGraph(resolve(SRC_ROOT, entryFile));

  // Sanity: a resolution bug that visited only the entry file would pass every assertion below.
  expect(visited.size).toBeGreaterThan(3);

  return {
    reached: new Set(
      offenders.map((offender) => {
        return offender.framework;
      })
    ),
    detail: offenders.map((offender) => {
      return `${offender.module.replace(SRC_ROOT, 'src')} imports '${offender.specifier}'`;
    }),
  };
};

test.describe('entry point isolation', () => {
  test('the root reaches no framework at runtime', () => {
    const { detail } = frameworksReachedFrom('index.ts');
    expect(detail).toEqual([]);
  });

  test('./react reaches React and nothing else', () => {
    // The positive half: without it, a walker resolving nothing leaves the root looking clean.
    const { reached, detail } = frameworksReachedFrom('react.ts');
    expect(reached.has('react')).toBe(true);
    expect(reached.has('solid'), `React binding pulled Solid in:\n${detail.join('\n')}`).toBe(
      false
    );
  });

  test('./solid reaches Solid and nothing else', () => {
    const { reached, detail } = frameworksReachedFrom('solid.ts');
    expect(reached.has('solid')).toBe(true);
    expect(reached.has('react'), `Solid binding pulled React in:\n${detail.join('\n')}`).toBe(
      false
    );
  });

  test('./vanilla reaches no framework at all', () => {
    // A controller, not a renderer: it resolves wherever the root does, and one convenience import
    // of a hook would end that with nothing else noticing.
    const { detail } = frameworksReachedFrom('vanilla.ts');
    expect(detail).toEqual([]);
  });

  test('the walker would catch a framework import (meta-test)', () => {
    // Guards the guard: `isErasedImport` or the regex failing to match passes every test above.
    expect(isErasedImport({ typeOnly: false, clause: ' { useState } ' })).toBe(false);
    expect(isErasedImport({ typeOnly: false, clause: ' React ' })).toBe(false);
    expect(isErasedImport({ typeOnly: false, clause: ' * as React ' })).toBe(false);
    expect(isErasedImport({ typeOnly: false, clause: ' React, { useState } ' })).toBe(false);
    expect(isErasedImport({ typeOnly: false, clause: ' { type X, useState } ' })).toBe(false);

    expect(isErasedImport({ typeOnly: true, clause: ' { CSSProperties } ' })).toBe(true);
    expect(isErasedImport({ typeOnly: false, clause: ' { type CSSProperties } ' })).toBe(true);
    expect(isErasedImport({ typeOnly: false, clause: ' { type A, type B } ' })).toBe(true);

    expect(ownsSpecifier('react', 'react-dom')).toBe(true);
    expect(ownsSpecifier('solid', 'solid-js/web')).toBe(true);
    expect(ownsSpecifier('solid', 'solid-json')).toBe(false);

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
