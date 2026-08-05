import { expect, test } from '@playwright/test';
import { computeScrollCompensation } from '../scroll-lock.js';

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
