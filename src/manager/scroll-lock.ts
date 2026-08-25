/**
 * Body scroll lock with scrollbar-width compensation — plain DOM, held while at least one *dialog*
 * (`showModal()`) dialog is open. Hiding `overflow` removes a classic scrollbar and widens the
 * viewport by its width, shifting every centered or right-aligned element (the ~15px "jump"), so
 * the same amount is reserved as body padding. `position: fixed` elements are *not* touched —
 * hunting a consumer's DOM for them would be the opposite of headless — so the reclaimed width is
 * published as `--dialog-scrollbar-width` on `:root`, for user-land to apply with
 * `padding-right: var(--dialog-scrollbar-width, 0px)` wherever it matters.
 */

import { BODY_LOCK_ATTR } from '../core/dialog-styles.js';
import { createLockLedger, createLockOwner } from './lock-ledger.js';
import type { LockOwner } from './lock-ledger.js';

/**
 * Published on `:root` while the lock is held: the width reclaimed, i.e. how much to compensate.
 * `0px` when nothing was, so consumers can use it unconditionally.
 */
export const SCROLLBAR_WIDTH_VAR = '--dialog-scrollbar-width';

// The attribute and the rule reading it live together in `core/dialog-styles.ts`, so the selector
// and this `setAttribute` cannot drift; both re-exported because this is where a caller looks.
export { BODY_LOCK_ATTR, createLockOwner };
export type { LockOwner };

/** Who currently wants the body locked — module-level, because `document.body` is one body. */
const ledger = createLockLedger();
/** Body's own inline `padding-right` before we touched it (`null` when we didn't). */
let restorePaddingRight: string | null = null;

/**
 * Width of the classic scrollbar currently taking layout space — `window.innerWidth` includes the
 * gutter, `documentElement.clientWidth` does not. `0` for overlay scrollbars, which have nothing to
 * compensate.
 */
export function getScrollbarWidth(): number {
  if (typeof document === 'undefined') {
    return 0;
  }
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

/**
 * How much horizontal space the lock reclaimed, and therefore how much to compensate. Pure, so the
 * three real-world cases are testable without a browser — headless Chromium uses overlay
 * scrollbars and cannot reproduce a space-taking gutter:
 *
 * | case                       | before | after | compensation |
 * | -------------------------- | -----: | ----: | -----------: |
 * | classic scrollbar          |     15 |     0 |           15 |
 * | overlay scrollbar          |      0 |     0 |            0 |
 * | `scrollbar-gutter: stable` |     15 |    15 |            0 |
 *
 * The last row is why this is a delta and not simply "the scrollbar width": that page keeps its
 * gutter through `overflow: hidden`, so padding by the scrollbar width would shift content inward
 * by 15px — a jump in the opposite direction from the one being fixed.
 */
export function computeScrollCompensation(gutterBefore: number, gutterAfter: number): number {
  return Math.max(0, gutterBefore - gutterAfter);
}

/**
 * The inline `padding-right` the lock writes when it reclaimed space: the page's own computed
 * padding plus the reclaimed width. Pure for {@link computeScrollCompensation}'s reason, and the
 * interesting part is the parse of a computed value that can be `'16px'` or a shape
 * `Number.parseFloat` turns into `NaN`. Called only when `reclaimed > 0`.
 */
export function compensationPadding(computedPaddingRight: string, reclaimed: number): string {
  const existing = Number.parseFloat(computedPaddingRight) || 0;
  return `${String(existing + reclaimed)}px`;
}

/**
 * Claim the body scroll lock for `owner`, applying it on the first claim and idempotent per owner —
 * so stacked dialogs within one manager never double-pad and repeat claims are free.
 *
 * @param owner - Identity of the claimant (a dialog manager instance's token).
 */
export function lockBodyScroll(owner: LockOwner): void {
  // The document guard comes first, so a server render cannot seed the ledger with a claim that
  // applied nothing — which would keep the first real lock in a hydrated page from taking effect.
  if (typeof document === 'undefined' || !ledger.claim(owner)) {
    return;
  }

  const { body, documentElement } = document;

  // Compensate the width the lock *actually reclaims*, not the current scrollbar width — see the
  // table on `computeScrollCompensation`. Setting the attribute and reading layout back costs one
  // synchronous reflow, but it is all one task, so no intermediate state is painted.
  const gutterBefore = getScrollbarWidth();
  body.setAttribute(BODY_LOCK_ATTR, 'true');
  const reclaimed = computeScrollCompensation(gutterBefore, getScrollbarWidth());

  documentElement.style.setProperty(SCROLLBAR_WIDTH_VAR, `${String(reclaimed)}px`);

  if (reclaimed > 0) {
    // Add to whatever padding the page already has rather than replacing it.
    restorePaddingRight = body.style.paddingRight;
    body.style.paddingRight = compensationPadding(getComputedStyle(body).paddingRight, reclaimed);
  }
}

/**
 * Drop `owner`'s claim; the lock releases, and the body's original inline padding is restored, only
 * when the last claim goes.
 *
 * @param owner - Identity of the claimant (a dialog manager instance's token).
 */
export function unlockBodyScroll(owner: LockOwner): void {
  if (typeof document === 'undefined' || !ledger.release(owner)) {
    return;
  }

  const { body, documentElement } = document;

  body.removeAttribute(BODY_LOCK_ATTR);

  if (restorePaddingRight !== null) {
    // Restoring `''` removes the inline declaration, handing styling back to CSS.
    body.style.paddingRight = restorePaddingRight;
    restorePaddingRight = null;
  }

  documentElement.style.removeProperty(SCROLLBAR_WIDTH_VAR);
}
