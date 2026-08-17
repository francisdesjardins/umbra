import { expect, test } from '@playwright/test';
import { orderStack, planRaises, type StackCandidate, type StackPriority } from '../stack-order.js';

/**
 * The two decisions behind `prioritize`, tested where they are pure: `orderStack` says what the
 * order should be, `planRaises` what has to move. Every entry the second returns is a `<dialog>`
 * closed and re-shown — `close` fires, `[open]` CSS re-runs — so an over-long plan is visible.
 */

function candidate(id: string, over: Partial<StackCandidate> & { openSequence: number }) {
  return { id, template: 'modal', nonModal: false, ...over };
}

function ids(candidates: readonly StackCandidate[]): string[] {
  return candidates.map((c) => {
    return c.id;
  });
}

test.describe('orderStack', () => {
  test('with no policy it is the open order, whatever order the registry iterates in', () => {
    const ordered = orderStack(
      [
        candidate('c', { openSequence: 3 }),
        candidate('a', { openSequence: 1 }),
        candidate('b', { openSequence: 2 }),
      ],
      undefined
    );

    expect(ids(ordered)).toEqual(['a', 'b', 'c']);
  });

  test('a non-modal dialog is under every modal one, whatever the open order', () => {
    // The platform paints every top-layer dialog above every ordinary one and no `z-index` reaches
    // between them: an order claiming a later non-modal is in front would be false, not opinionated.
    const ordered = orderStack(
      [
        candidate('panel', { openSequence: 2, nonModal: true }),
        candidate('alert', { openSequence: 1 }),
      ],
      undefined
    );

    expect(ids(ordered)).toEqual(['panel', 'alert']);
  });

  test('a policy cannot lift a non-modal dialog over a modal one', () => {
    // A policy asking this wants what the top layer cannot do — `planRaises` would plan the lift.
    const ordered = orderStack(
      [
        candidate('panel', { openSequence: 1, nonModal: true }),
        candidate('alert', { openSequence: 2 }),
      ],
      (modal) => {
        return modal.nonModal ? 100 : 0;
      }
    );

    expect(ids(ordered)).toEqual(['panel', 'alert']);
  });

  test('the policy still orders within each family', () => {
    const ordered = orderStack(
      [
        candidate('panel-a', { openSequence: 1, nonModal: true }),
        candidate('panel-b', { openSequence: 2, nonModal: true }),
        candidate('alert', { openSequence: 3 }),
        candidate('confirm', { openSequence: 4 }),
      ],
      (modal) => {
        return modal.id === 'panel-b' || modal.id === 'alert' ? -10 : 0;
      }
    );

    expect(ids(ordered)).toEqual(['panel-b', 'panel-a', 'alert', 'confirm']);
  });

  test('higher priority sits nearer the front, which is the end of the array', () => {
    const priority: StackPriority = (modal) => {
      return modal.id === 'warning' ? 100 : 0;
    };

    // The warning opened first and would be at the bottom on open order alone.
    const ordered = orderStack(
      [candidate('warning', { openSequence: 1 }), candidate('slide', { openSequence: 2 })],
      priority
    );

    expect(ids(ordered)).toEqual(['slide', 'warning']);
  });

  test('a tie keeps open order, so a policy only has to say where it disagrees', () => {
    const priority: StackPriority = (modal) => {
      return modal.template === 'slide' ? -10 : 0;
    };

    const ordered = orderStack(
      [
        candidate('slide', { openSequence: 1, template: 'slide' }),
        candidate('first', { openSequence: 2 }),
        candidate('second', { openSequence: 3 }),
      ],
      priority
    );

    expect(ids(ordered)).toEqual(['slide', 'first', 'second']);
  });

  test('the policy is told what a dialog is, and asked once per dialog', () => {
    const seen: string[] = [];
    const priority: StackPriority = (modal) => {
      seen.push(`${modal.id}/${modal.template}/${String(modal.nonModal)}`);
      return 0;
    };

    orderStack(
      [
        candidate('a', { openSequence: 1, template: 'slide' }),
        candidate('b', { openSequence: 2, nonModal: true }),
        candidate('c', { openSequence: 3 }),
      ],
      priority
    );

    // Once each: a comparator would ask O(n log n) times, and a policy may be a lookup.
    expect(seen).toEqual(['a/slide/false', 'b/modal/true', 'c/modal/false']);
  });

  test('a policy that throws costs that dialog its opinion, not the stack its order', () => {
    const priority: StackPriority = (modal) => {
      if (modal.id === 'boom') {
        throw new Error('policy is broken');
      }
      return modal.id === 'top' ? 5 : 0;
    };

    // The alternative is snapshot recomputation throwing on every transition of every dialog.
    const ordered = orderStack(
      [
        candidate('boom', { openSequence: 1 }),
        candidate('top', { openSequence: 2 }),
        candidate('plain', { openSequence: 3 }),
      ],
      priority
    );

    expect(ids(ordered)).toEqual(['boom', 'plain', 'top']);
  });

  test('NaN is treated as no opinion, because a NaN comparator has no order at all', () => {
    const priority: StackPriority = (modal) => {
      return modal.id === 'bad' ? Number.NaN : 1;
    };

    const ordered = orderStack(
      [
        candidate('bad', { openSequence: 2 }),
        candidate('a', { openSequence: 1 }),
        candidate('b', { openSequence: 3 }),
      ],
      priority
    );

    expect(ids(ordered)).toEqual(['bad', 'a', 'b']);
  });
});

test.describe('planRaises', () => {
  test('nothing moves when the order already reads as the desired one', () => {
    expect(planRaises(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([]);
  });

  test('swapping two dialogs lifts one, not both', () => {
    // The subsequence rule, not common-prefix: `b` is already lowest, so lifting `a` over it is
    // the whole move; a common-prefix plan would re-show both for no change.
    expect(planRaises(['b', 'a'], ['a', 'b'])).toEqual(['a']);
  });

  test('a dialog that belongs at the bottom is already there — everything above it lifts', () => {
    expect(planRaises(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b']);
  });

  test('it keeps the longest run it can, not the longest contiguous one', () => {
    expect(planRaises(['b', 'd', 'a', 'c'], ['a', 'b', 'c', 'd'])).toEqual(['a', 'c']);
  });

  test('a dialog the tracking never saw is lifted rather than trusted', () => {
    // Costs a needless round-trip, never leaves the order wrong — for a show that went unreported.
    expect(planRaises(['x', 'y'], ['y'])).toEqual(['x', 'y']);
  });

  test('an empty or single-dialog top layer has nothing to plan', () => {
    expect(planRaises([], [])).toEqual([]);
    expect(planRaises(['a'], ['a'])).toEqual([]);
    // First open: the dialog is not tracked yet and the plan says show-order is enough.
    expect(planRaises(['a'], [])).toEqual(['a']);
  });
});
