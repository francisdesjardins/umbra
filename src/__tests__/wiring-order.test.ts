import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIALOG_LIFECYCLE_SEQUENCE } from '../core/dialog-director.js';

/**
 * The order the shared lifecycle is wired in, and who is allowed to write it down.
 *
 * The *sequence* the framework-free decisions are asked in is a decision, and an unnamed one is
 * one no test can reach. `core/dialog-director.ts` wires the steps once and derives
 * `DIALOG_LIFECYCLE_SEQUENCE` from that table; what is left is what a type cannot hold — the order
 * is recorded here, and no binding wires a step behind the director's back. All three go through
 * it, so there is one order rather than a second to keep reconciled.
 */

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every binding, all three directed. */
const DIRECTED = {
  react: 'react/use-dialog.tsx',
  solid: 'solid/use-dialog.ts',
  vanilla: 'vanilla/bind-dialog.ts',
} as const;

/**
 * The sequence as it stands, 2026-09-04 — a record; moving it costs a why in the commit.
 *
 * `as const` and deliberately no `satisfies DialogLifecycleStep[]`: a record the checker keeps in
 * step with the code cannot disagree with it, and the disagreement is the whole output.
 */
const RECORDED_SEQUENCE = [
  'syncOpenSequence',
  'syncLabellingDiagnostics',
  'syncCloseSequence',
  'attachNativeClose',
  'attachDialogKeydown',
  'attachDialogCancel',
  'attachWindowDismissKey',
  'focus.sync',
  'attachFocusContainment',
  'attachClickOutside',
] as const;

function sourceOf(file: string): string {
  return (
    readFileSync(resolve(srcRoot, file), 'utf8')
      .replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
      .replaceAll(/\/\/[^\n]*/g, ' ')
      // Imports name every step and would swamp the real call sites.
      .replaceAll(/^import[\s\S]*?from\s+'[^']+';$/gm, ' ')
  );
}

test.describe('wiring order', () => {
  test('the director runs the lifecycle in the order this file records', () => {
    expect(
      [...DIALOG_LIFECYCLE_SEQUENCE],
      'core/dialog-director.ts changed the order it runs the shared lifecycle in. That is a decision about when showModal() runs relative to the listeners and the focus policy — update RECORDED_SEQUENCE and say why in the commit.'
    ).toEqual(RECORDED_SEQUENCE);
  });

  test('no binding wires a lifecycle step itself', () => {
    // A binding that reaches past the director for one step takes back the scheduling decision the
    // director exists to own — silently, because the dialog still works.
    for (const [binding, file] of Object.entries(DIRECTED)) {
      const source = sourceOf(file);
      const wired = DIALOG_LIFECYCLE_SEQUENCE.filter((step) => {
        return source.includes(`${step}(`);
      });
      expect(
        wired,
        `${binding} calls a lifecycle step directly. The order is core/dialog-director.ts's to decide — add the step there, or say in the commit why this binding has to be the exception.`
      ).toEqual([]);
    }
  });
});
