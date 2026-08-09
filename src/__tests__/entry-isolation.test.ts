import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Each entry point must reach exactly its own framework, and no other.
 *
 * The package root is the framework-agnostic dialog manager: it resolves and runs with React and
 * Solid both absent. The two bindings are optional layers, published on `./react` and `./solid`,
 * and `peerDependenciesMeta` marks both peers optional on that promise.
 *
 * A single value import of a framework in the wrong graph breaks it, and nothing else in the
 * pipeline notices: it type-checks, it builds, and the failure surfaces only as a consumer
 * crashing on import — a Solid app pulling React in, or a service-side caller pulling either.
 *
 * So: walk the real import graph from each entry and fail here instead.
 *
 * The walker deliberately follows *value* edges only. Type-only imports are erased by the
 * compiler, so `import type { CSSProperties } from 'react'` is legitimate anywhere.
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
 * A framework import is harmless when it is fully erased: `import type { X } from 'react'`, or a
 * clause whose every named binding carries an inline `type` marker. Anything else — a default
 * import, a namespace import, or one un-marked binding — survives to runtime.
 */
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
        // A bare specifier owned by no framework — not part of the source graph.
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

/** The frameworks an entry point actually pulls in at runtime. */
const frameworksReachedFrom = (entryFile: string) => {
  const { visited, offenders } = collectGraph(resolve(SRC_ROOT, entryFile));

  // Sanity: the walker actually traversed something. A resolution bug that silently visited only
  // the entry file would make every assertion below pass for the wrong reason.
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
    // The positive half is what stops the assertions above from passing vacuously: if the walker
    // silently failed to resolve anything, the root would look clean for the wrong reason.
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
    // The third binding is a *controller* rather than a renderer, so it has no framework to reach
    // for — it resolves in exactly the environments the root does. Worth a test rather than a
    // sentence: one convenience import of a hook would end it, and nothing else would notice.
    const { detail } = frameworksReachedFrom('vanilla.ts');
    expect(detail).toEqual([]);
  });

  test('the walker would catch a framework import (meta-test)', () => {
    // Guards the guard: if `isErasedImport` or the regex ever stopped matching, the tests above
    // would pass vacuously. These are the shapes that must be rejected...
    expect(isErasedImport({ typeOnly: false, clause: ' { useState } ' })).toBe(false);
    expect(isErasedImport({ typeOnly: false, clause: ' React ' })).toBe(false);
    expect(isErasedImport({ typeOnly: false, clause: ' * as React ' })).toBe(false);
    expect(isErasedImport({ typeOnly: false, clause: ' React, { useState } ' })).toBe(false);
    expect(isErasedImport({ typeOnly: false, clause: ' { type X, useState } ' })).toBe(false);

    // ...and the shapes that are genuinely erased.
    expect(isErasedImport({ typeOnly: true, clause: ' { CSSProperties } ' })).toBe(true);
    expect(isErasedImport({ typeOnly: false, clause: ' { type CSSProperties } ' })).toBe(true);
    expect(isErasedImport({ typeOnly: false, clause: ' { type A, type B } ' })).toBe(true);

    // Both frameworks are recognised, including their sub-paths.
    expect(ownsSpecifier('react', 'react-dom')).toBe(true);
    expect(ownsSpecifier('solid', 'solid-js/web')).toBe(true);
    expect(ownsSpecifier('solid', 'solid-json')).toBe(false);

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
