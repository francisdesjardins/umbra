import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The bindings that promise the same surface expose the same surface. `./react` and `./solid` are
 * *hook* bindings: they render, so they share a surface down to the file names, and any divergence
 * is a bug that decays one export at a time — added to one, forgotten on the other, breaking
 * nothing until someone reaches for it. `./vanilla` is a *controller* with no `render`, `Dialog` or
 * outlet, so its own test below records what it must and must not have instead. Only *names* are
 * compared; whether they mean the same thing is the shared type model's job, pinned by
 * `core/__tests__/type-model.test.ts`. Parsed rather than imported: the unit project is plain Node
 * and can transform neither a framework nor JSX.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Names an entry file exports directly. `export * from './index.js'` is deliberately not followed:
// both re-export the root, so its names are equal by construction and would only pad the diff.
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

// What one binding may have that the other does not. Adding here says the difference is the
// renderer's, not an oversight; anything else showing up means the surfaces have drifted.
const ALLOWED_ASYMMETRY: Readonly<Record<string, string>> = {
  // `useSyncExternalStore` takes the library's `subscribe`/`getSnapshot` pair unadapted; Solid
  // needs the bridge, so it ships one.
  fromStore: 'solid',
};

test.describe('binding parity', () => {
  test('the two hook bindings export the same names', () => {
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
    // An entry for a name neither binding exports keeps excusing a gap that has moved elsewhere.
    const byEntry = { react: directExports('react.ts'), solid: directExports('solid.ts') };

    for (const [name, owner] of Object.entries(ALLOWED_ASYMMETRY)) {
      const side = owner === 'react' ? byEntry.react : byEntry.solid;
      expect(side.has(name), `${name} is allowlisted for ./${owner} but ./${owner} lacks it`).toBe(
        true
      );
    }
  });

  test('the two bindings mirror each other file for file', () => {
    // Surfaces can match while folders do not — the export is there, the file beside it is not.
    const react = readFileSync(resolve(SRC_ROOT, 'react.ts'), 'utf8');
    const solid = readFileSync(resolve(SRC_ROOT, 'solid.ts'), 'utf8');

    const moduleNames = (source: string, folder: string) => {
      return new Set(
        // The path, not the basename: `templates/use-slide-dialog` and `use-slide-dialog` differ.
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

test.describe('the controller binding', () => {
  test('./vanilla carries the doors, and none of the rendering surface', () => {
    const vanilla = directExports('vanilla.ts');

    expect(vanilla.has('bindDialog')).toBe(true);
    expect(vanilla.has('BindDialogOptions')).toBe(true);
    expect(vanilla.has('DialogController')).toBe(true);

    // Each of these presumes a renderer — shipping one here ships the UI the library refuses to.
    for (const rendering of ['useDialog', 'useMessageDialog', 'useSlideDialog', 'DialogOutlet']) {
      expect(vanilla.has(rendering), `./vanilla should not export ${rendering}`).toBe(false);
    }
  });

  test('every binding re-exports the root, so an app needs one import path', () => {
    // Makes `dialogManager`, `Key`, `createStore` reachable from all three; losing it is silent.
    for (const entry of ['react.ts', 'solid.ts', 'vanilla.ts']) {
      const source = readFileSync(resolve(SRC_ROOT, entry), 'utf8');
      expect(source, `${entry} must re-export the root`).toContain("export * from './index.js'");
    }
  });
});
