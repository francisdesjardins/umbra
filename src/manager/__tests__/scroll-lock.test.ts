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
    // Gutter existed and the lock reclaimed it → reserve the same amount so nothing shifts.
    expect(computeScrollCompensation(15, 0)).toBe(15);
    expect(computeScrollCompensation(17, 0)).toBe(17);
  });

  test('overlay scrollbar: nothing to compensate', () => {
    // Overlay scrollbars never took layout space, so there is nothing to give back.
    expect(computeScrollCompensation(0, 0)).toBe(0);
  });

  test('scrollbar-gutter: stable — gutter survives the lock, so compensation is zero', () => {
    // Regression: compensating the *current* scrollbar width (15) here would pad the body by
    // 15px on a page that never lost its gutter, shifting content inward — a jump in the
    // opposite direction from the one the compensation exists to prevent.
    expect(computeScrollCompensation(15, 15)).toBe(0);
  });

  test('never returns a negative compensation', () => {
    // Defensive: a gutter that somehow grew must not produce negative padding.
    expect(computeScrollCompensation(0, 15)).toBe(0);
  });

  test('partial reclaim compensates only the difference', () => {
    expect(computeScrollCompensation(15, 5)).toBe(10);
  });
});

/**
 * The other pure half of the lock, and the one no browser project reaches: headless Chromium
 * uses overlay scrollbars, so `reclaimed` is always `0` there and the padding branch never runs.
 * The arithmetic and the `NaN` fallback live here so they are pinned anyway.
 */
test.describe('compensationPadding', () => {
  test('adds the reclaimed width to the padding the page already has', () => {
    expect(compensationPadding('16px', 15)).toBe('31px');
  });

  test('a page with no padding gets exactly the reclaimed width', () => {
    expect(compensationPadding('0px', 15)).toBe('15px');
  });

  test('a computed value parseFloat cannot read falls back to zero, not NaN', () => {
    // `NaNpx` on the body is the failure this guards: an unparseable computed value must
    // degrade to "no existing padding", never poison the sum.
    expect(compensationPadding('', 15)).toBe('15px');
    expect(compensationPadding('auto', 15)).toBe('15px');
  });

  test('fractional padding survives the addition', () => {
    expect(compensationPadding('7.5px', 15)).toBe('22.5px');
  });
});

/**
 * The module with no document — this project *is* that environment, which is why the assertions
 * are here rather than in the component suite.
 *
 * Every entry point guards on `typeof document === 'undefined'`, and nothing checked that they
 * do. The manager calls all three from `syncBodyScrollLock`, which a server render reaches the
 * moment a modal registers, so a missing guard is a `ReferenceError` at import-adjacent time
 * rather than a layout bug — and the component suite cannot see it, because a browser always has
 * a document.
 */
test.describe('without a document', () => {
  test('getScrollbarWidth reports no gutter rather than reaching for one', () => {
    // `0` and not `undefined`: it feeds `computeScrollCompensation`, whose arithmetic would
    // otherwise produce `NaN` and pad the body with it on the first client render.
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
      // Releasing a claim that was never taken is the teardown path of a binding that unmounted
      // before it ever opened.
      unlockBodyScroll(createLockOwner());
    }).not.toThrow();
  });

  test('a claim that never applied leaves no owner behind to strand the next one', () => {
    // The guard returns *before* `owners.add`, so a server render cannot seed the module-level
    // set — which is what would keep the first real lock in a hydrated page from ever applying.
    const owner = createLockOwner();
    lockBodyScroll(owner);

    // Nothing to observe directly (the set is private), so the observable is that the matching
    // release is still a no-op rather than a release of someone else's claim.
    expect(() => {
      unlockBodyScroll(owner);
    }).not.toThrow();
    expect(getScrollbarWidth()).toBe(0);
  });
});
