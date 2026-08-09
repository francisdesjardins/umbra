import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The two bindings expose the same surface, and this is what says so.
 *
 * "Same hook names, same options, same return" is the claim `umbra/solid` exists to support, and
 * it is the kind of claim that decays one export at a time: a hook added to `./react` and
 * forgotten on `./solid` breaks nothing, fails nothing, and is only discovered by whoever
 * reaches for it. So the two entry points are diffed here instead.
 *
 * Only *names* are compared. Whether they mean the same thing is the type model's job — the
 * shared core in `core/types.ts` with two instantiations, pinned by `core/__tests__/type-model.test.ts`.
 *
 * Parsed rather than imported: the unit project runs in plain Node, and importing either entry
 * point pulls a framework and JSX it cannot transform.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Names an entry file exports directly. `export * from './index.js'` is deliberately not
 * followed: both bindings re-export the root wholesale, so the root's names are equal on both
 * sides by construction and would only pad the comparison.
 */
const directExports = (entryFile: string): Set<string> => {
  const source = readFileSync(resolve(SRC_ROOT, entryFile), 'utf8');
  const names = new Set<string>();

  for (const block of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s*from/g)) {
    for (const entry of (block[1] ?? '').split(',')) {
      const name = entry
        .trim()
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim();
      if (name !== undefined && /^[A-Za-z_$][\w$]*$/.test(name)) {
        names.add(name);
      }
    }
  }

  return names;
};

/**
 * What one binding may have that the other does not, and why.
 *
 * Adding to this list is a decision: it says the difference is the *renderer's*, not an
 * oversight. Anything else showing up here means the surfaces have drifted.
 */
const ALLOWED_ASYMMETRY: Readonly<Record<string, string>> = {
  // React reads a store through `useSyncExternalStore`, which takes the library's
  // `subscribe`/`getSnapshot` pair with no adapter at all. Solid needs the bridge, so it ships it.
  fromStore: 'solid',
};

test.describe('binding parity', () => {
  test('./react and ./solid export the same names', () => {
    const react = directExports('react.ts');
    const solid = directExports('solid.ts');

    // Sanity: a parse that found nothing would make every assertion below pass vacuously.
    expect(react.size).toBeGreaterThan(20);
    expect(solid.size).toBeGreaterThan(20);

    const onlyReact = [...react].filter((name) => {
      return !solid.has(name) && ALLOWED_ASYMMETRY[name] !== 'react';
    });
    const onlySolid = [...solid].filter((name) => {
      return !react.has(name) && ALLOWED_ASYMMETRY[name] !== 'solid';
    });

    expect(onlyReact, 'exported by ./react but missing from ./solid').toEqual([]);
    expect(onlySolid, 'exported by ./solid but missing from ./react').toEqual([]);
  });

  test('every documented asymmetry is real', () => {
    // The allowlist must not outlive what it excuses: an entry for a name neither binding
    // exports would silently keep excusing a gap that has moved somewhere else.
    const byEntry = { react: directExports('react.ts'), solid: directExports('solid.ts') };

    for (const [name, owner] of Object.entries(ALLOWED_ASYMMETRY)) {
      const side = owner === 'react' ? byEntry.react : byEntry.solid;
      expect(side.has(name), `${name} is allowlisted for ./${owner} but ./${owner} lacks it`).toBe(
        true
      );
    }
  });

  test('the two bindings mirror each other file for file', () => {
    // The surfaces can match while the folders do not, and that is how "there is no slide modal
    // in Solid" gets believed: the export was there, the file next to `modal-outlet` was not.
    const react = readFileSync(resolve(SRC_ROOT, 'react.ts'), 'utf8');
    const solid = readFileSync(resolve(SRC_ROOT, 'solid.ts'), 'utf8');

    const moduleNames = (source: string, folder: string) => {
      return new Set(
        // The path, not just the basename: `templates/use-slide-modal` and `use-slide-modal`
        // are different answers to "where does a reader look for it".
        [...source.matchAll(new RegExp(`from '\\./${folder}/([\\w/-]+)\\.js'`, 'g'))].map(
          (match) => {
            return match[1];
          }
        )
      );
    };

    const reactModules = moduleNames(react, 'react');
    const solidModules = moduleNames(solid, 'solid');

    expect(
      [...reactModules].filter((name) => {
        return !solidModules.has(name);
      })
    ).toEqual([]);
    expect(
      [...solidModules].filter((name) => {
        return !reactModules.has(name) && name !== 'from-store';
      })
    ).toEqual([]);
  });
});
