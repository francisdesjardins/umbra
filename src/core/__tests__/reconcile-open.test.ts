import { expect, test } from '@playwright/test';
import { reconcileOpen } from '../reconcile-open.js';
import type { ModalPhase } from '../types.js';

// `reconcileOpen` over every input it can be handed. Four phases and two booleans is eight cases,
// so the table is exhaustive rather than representative — a spot check leaves a corner to drift.

const CASES: readonly (readonly [ModalPhase, boolean, 'open' | 'close' | 'none'])[] = [
  // Closed and asked to open: the only case that opens.
  ['closed', true, 'open'],
  ['closed', false, 'none'],

  // Opening counts as open — it lasts a frame, and calling `open()` again on it asks for a second.
  ['opening', true, 'none'],
  ['opening', false, 'close'],

  ['open', true, 'none'],
  ['open', false, 'close'],

  // Closing is left alone either way: closing again would cut the exit, opening now would race the
  // finalize. Only `['closing', true]` discriminates — drop the guard and `open: false` still
  // answers `'none'`, because a closing dialog is not open and the prop agrees.
  ['closing', true, 'none'],
  ['closing', false, 'none'],
];

for (const [phase, open, expected] of CASES) {
  test(`phase '${phase}' with open=${String(open)} → '${expected}'`, () => {
    expect(reconcileOpen(phase, open)).toBe(expected);
  });
}
