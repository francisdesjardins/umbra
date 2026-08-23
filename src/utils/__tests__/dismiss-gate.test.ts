import { expect, test } from '@playwright/test';
import { DISMISS_REASON } from '../../core/dismiss-reason.js';
import type { DismissCause, DismissReason } from '../../core/dismiss-reason.js';
import type { DismissGate } from '../dismiss-gate.js';
import { answerDismiss, canDismiss } from '../dismiss-gate.js';

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

/** A store that records what it was asked to close with, and nothing else. */
function recordingTarget() {
  const closed: string[] = [];
  return {
    closed,
    close(reason: DismissReason) {
      closed.push(reason);
      return true;
    },
  };
}

test.describe('answerDismiss', () => {
  test('closes the store when nobody asked to answer', () => {
    const target = recordingTarget();

    expect(answerDismiss(target, { request: undefined, cause: 'dismiss-key' })).toBe(true);
    expect(target.closed).toEqual([DISMISS_REASON]);
  });

  test('reports to the owner instead of closing when one asked', () => {
    const target = recordingTarget();

    expect(answerDismiss(target, { request: () => {}, cause: 'dismiss-key' })).toBe(true);
    // The whole point: the owner decides, so the dialog is still on screen.
    expect(target.closed).toEqual([]);
  });

  test('tells the owner which door it came through', () => {
    const causes: DismissCause[] = [];
    const target = recordingTarget();
    const request = (cause: DismissCause) => {
      causes.push(cause);
    };

    answerDismiss(target, { request, cause: 'dismiss-key' });
    answerDismiss(target, { request, cause: 'backdrop-click' });
    answerDismiss(target, { request, cause: 'click-outside' });

    expect(causes).toEqual(['dismiss-key', 'backdrop-click', 'click-outside']);
  });

  test('only an explicit false declines', () => {
    const target = recordingTarget();
    const answer = (request: () => boolean | void) => {
      return answerDismiss(target, { request, cause: 'dismiss-key' });
    };

    expect(
      answer(() => {
        return false;
      })
    ).toBe(false);
    expect(
      answer(() => {
        return true;
      })
    ).toBe(true);
    // `undefined` is what a handler with no return statement produces, and it means "taken".
    expect(answer(() => {})).toBe(true);
    expect(target.closed).toEqual([]);
  });

  test('a declined dismissal still leaves the modal alone', () => {
    // Declining is about what the *page* sees next; it is never a second way to close.
    const target = recordingTarget();

    answerDismiss(target, {
      request: () => {
        return false;
      },
      cause: 'click-outside',
    });

    expect(target.closed).toEqual([]);
  });
});
