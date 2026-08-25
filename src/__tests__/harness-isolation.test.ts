import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every harness that builds a modal has to say which manager it registers with. React CT mounts are
 * wrapped in a `DialogManagerProvider` by `playwright/index.tsx`; a Solid harness is a Solid root
 * inside a React story, so it wraps itself; a vanilla one has no provider and passes its own
 * `manager: createDialogManager()` to `bindDialog`. Forgetting registers with the module-level
 * singleton and leaks across the run — a test that passes alone and fails in the suite — so the two
 * bindings that wrapper cannot reach are checked statically: a file that *imports a modal
 * constructor* must *name a manager*, and one that only mounts what another built is not asked to.
 * Static, because a runtime check needs the whole suite mounted and reports the symptom rather than
 * the file to edit.
 */

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..');

/** The two binding trees the React CT wrapper does not cover. */
const UNWRAPPED_BINDINGS = ['solid', 'vanilla'] as const;

/** Importing one of these means the file builds a modal, so it owns which registry it lands in. */
const BUILDS_A_MODAL =
  /from '(?:\.\.\/(?:bind-dialog|use-dialog)\.js|\.\.\/templates\/[^']+\.js|\.\.\/\.\.\/(?:solid|vanilla)\.js)'/;

/** Either way of naming one: Solid wraps a provider, vanilla passes the instance. */
const NAMES_A_MANAGER = /createDialogManager|DialogManagerProvider/;

// Comments do not count as naming a manager: a mutation check removed the import and the option
// and the gate stayed green, because the prose above them still said `createDialogManager`.
function stripComments(source: string): string {
  return source.replaceAll(/\/\*[\s\S]*?\*\//g, ' ').replaceAll(/\/\/[^\n]*/g, ' ');
}

function harnessFiles(binding: string): string[] {
  const dir = join(srcRoot, binding, '__tests__');
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
  walk(dir);
  return found;
}

test.describe('harness isolation', () => {
  test('a Solid or vanilla harness that builds a modal names the manager it registers with', () => {
    const offenders: string[] = [];

    for (const binding of UNWRAPPED_BINDINGS) {
      for (const file of harnessFiles(binding)) {
        const source = stripComments(readFileSync(file, 'utf8'));
        if (BUILDS_A_MODAL.test(source) && !NAMES_A_MANAGER.test(source)) {
          offenders.push(relative(srcRoot, file).replaceAll('\\', '/'));
        }
      }
    }

    expect(
      offenders,
      'These build a modal and let it register with the module-level singleton, which leaks across the run. Wrap the harness in its own `DialogManagerProvider` (Solid) or pass `manager: createDialogManager()` (vanilla).'
    ).toEqual([]);
  });

  test('the rule is matching something — both bindings have a harness it applies to', () => {
    // The check above passes trivially if the patterns stop matching — the failure a rename
    // produces. Each binding must have at least one file the rule actually judged.
    const judged = Object.fromEntries(
      UNWRAPPED_BINDINGS.map((binding) => {
        return [
          binding,
          harnessFiles(binding).filter((file) => {
            return BUILDS_A_MODAL.test(stripComments(readFileSync(file, 'utf8')));
          }).length,
        ];
      })
    );

    for (const binding of UNWRAPPED_BINDINGS) {
      expect(
        judged[binding],
        `no ${binding} harness matched the dialog-constructor pattern`
      ).toBeGreaterThan(0);
    }
  });
});
