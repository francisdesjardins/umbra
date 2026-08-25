import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODAL_LIFECYCLE_SEQUENCE } from '../core/dialog-director.js';

/**
 * The order the shared lifecycle is wired in, and who is allowed to write it down.
 *
 * The *sequence* the framework-free decisions are asked in is a decision, and an unnamed one is
 * one no test can reach. `core/dialog-director.ts` wires the steps once and derives
 * `MODAL_LIFECYCLE_SEQUENCE` from that table; what is left is what a type cannot hold — the
 * order is recorded here, no hook binding wires a step behind the director's back, and
 * `umbra/vanilla`, which does not use the director, still wires all nine in its own order. Only
 * **effect-time** steps are compared: source order proxies run order in vanilla's single `sync()`
 * body, but React calls `getDialogAnimationStyles` during render, so it runs first and reads last.
 */

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The two bindings the director now wires, and the one that still wires itself. */
const DIRECTED = {
  react: 'react/use-dialog.tsx',
  solid: 'solid/use-dialog.ts',
} as const;
const CONTROLLER = 'vanilla/bind-dialog.ts';

/** The sequence as it stands, 2026-08-13 — a record; moving it costs a why in the commit. */
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
 * The divergence, with the question it leaves open — not a justification, since there is not one
 * yet; naming what would have to be established is the honest thing while the answer is unknown.
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
      'core/dialog-director.ts changed the order it runs the shared lifecycle in. That is a decision about when showModal() runs relative to the listeners and the focus policy — update RECORDED_SEQUENCE and say why in the commit.'
    ).toEqual(RECORDED_SEQUENCE);
  });

  test('no hook binding wires a lifecycle step itself', () => {
    // A binding that reaches past the director for one step takes back the scheduling decision the
    // director exists to own — silently, because the modal still works.
    for (const [binding, file] of Object.entries(DIRECTED)) {
      const source = sourceOf(file);
      const wired = MODAL_LIFECYCLE_SEQUENCE.filter((step) => {
        return source.includes(`${step}(`);
      });
      expect(
        wired,
        `${binding} calls a lifecycle step directly. The order is core/dialog-director.ts's to decide — add the step there, or say in the commit why this binding has to be the exception.`
      ).toEqual([]);
    }
  });

  test('the controller wires every step, in the order this file records', () => {
    // Recorded rather than required (see above). Count matters as much as order: the comparison is
    // vacuous for a step the controller never calls, which is where a dropped step would hide.
    expect(orderIn(CONTROLLER)).toEqual(RECORDED_CONTROLLER);
    expect(RECORDED_CONTROLLER.length, 'the controller is missing an effect-time step').toBe(
      MODAL_LIFECYCLE_SEQUENCE.length
    );
  });

  test('the recorded divergence is the one that actually exists', () => {
    // If the two orders ever match, the controller has adopted the director and the divergence is
    // closed; a third order means a hook binding went its own way, which the test above catches.
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
