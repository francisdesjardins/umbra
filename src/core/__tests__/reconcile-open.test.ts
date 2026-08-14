import { expect, test } from '@playwright/test';
import { reconcileOpen } from '../reconcile-open.js';
import type { ModalPhase } from '../types.js';

/**
 * `reconcileOpen` — the whole decision, over every input it can be handed.
 *
 * Four phases and two booleans is eight cases, so the table is exhaustive rather than
 * representative: the value of this function is that nobody has to think about the corners again,
 * and a spot check would leave one of them free to drift.
 */

const CASES: readonly (readonly [ModalPhase, boolean, 'open' | 'close' | 'none'])[] = [
  // Closed and asked to open: the only case that opens.
  ['closed', true, 'open'],
  ['closed', false, 'none'],

  // Opening counts as open — it lasts a frame, and calling `open()` again on it asks for a second.
  ['opening', true, 'none'],
  ['opening', false, 'close'],

  ['open', true, 'none'],
  ['open', false, 'close'],

  // Closing is left alone whichever way the prop moves. Closing it again would cut the exit; opening it now
  // would race the close that is still finalizing — the phase changes when it lands, and this runs
  // again on that.
  //
  // Only the first of the two discriminates: drop the `'closing'` guard and `open: false` still
  // answers `'none'`, because a closing dialog is not open and the prop agrees. So the row worth
  // reading is `['closing', true]` — that is the one that goes red when the guard goes.
  ['closing', true, 'none'],
  ['closing', false, 'none'],
];

for (const [phase, open, expected] of CASES) {
  test(`phase '${phase}' with open=${String(open)} → '${expected}'`, () => {
    expect(reconcileOpen(phase, open)).toBe(expected);
  });
}
