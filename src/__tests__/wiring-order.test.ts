import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODAL_LIFECYCLE_SEQUENCE } from '../core/modal-director.js';

/**
 * The order the shared lifecycle is wired in, and who is allowed to write it down.
 *
 * **Why this exists.** Every framework-free piece of this library is a decision — `canDismiss`,
 * `orderStack`, `chooseActionRunner` — and each is tested. The *sequence* they are asked in is a
 * decision too, and an unnamed one is a decision no test can reach: the focus-policy bug one layer
 * down existed only as the order of statements someone happened to write.
 *
 * **Most of the order is the compiler's job now.** `core/modal-director.ts` wires the steps once
 * and `MODAL_LIFECYCLE_SEQUENCE` is *derived* from the table that runs them, so there is no second
 * statement to drift from the first. What is left here is the part a type cannot hold:
 *
 * 1. the sequence is what this file records, so reordering the director is a deliberate edit;
 * 2. no hook binding wires a step behind the director's back;
 * 3. `umbra/vanilla` — which deliberately does **not** use the director — still wires all nine,
 *    and still wires them in the order recorded below.
 *
 * **The controller is a different kind of binding and is held to a different thing.** React and
 * Solid are the same modal written twice, so they share one executor. `umbra/vanilla` runs
 * `syncOpenSequence` **last** where the hook pair runs it first; moving it was measured green on
 * three engines and deliberately not taken, because "no test noticed" is enough to close a
 * contract question between two bindings that owe each other a mirror and not enough to move
 * shipped behaviour that owes nobody one. That divergence is carried in `UNRECONCILED` with the
 * question that would settle it, the way the compatibility matrix carries a `~`.
 *
 * **Only effect-time steps are compared, and that exclusion is load-bearing.** Source order is a
 * usable proxy for run order inside vanilla's single `sync()` body. It is *not* comparable for
 * steps that run during render: React calls `getDialogAnimationStyles` in its render body, so it
 * runs before every effect while appearing last in the file. Including it produced a table that
 * read "React styles first, vanilla styles second" from evidence that said the opposite.
 */

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The two bindings the director now wires, and the one that still wires itself. */
const DIRECTED = {
  react: 'react/use-modal.tsx',
  solid: 'solid/use-modal.ts',
} as const;
const CONTROLLER = 'vanilla/bind-dialog.ts';

/**
 * The sequence as it stands, 2026-08-13. Not an aspiration — a record.
 *
 * Updating this is the point at which someone has to say why the order moved, in the commit.
 */
const RECORDED_SEQUENCE: readonly string[] = [
  'syncOpenSequence',
  'syncLabellingDiagnostics',
  'syncCloseSequence',
  'attachDialogKeydown',
  'attachDialogCancel',
  'attachWindowDismissKey',
  'focus.sync',
  'attachFocusContainment',
  'attachClickOutside',
];

/** The controller's own order, recorded for the same reason and required of nobody else. */
const RECORDED_CONTROLLER: readonly string[] = [
  'attachDialogKeydown',
  'attachDialogCancel',
  'attachWindowDismissKey',
  'attachClickOutside',
  'attachFocusContainment',
  'syncCloseSequence',
  'focus.sync',
  'syncOpenSequence',
  'syncLabellingDiagnostics',
];

/**
 * The divergence, with the question it leaves open.
 *
 * A `reason` here is not a justification — there is not one yet. It is a statement of what would
 * have to be established to close the cell, which is the honest thing to write while the answer is
 * unknown.
 */
const UNRECONCILED: readonly { readonly what: string; readonly question: string }[] = [
  {
    what: 'syncOpenSequence runs first in the director and last in the controller',
    question:
      'showModal() before or after the listeners are attached. Moving the controller onto the director was run green on three engines, so nothing establishes that it matters — and nothing establishes that it does not.',
  },
];

function sourceOf(file: string): string {
  return (
    readFileSync(resolve(srcRoot, file), 'utf8')
      .replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
      .replaceAll(/\/\/[^\n]*/g, ' ')
      // Imports name every step and would swamp the real call sites.
      .replaceAll(/^import[\s\S]*?from\s+'[^']+';$/gm, ' ')
  );
}

function orderIn(file: string): string[] {
  const source = sourceOf(file);

  return MODAL_LIFECYCLE_SEQUENCE.map((step) => {
    return [source.indexOf(`${step}(`), step] as const;
  })
    .filter(([at]) => {
      return at !== -1;
    })
    .sort((a, b) => {
      return a[0] - b[0];
    })
    .map(([, step]) => {
      return step;
    });
}

test.describe('wiring order', () => {
  test('the director runs the lifecycle in the order this file records', () => {
    expect(
      [...MODAL_LIFECYCLE_SEQUENCE],
      'core/modal-director.ts changed the order it runs the shared lifecycle in. That is a decision about when showModal() runs relative to the listeners and the focus policy — update RECORDED_SEQUENCE and say why in the commit.'
    ).toEqual(RECORDED_SEQUENCE);
  });

  test('no hook binding wires a lifecycle step itself', () => {
    // The regression this replaces the old order-diff with. A binding that reaches past the
    // director for one step has taken back the scheduling decision the director exists to own —
    // and it would do it silently, because the modal would still work.
    for (const [binding, file] of Object.entries(DIRECTED)) {
      const source = sourceOf(file);
      const wired = MODAL_LIFECYCLE_SEQUENCE.filter((step) => {
        return source.includes(`${step}(`);
      });
      expect(
        wired,
        `${binding} calls a lifecycle step directly. The order is core/modal-director.ts's to decide — add the step there, or say in the commit why this binding has to be the exception.`
      ).toEqual([]);
    }
  });

  test('the controller wires every step, in the order this file records', () => {
    // Recorded rather than required: see the divergence above. The count matters as much as the
    // order — the comparison is vacuous for a step the controller never calls, and a step dropped
    // from it is exactly the regression that would hide there.
    expect(orderIn(CONTROLLER)).toEqual(RECORDED_CONTROLLER);
    expect(RECORDED_CONTROLLER.length, 'the controller is missing an effect-time step').toBe(
      MODAL_LIFECYCLE_SEQUENCE.length
    );
  });

  test('the recorded divergence is the one that actually exists', () => {
    // One order for the hook pair and one for the controller. If they ever match, the controller
    // has adopted the director and the divergence is closed; if a third appears, a hook binding
    // has gone its own way and the test above should have caught it first.
    const same =
      RECORDED_CONTROLLER.join(' → ') === [...MODAL_LIFECYCLE_SEQUENCE].join(' → ') &&
      orderIn(CONTROLLER).join(' → ') === [...MODAL_LIFECYCLE_SEQUENCE].join(' → ');
    expect(
      same,
      "The controller now runs the director's order. That closes UNRECONCILED — say so there, or move it onto the director outright."
    ).toBe(false);
    expect(UNRECONCILED.length).toBeGreaterThan(0);
  });
});
