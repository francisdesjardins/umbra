import { expect, test } from '@playwright/test';
import { orderStack, planRaises, type StackCandidate, type StackPriority } from '../stack-order.js';

/**
 * The two decisions behind `prioritize`, tested where they are pure.
 *
 * `orderStack` answers what the order should be; `planRaises` answers what has to move. The second
 * is the one worth being strict about: every entry it returns is a `<dialog>` closed and re-shown in
 * the browser — the element's native `close` event fires and CSS keyed on `[open]` re-runs — so a
 * plan one item longer than necessary is a visible cost, not a wasted cycle.
 */

function candidate(id: string, openSequence: number, extra: Partial<StackCandidate> = {}) {
  return { id, template: 'modal', nonModal: false, openSequence, ...extra };
}

function ids(candidates: readonly StackCandidate[]): string[] {
  return candidates.map((c) => {
    return c.id;
  });
}

// ── orderStack ───────────────────────────────────────────────────────────────

test.describe('orderStack', () => {
  test('with no policy it is the open order, whatever order the registry iterates in', () => {
    const ordered = orderStack(
      [candidate('c', 3), candidate('a', 1), candidate('b', 2)],
      undefined
    );

    expect(ids(ordered)).toEqual(['a', 'b', 'c']);
  });

  test('higher priority sits nearer the front, which is the end of the array', () => {
    const priority: StackPriority = (modal) => {
      return modal.id === 'warning' ? 100 : 0;
    };

    // The warning opened first and would be at the bottom on open order alone.
    const ordered = orderStack([candidate('warning', 1), candidate('slide', 2)], priority);

    expect(ids(ordered)).toEqual(['slide', 'warning']);
  });

  test('a tie keeps open order, so a policy only has to say where it disagrees', () => {
    const priority: StackPriority = (modal) => {
      return modal.template === 'slide' ? -10 : 0;
    };

    const ordered = orderStack(
      [candidate('slide', 1, { template: 'slide' }), candidate('first', 2), candidate('second', 3)],
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
        candidate('a', 1, { template: 'slide' }),
        candidate('b', 2, { nonModal: true }),
        candidate('c', 3),
      ],
      priority
    );

    // Once each — a comparator that called the policy would ask O(n log n) times, and a policy is
    // allowed to be a lookup rather than arithmetic.
    expect(seen).toEqual(['a/slide/false', 'b/modal/true', 'c/modal/false']);
  });

  test('a policy that throws costs that dialog its opinion, not the stack its order', () => {
    const priority: StackPriority = (modal) => {
      if (modal.id === 'boom') {
        throw new Error('policy is broken');
      }
      return modal.id === 'top' ? 5 : 0;
    };

    // The alternative is the registry's snapshot recomputation throwing, on every transition of
    // every dialog, for a dialog that has nothing wrong with it.
    const ordered = orderStack(
      [candidate('boom', 1), candidate('top', 2), candidate('plain', 3)],
      priority
    );

    expect(ids(ordered)).toEqual(['boom', 'plain', 'top']);
  });

  test('NaN is treated as no opinion, because a NaN comparator has no order at all', () => {
    const priority: StackPriority = (modal) => {
      return modal.id === 'bad' ? Number.NaN : 1;
    };

    const ordered = orderStack(
      [candidate('bad', 2), candidate('a', 1), candidate('b', 3)],
      priority
    );

    expect(ids(ordered)).toEqual(['bad', 'a', 'b']);
  });
});

// ── planRaises ───────────────────────────────────────────────────────────────

test.describe('planRaises', () => {
  test('nothing moves when the order already reads as the desired one', () => {
    expect(planRaises(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([]);
  });

  test('swapping two dialogs lifts one, not both', () => {
    // The subsequence rule rather than the common-prefix one: `b` is already lowest and nothing
    // could make it lower, so lifting `a` over it is the whole move. A common-prefix plan would
    // re-show both and cost a round-trip for no change.
    expect(planRaises(['b', 'a'], ['a', 'b'])).toEqual(['a']);
  });

  test('a dialog that belongs at the bottom is already there — everything above it lifts', () => {
    expect(planRaises(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b']);
  });

  test('it keeps the longest run it can, not the longest contiguous one', () => {
    expect(planRaises(['b', 'd', 'a', 'c'], ['a', 'b', 'c', 'd'])).toEqual(['a', 'c']);
  });

  test('a dialog the tracking never saw is lifted rather than trusted', () => {
    // Costs a round-trip it may not have needed; never leaves the order wrong, which is the trade
    // the manager relies on when a show reaches the DOM without reporting itself.
    expect(planRaises(['x', 'y'], ['y'])).toEqual(['x', 'y']);
  });

  test('an empty or single-dialog top layer has nothing to plan', () => {
    expect(planRaises([], [])).toEqual([]);
    expect(planRaises(['a'], ['a'])).toEqual([]);
    // First open: the dialog is not tracked yet and the plan says show-order is enough.
    expect(planRaises(['a'], [])).toEqual(['a']);
  });
});
