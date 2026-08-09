/**
 * Body scroll lock with scrollbar-width compensation.
 *
 * Framework-agnostic: plain DOM, no React. Used by the dialog manager whenever at least one
 * *modal* (blocking, `showModal()`) dialog is open.
 *
 * Why the compensation matters: hiding `overflow` removes a classic (space-taking) scrollbar,
 * which widens the viewport by its width and shifts every centered or right-aligned element —
 * the ~15px "jump" you see when a modal opens. We reserve the same amount as body padding so
 * the layout stays put.
 *
 * `position: fixed` elements are *not* touched — hunting a consumer's DOM for them would be
 * the opposite of headless. Instead the measured width is published as the
 * `--dialog-scrollbar-width` custom property on `:root` while the lock is held, so user-land
 * can opt in wherever it matters:
 *
 * ```css
 * .my-fixed-header { padding-right: var(--dialog-scrollbar-width, 0px); }
 * ```
 */

/**
 * Custom property published on `:root` while the lock is held, holding the width the lock
 * reclaimed — i.e. exactly how much to compensate. `0px` when nothing was reclaimed (overlay
 * scrollbars, or a page using `scrollbar-gutter: stable`), so consumers can use it
 * unconditionally.
 */
export const SCROLLBAR_WIDTH_VAR = '--dialog-scrollbar-width';

/** Attribute the injected stylesheet keys `overflow: hidden` off. */
export const BODY_LOCK_ATTR = 'data-dialog-open';

/**
 * Who currently wants the body locked.
 *
 * Module-level because the lock target (`document.body`) is global — two manager instances
 * share one body. A shared *boolean* is not enough, though: each manager calls
 * `unlockBodyScroll()` whenever it observes a transition and finds no modal dialog open, and
 * with last-writer-wins that releases a lock another manager is still holding. A page with a
 * provider-scoped manager next to the singleton would then scroll behind an open modal.
 *
 * So the lock is claimed per owner and released only when the last claim goes. Claims are
 * idempotent, which is also what keeps stacked modals within one manager from double-padding.
 */
const owners = new Set<object>();
/** Body's own inline `padding-right` before we touched it (`null` when we didn't). */
let restorePaddingRight: string | null = null;

/**
 * Width of the classic scrollbar currently taking layout space, in px.
 *
 * `window.innerWidth` includes the scrollbar gutter; `documentElement.clientWidth` does not.
 * Returns `0` for overlay scrollbars (mobile, `scrollbar-gutter`-less overlay mode) — i.e.
 * exactly the cases where there is nothing to compensate.
 */
export function getScrollbarWidth(): number {
  if (typeof document === 'undefined') {
    return 0;
  }
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

/**
 * How much horizontal space the lock reclaimed, and therefore how much to compensate.
 *
 * Pure so the three real-world cases are testable without a browser (headless Chromium uses
 * overlay scrollbars, so it cannot reproduce a space-taking gutter):
 *
 * | case                       | before | after | compensation |
 * | -------------------------- | -----: | ----: | -----------: |
 * | classic scrollbar          |     15 |     0 |           15 |
 * | overlay scrollbar          |      0 |     0 |            0 |
 * | `scrollbar-gutter: stable` |     15 |    15 |            0 |
 *
 * The last row is why this is a delta and not simply "the scrollbar width": that page keeps
 * its gutter through `overflow: hidden`, so padding by the scrollbar width would shift content
 * inward by 15px — a jump in the opposite direction from the one we are fixing.
 */
export function computeScrollCompensation(gutterBefore: number, gutterAfter: number): number {
  return Math.max(0, gutterBefore - gutterAfter);
}

/**
 * Claim the body scroll lock for `owner`, applying it if this is the first claim.
 *
 * Idempotent per owner, so stacked modals within one manager never double-pad, and repeat
 * claims across managers are free.
 *
 * @param owner - Identity of the claimant (a dialog manager instance's token).
 */
export function lockBodyScroll(owner: object): void {
  if (typeof document === 'undefined' || owners.has(owner)) {
    return;
  }
  const wasUnlocked = owners.size === 0;
  owners.add(owner);
  if (!wasUnlocked) {
    return;
  }

  const { body, documentElement } = document;

  // Compensate the width the lock *actually reclaims*, not the current scrollbar width — those
  // differ, and assuming the latter introduces a shift in the opposite direction. Measured
  // cases at 1000px viewport:
  //   classic scrollbar        gutter 15 → 0   → reclaimed 15, pad 15  (fixes the jump)
  //   overlay scrollbar        gutter  0 → 0   → reclaimed  0, pad  0  (nothing to do)
  //   scrollbar-gutter: stable gutter 15 → 15  → reclaimed  0, pad  0  (padding would shift
  //                                                                     content inward by 15)
  // Setting the attribute and reading layout back costs one synchronous reflow, but everything
  // here happens in a single task, so the browser never paints an intermediate state.
  const gutterBefore = getScrollbarWidth();
  body.setAttribute(BODY_LOCK_ATTR, 'true');
  const reclaimed = computeScrollCompensation(gutterBefore, getScrollbarWidth());

  documentElement.style.setProperty(SCROLLBAR_WIDTH_VAR, `${String(reclaimed)}px`);

  if (reclaimed > 0) {
    // Add to whatever padding the page already has rather than replacing it.
    restorePaddingRight = body.style.paddingRight;
    const existing = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${String(existing + reclaimed)}px`;
  }
}

/**
 * Drop `owner`'s claim. The lock is released — and the body's original inline padding
 * restored — only when the last claim goes.
 *
 * @param owner - Identity of the claimant (a dialog manager instance's token).
 */
export function unlockBodyScroll(owner: object): void {
  if (typeof document === 'undefined' || !owners.delete(owner) || owners.size > 0) {
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
