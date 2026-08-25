import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The layer rule from `playground/CLAUDE.md` as a gate: imports run **downward only**
 * (app → pages → widgets → entities → shared) and a slice is entered through its public entry. As
 * prose it did not hold — a sweep found two upward provider imports and thirty past a barrel.
 * **Two exemptions**: `?raw` imports are asset reads, the alternative being a registry regenerated
 * per example (step 2 of "Adding an Example"); `entities/dialog-template` has **no public entry on
 * purpose**, a tree being the shape templates are copied out in and the namespace import saying
 * which flavour — a barrel would flatten that.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** app → pages → widgets → entities → shared. A lower number is a higher layer. */
const RANK: Readonly<Record<string, number>> = {
  app: 0,
  pages: 1,
  widgets: 2,
  entities: 3,
  shared: 4,
};

/** The one slice whose surface is its tree. */
const NO_PUBLIC_ENTRY = 'dialog-template';

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found;
}

/** Every aliased import in a file, with comments stripped so prose cannot trip the gate. */
function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
    .replaceAll(/\/\/[^\n]*/g, ' ');
  return [...source.matchAll(/from '(@\/[^']+)'/g)].map((match) => {
    return match[1] ?? '';
  });
}

const relative = (file: string): string => {
  return file.split(sep).join('/').split('/playground/src/')[1] ?? '';
};
const layerOf = (path: string): string | undefined => {
  return path.split('/')[0];
};
const sliceOf = (path: string): string | undefined => {
  const layer = layerOf(path);
  return layer === 'pages' || layer === 'widgets' || layer === 'entities'
    ? path.split('/')[1]
    : undefined;
};

test.describe('the playground follows its own layer rule', () => {
  test('imports run downward only', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const from = relative(file);
      const fromLayer = layerOf(from);
      if (fromLayer === undefined || !(fromLayer in RANK)) {
        continue;
      }
      for (const specifier of importsOf(file)) {
        // An asset read, not a dependency.
        if (specifier.endsWith('?raw')) {
          continue;
        }
        const toLayer = layerOf(specifier.slice(2));
        if (toLayer === undefined || !(toLayer in RANK)) {
          continue;
        }
        if ((RANK[toLayer] ?? 0) < (RANK[fromLayer] ?? 0)) {
          offenders.push(`${from} -> ${specifier}`);
        }
      }
    }

    expect(
      offenders,
      'These import upward, which inverts the layer order. Move the thing they need down — a context both `app` and `shared/ui` read belongs in `shared/lib`, with the provider left where it is.'
    ).toEqual([]);
  });

  test('a slice is entered through its public entry', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const from = relative(file);
      const own = sliceOf(from);
      for (const specifier of importsOf(file)) {
        if (specifier.endsWith('?raw')) {
          continue;
        }
        const target = specifier.slice(2);
        const targetSlice = sliceOf(target);
        // A slice reaching into its own segments is not a boundary crossing.
        if (targetSlice === undefined || targetSlice === own || targetSlice === NO_PUBLIC_ENTRY) {
          continue;
        }
        if (/^(?:pages|widgets|entities)\/[^/]+\/(?:ui|model|lib|api)\//.test(target)) {
          offenders.push(`${from} -> ${specifier}`);
        }
      }
    }

    expect(
      offenders,
      "These reach past a slice's public entry into its internals. Import the slice itself — its `index.ts` almost certainly already exports the name — or add the export if it does not."
    ).toEqual([]);
  });

  test('the rule is matching something — the alias is in use across layers', () => {
    // Both checks pass trivially if the specifier pattern stops matching — what an alias rename does.
    const seen = new Set<string>();
    for (const file of sourceFiles()) {
      const layer = layerOf(relative(file));
      if (layer !== undefined && importsOf(file).length > 0) {
        seen.add(layer);
      }
    }
    expect([...seen].sort()).toEqual(['app', 'entities', 'pages', 'shared', 'widgets']);
  });
});
