import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The layer rule, as a gate rather than a paragraph.
 *
 * `playground/CLAUDE.md` states two things about Feature-Sliced Design here — imports run
 * **downward only** (app → pages → widgets → entities → shared), and a slice is entered through
 * its public entry rather than reached into. Both were prose, and prose does not hold: a sweep
 * found `shared/ui` importing a provider out of `app`, a widget importing one too, and thirty
 * cross-slice imports going straight at a `ui/` file whose barrel already exported it.
 *
 * **Two exemptions, and each is a decision rather than a leak.**
 *
 * `?raw` imports are asset reads. `codeSamples.ts` names every example's source *as text* for the
 * viewer to display; nothing is called, rendered or depended on, and the alternative is a
 * generated registry that would have to be regenerated on every example added. It is step 2 of
 * "Adding an Example" in the playground's own guide.
 *
 * `entities/modal-template` has **no public entry on purpose** — its own barrel says so and
 * re-exports nothing. The templates are a directory tree because that is the shape they are
 * copied out in, flavour by flavour, and `import * as MessageModal from '…/mui/message-modal'`
 * is the form that says which flavour. A barrel would flatten exactly the distinction the slice
 * exists to make.
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

/** The one slice whose surface is its tree — see the note above. */
const NO_PUBLIC_ENTRY = 'modal-template';

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
        // An asset read, not a dependency — see the exemption in this file's doc.
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
    // Both checks pass trivially if the specifier pattern stops matching, which is what a path
    // alias rename produces and the failure nobody notices.
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
