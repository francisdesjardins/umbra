import { expect, test } from '@playwright/test';
import type { DismissGate } from '../dismiss-gate.js';
import { canDismiss } from '../dismiss-gate.js';

/** A modal that is open, idle, and freely dismissable. */
const dismissable: DismissGate = {
  phase: 'open',
  isPreparing: false,
  dismissWhilePreparing: true,
  hasRunningAction: false,
};

test.describe('canDismiss', () => {
  test('allows dismissal of an open, idle modal', () => {
    expect(canDismiss(dismissable)).toBe(true);
  });

  test('allows dismissal during the opening phase', () => {
    expect(canDismiss({ ...dismissable, phase: 'opening' })).toBe(true);
  });

  // ── Phase gating ──────────────────────────────────────────────────────────

  test('blocks dismissal of a closed modal', () => {
    expect(canDismiss({ ...dismissable, phase: 'closed' })).toBe(false);
  });

  test('blocks dismissal of a modal already playing its exit animation', () => {
    // store.close() is a no-op in 'closing'; gating here avoids the round trip.
    expect(canDismiss({ ...dismissable, phase: 'closing' })).toBe(false);
  });

  // ── Action controller gating ──────────────────────────────────────────────

  test('blocks dismissal while a controller action is in flight', () => {
    expect(canDismiss({ ...dismissable, hasRunningAction: true })).toBe(false);
  });

  test('a running action outranks dismissWhilePreparing', () => {
    expect(
      canDismiss({ ...dismissable, hasRunningAction: true, dismissWhilePreparing: true })
    ).toBe(false);
  });

  // ── dismissWhilePreparing gating ────────────────────────────────────────────

  test('blocks dismissal while prepare runs when dismissWhilePreparing is false', () => {
    expect(canDismiss({ ...dismissable, isPreparing: true, dismissWhilePreparing: false })).toBe(
      false
    );
  });

  test('allows dismissal while prepare runs when dismissWhilePreparing is true', () => {
    expect(canDismiss({ ...dismissable, isPreparing: true, dismissWhilePreparing: true })).toBe(
      true
    );
  });

  test('dismissWhilePreparing: false is irrelevant once prepare has settled', () => {
    expect(canDismiss({ ...dismissable, isPreparing: false, dismissWhilePreparing: false })).toBe(
      true
    );
  });

  test('isPreparing can still be true in the open phase (prepare outlives the RAF)', () => {
    // phase flips to 'open' on the next animation frame, but isPreparing stays true
    // until the prepare promise settles — the two are independent.
    expect(
      canDismiss({
        phase: 'open',
        isPreparing: true,
        dismissWhilePreparing: false,
        hasRunningAction: false,
      })
    ).toBe(false);
  });
});
