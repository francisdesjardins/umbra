import { expect, test } from '@playwright/test';
import {
  compensationPadding,
  computeScrollCompensation,
  getScrollbarWidth,
  lockBodyScroll,
  unlockBodyScroll,
  createLockOwner,
} from '../scroll-lock.js';

test.describe('computeScrollCompensation', () => {
  test('classic space-taking scrollbar: compensates the reclaimed width', () => {
    expect(computeScrollCompensation(15, 0)).toBe(15);
    expect(computeScrollCompensation(17, 0)).toBe(17);
  });

  test('overlay scrollbar: nothing to compensate', () => {
    expect(computeScrollCompensation(0, 0)).toBe(0);
  });

  test('scrollbar-gutter: stable — gutter survives the lock, so compensation is zero', () => {
    // Padding by the current width (15) on a page that kept its gutter shifts content inward.
    expect(computeScrollCompensation(15, 15)).toBe(0);
  });

  test('never returns a negative compensation', () => {
    expect(computeScrollCompensation(0, 15)).toBe(0);
  });

  test('partial reclaim compensates only the difference', () => {
    expect(computeScrollCompensation(15, 5)).toBe(10);
  });
});

/**
 * No browser project reaches this: headless Chromium uses overlay scrollbars, so `reclaimed` is
 * always `0` and the padding branch never runs. The arithmetic and `NaN` fallback are pinned here.
 */
test.describe('compensationPadding', () => {
  test('adds the reclaimed width to the padding the page already has', () => {
    expect(compensationPadding('16px', 15)).toBe('31px');
  });

  test('a page with no padding gets exactly the reclaimed width', () => {
    expect(compensationPadding('0px', 15)).toBe('15px');
  });

  test('a computed value parseFloat cannot read falls back to zero, not NaN', () => {
    // `NaNpx` on the body is the failure: an unparseable value degrades to "no existing padding".
    expect(compensationPadding('', 15)).toBe('15px');
    expect(compensationPadding('auto', 15)).toBe('15px');
  });

  test('fractional padding survives the addition', () => {
    expect(compensationPadding('7.5px', 15)).toBe('22.5px');
  });
});

/**
 * The module with no document — this project *is* that environment; a browser always has one.
 * Each entry point guards on `typeof document`, and the manager calls all three from
 * `syncBodyScrollLock`, which a server render hits when a modal registers: a `ReferenceError`.
 */
test.describe('without a document', () => {
  test('getScrollbarWidth reports no gutter rather than reaching for one', () => {
    // `0`, not `undefined`: it feeds arithmetic that would otherwise pad the body with `NaN`.
    expect(getScrollbarWidth()).toBe(0);
  });

  test('claiming and releasing the lock are no-ops, in any order', () => {
    const owner = createLockOwner();
    const other = createLockOwner();

    expect(() => {
      lockBodyScroll(owner);
      lockBodyScroll(owner);
      lockBodyScroll(other);
      unlockBodyScroll(other);
      unlockBodyScroll(owner);
      // Releasing an untaken claim: the teardown of a binding that unmounted before it opened.
      unlockBodyScroll(createLockOwner());
    }).not.toThrow();
  });

  test('a claim that never applied leaves no owner behind to strand the next one', () => {
    // The guard returns *before* `owners.add`, or a server render strands the first real lock.
    const owner = createLockOwner();
    lockBodyScroll(owner);

    // The set is private, so the observable is that the matching release is still a no-op.
    expect(() => {
      unlockBodyScroll(owner);
    }).not.toThrow();
    expect(getScrollbarWidth()).toBe(0);
  });
});
