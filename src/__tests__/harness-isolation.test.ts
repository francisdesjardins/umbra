import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every harness that builds a modal has to say which manager it registers with.
 *
 * **The isolation is real and it is held by three different habits.** A React CT mount is wrapped
 * in a `DialogManagerProvider` by `playwright/index.tsx`, so a React story needs to do nothing. A
 * Solid harness is not covered by that wrapper — it is a Solid root hosted inside a React story —
 * so it wraps itself. A `umbra/vanilla` harness has no provider at all and passes
 * `manager: createDialogManager()` to `bindDialog`.
 *
 * Nothing enforced any of it. A new Solid or vanilla harness that forgets does not fail: it
 * registers with the module-level singleton and leaks into every other test in the run, and the
 * symptom is a test that passes alone and fails in the suite — or worse, one that passes in the
 * suite for a reason it did not write down.
 *
 * So the two bindings the global wrapper cannot reach are checked here, statically. The rule is
 * narrow on purpose: a file that **imports a modal constructor** must **name a manager**. A file
 * that only mounts something another file built (`solid-modal.story.tsx` hosting the apps from
 * `solid-app.ts`) imports no constructor and is not asked to.
 *
 * Static rather than behavioural for the same reason `collect-exports.ts` is: a runtime check
 * would need every harness mounted to observe the leak, which is the whole suite, and it would
 * report the symptom rather than the file to edit.
 */

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..');

/** The two binding trees the React CT wrapper does not cover. */
const UNWRAPPED_BINDINGS = ['solid', 'vanilla'] as const;

/**
 * Importing one of these means the file builds a modal of its own, so it owns the question of
 * which registry that modal lands in.
 */
const BUILDS_A_MODAL =
  /from '(?:\.\.\/(?:bind-dialog|use-modal)\.js|\.\.\/templates\/[^']+\.js|\.\.\/\.\.\/(?:solid|vanilla)\.js)'/;

/** Either way of naming one: Solid wraps a provider, vanilla passes the instance. */
const NAMES_A_MANAGER = /createDialogManager|DialogManagerProvider/;

/**
 * Comments do not count as naming a manager.
 *
 * Found while mutation-checking this file: a first attempt removed the import and the option and
 * the gate stayed green, because the prose above them still said `createDialogManager`. A rule
 * satisfied by a sentence about the rule is not a rule.
 */
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
    // The check above passes trivially if the patterns stop matching, which is the failure mode a
    // rename produces and the one nobody notices. Each binding must have at least one file the
    // rule actually judged.
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
        `no ${binding} harness matched the modal-constructor pattern`
      ).toBeGreaterThan(0);
    }
  });
});
