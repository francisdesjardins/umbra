import { isOwnEventTarget } from '../utils/dialog-scope.js';
import type { FocusContainmentOptions, ModalDomContext } from './attach-types.js';

/**
 * Keep Tab inside a dialog the browser is not keeping it inside.
 *
 * `showModal()` makes the rest of the document inert, so a modal dialog is contained for free.
 * `show()` does not: a non-modal dialog is an ordinary part of the page, and four tab presses
 * walk out of it into whatever is behind. That is right for a toast or a popover and wrong for a
 * panel that behaves like a modal in everything but its stacking — which is why this is off by
 * default and asked for with `containFocus`.
 *
 * **A keydown at the boundary, not a focus trap.** The obvious implementations both overreach:
 *
 * - **`inert` on everything else** takes a subtree out of the tab order *and* out of hit testing.
 *   A dialog in the top layer escapes an inert ancestor; one rendered in place does not. So in a
 *   page where both kinds coexist — an application shell whose own dialogs are ordinary elements —
 *   marking the page inert makes those unanswerable by mouse as well as by keyboard. The blast
 *   radius is every dialog that is not in the top layer.
 * - **Enforcing focus on `focusin`** pulls focus back from anywhere, which fights any legitimate
 *   focus target outside the dialog for exactly the same reason.
 *
 * Answering `Tab` on the dialog itself touches neither. It fires only when focus is already inside
 * and only at the two ends, so a click into something outside is left alone and a dialog opened
 * over this one keeps its own keyboard. What it cannot do is bring focus *back* once it has left
 * by other means — that is `show()`'s bargain, not a gap this could close.
 *
 * Two limits worth stating, since both are silent: the focusables are found with a selector, so a
 * control inside a shadow root or an `<iframe>` is not one of them.
 *
 * @internal Not part of the public API.
 */

/** Everything Tab can stop on, in document order — the same set the browser walks. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * The dialog's tab stops, in order.
 *
 * **`tabIndex >= 0` is the load-bearing half, and leaving it out is how this silently stops
 * working.** The selector above says `button:not([disabled])`, which matches a button whose
 * `tabindex` is `-1` — and a *roving tabindex* toolbar, the standard pattern for a toolbar, is
 * made of exactly those: one stop for the whole group, every other button taken out of the tab
 * order and reached with the arrow keys. A rich-text editor's toolbar alone can contribute twenty
 * of them. Counted against a real one: twenty-one elements matched the selector where the browser
 * stopped seven times, so the "last" this compares against was never a place the user could be,
 * the wrap never fired, and the dialog leaked — with the containment looking perfectly present in
 * the source.
 *
 * `checkVisibility` rather than the usual `offsetParent !== null`: that one reports `null` for
 * anything `position: fixed`, so the cheap idiom drops a perfectly visible control — and a dialog
 * is exactly where a pinned toolbar or footer shows up.
 *
 * **Its options are not optional here.** Bare `checkVisibility()` answers for `display: none` and
 * nothing else — in particular it returns `true` for `visibility: hidden`, which is *not* a tab
 * stop. Measured against a real dialog: a hidden file-input wrapper carrying `tabindex="0"` sat
 * last in document order and passed the bare check, so the wrap compared against an element the
 * browser skips and never fired. `opacityProperty` is deliberately left off: an element at
 * `opacity: 0` is still focusable, and excluding it would drop a real stop.
 */
function destinations(dialog: HTMLElement): readonly HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
    return (
      element.tabIndex >= 0 &&
      element.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })
    );
  });
}

/**
 * Wrap Tab from the last focusable to the first, and Shift+Tab the other way.
 *
 * Returns its teardown, or `undefined` when there is nothing to attach.
 */
export function attachFocusContainment(
  ctx: ModalDomContext,
  options: FocusContainmentOptions
): (() => void) | undefined {
  const { getDialog, phase } = ctx;
  const { containFocus } = options;

  const dialog = getDialog();
  if (!containFocus || dialog === null || phase === 'closed') {
    return undefined;
  }

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || event.defaultPrevented) {
      return;
    }
    // A dialog opened from inside this one renders in this one's subtree, so its Tab bubbles
    // through here. Containing it would wrap the wrong box.
    if (!isOwnEventTarget(dialog, event.target)) {
      return;
    }

    const stops = destinations(dialog);
    const first = stops.at(0);
    const last = stops.at(-1);
    if (first === undefined || last === undefined) {
      return;
    }

    // `activeElement` rather than `event.target`, because the two differ for a composite widget
    // that delegates its focus — the wrap has to be decided on what the browser will move from.
    const active = dialog.ownerDocument.activeElement;
    const leavingForward = !event.shiftKey && active === last;
    const leavingBackward = event.shiftKey && active === first;
    if (!leavingForward && !leavingBackward) {
      return;
    }

    event.preventDefault();
    (leavingForward ? first : last).focus();
  };

  dialog.addEventListener('keydown', handleKeyDown);
  return () => {
    dialog.removeEventListener('keydown', handleKeyDown);
  };
}
