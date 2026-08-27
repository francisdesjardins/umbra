import { FOCUS_GUARD_ATTRIBUTE, focusFirstAvailable } from './focus-policy.js';
import type { FocusContainmentOptions, DialogDomContext } from './attach-types.js';

/**
 * Keep Tab inside a dialog the browser is not keeping it inside.
 *
 * `showModal()` makes the document inert, so a modal dialog is contained for free; `show()` does
 * not, which is what `containFocus` asks for. Recovering a Tab pressed while focus is on
 * the `<dialog>` itself is **unconditional** instead: a dead-space click produces exactly that, and
 * WebKit swallows the press where Chromium and Firefox descend.
 *
 * **Two focusable markers, not a computed boundary.** Tab order cannot be predicted from a selector
 * — one dialog counted twenty-one matches against seven real stops — and a press inside an
 * `<iframe>` is invisible here. The browser walking past the end of the content *is* the boundary,
 * and `relatedTarget` decides which end focus goes to.
 *
 * @internal
 */

/**
 * A focusable marker that occupies nothing and shows nothing — and carries no `aria-hidden`, which
 * around something focusable is its own audit failure (axe's `aria-hidden-focus`).
 */
function createGuard(dialog: HTMLElement, position: 'start' | 'end'): HTMLElement {
  const guard = dialog.ownerDocument.createElement('div');
  guard.setAttribute(FOCUS_GUARD_ATTRIBUTE, position);
  guard.tabIndex = 0;
  // Zero-sized rather than hidden: `visibility: hidden` and `display: none` both take an element
  // out of the tab order, which is the one thing this must stay in.
  guard.style.cssText = 'width:0;height:0;overflow:hidden;outline:none';
  return guard;
}

/**
 * Wrap Tab at the two ends of a dialog's content.
 *
 * Returns its teardown, or `undefined` when there is nothing to attach.
 */
export function attachFocusContainment(
  ctx: DialogDomContext,
  options: FocusContainmentOptions
): (() => void) | undefined {
  const { getDialog, phase } = ctx;
  const { containFocus } = options;

  const dialog = getDialog();
  if (dialog === null || phase === 'closed') {
    return undefined;
  }

  // ── Always: the press the markers cannot see ────────────────────────────────
  //
  // A dead-space click focuses the `<dialog>` — click-focusable while open, though it takes no
  // `tabindex`. Chromium and Firefox descend into the subtree from there, **WebKit does not**.
  // Unconditional rather than behind `containFocus`: gated, an ordinary click costs the keyboard on
  // WebKit in every dialog that never opted in.
  const handleDialogTab = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || event.target !== dialog) {
      return;
    }
    // Swallowed only if something took it. A dialog with nothing focusable in it would otherwise
    // get a Tab that does nothing at all, which is worse than the platform's own answer.
    if (focusFirstAvailable(dialog, event.shiftKey)) {
      event.preventDefault();
    }
  };

  dialog.addEventListener('keydown', handleDialogTab);

  // ── Opt-in: the wrap ────────────────────────────────────────────────────────
  //
  // The half `containFocus` buys, and the half worth choosing: on a toast or a popover, keeping Tab
  // inside is the defect rather than the fix. A modal dialog is wrapped by the top layer already.
  if (!containFocus) {
    return () => {
      dialog.removeEventListener('keydown', handleDialogTab);
    };
  }

  const start = createGuard(dialog, 'start');
  const end = createGuard(dialog, 'end');

  const handleGuardFocus = (event: FocusEvent, guard: 'start' | 'end'): void => {
    const from = event.relatedTarget;
    const cameFromInside = from instanceof Node && dialog.contains(from);
    // Leaving: wrap to the far end. Arriving: settle on the near one.
    focusFirstAvailable(dialog, cameFromInside ? guard === 'start' : guard === 'end');
  };

  const onStart = (event: FocusEvent): void => {
    handleGuardFocus(event, 'start');
  };
  const onEnd = (event: FocusEvent): void => {
    handleGuardFocus(event, 'end');
  };

  start.addEventListener('focus', onStart);
  end.addEventListener('focus', onEnd);
  dialog.prepend(start);
  dialog.append(end);

  return () => {
    start.removeEventListener('focus', onStart);
    end.removeEventListener('focus', onEnd);
    dialog.removeEventListener('keydown', handleDialogTab);
    start.remove();
    end.remove();
  };
}
