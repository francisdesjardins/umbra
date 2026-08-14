import { FOCUS_GUARD_ATTRIBUTE, focusFirstAvailable } from './focus-policy.js';
import type { FocusContainmentOptions, ModalDomContext } from './attach-types.js';

/**
 * Keep Tab inside a dialog the browser is not keeping it inside.
 *
 * `showModal()` makes the rest of the document inert, so a modal dialog is contained for free.
 * `show()` does not: a non-modal dialog is an ordinary part of the page, and a few tab presses walk
 * out of it into whatever is behind. That is right for a toast or a popover and wrong for a panel
 * that behaves like a modal in everything but its stacking — which is why this is off by default
 * and asked for with `containFocus`.
 *
 * **Two behaviours, and only one of them is optional.** The *wrap* is what `containFocus` asks
 * for. The `keydown` that recovers a Tab pressed while focus is on the `<dialog>` element itself
 * is **unconditional**: a click on a panel's empty space produces exactly that, and from there
 * WebKit does not move Tab into the content — it swallows the press and the keyboard is stuck on
 * the element, mouse-only, modal or otherwise. Chromium and Firefox descend. Behind the flag, an
 * ordinary click cost the keyboard on WebKit in every dialog that had not opted into an option
 * that reads as being about something else. Measured on all three engines; see
 * `focus-containment.ct.tsx`.
 *
 * **Two focusable markers, not a computed boundary.** The obvious implementation answers `Tab` on
 * the dialog and compares the focused element against the last of its tab stops. It is wrong twice
 * over, and both were measured against a real application rather than reasoned about:
 *
 * - **The tab order cannot be predicted from a selector.** A *roving tabindex* toolbar — the
 *   standard way to build one — is made of buttons at `tabindex="-1"`; a date field puts
 *   `tabindex="0"` on a container the browser skips in favour of a span inside it; a hidden
 *   wrapper carries a `tabindex` and is no stop at all. Counted in one dialog: twenty-one elements
 *   matched a careful selector where the browser stopped seven times. Filters fix individual cases
 *   and the next component library invents another.
 * - **A press inside an `<iframe>` is invisible.** A rich-text editor is a separate document, so a
 *   `keydown` listener here never hears the press that takes focus out of it.
 *
 * A marker needs neither. The browser walks past the end of the content and lands on it, which
 * *is* the boundary — no list, no prediction, and it works the same whether the last thing inside
 * was a button or a frame.
 *
 * **Where focus came from decides where it goes**, which is what lets the same two markers serve
 * containment and entry. `relatedTarget` inside the dialog means the user tabbed off the end, so
 * focus wraps to the other end. From outside — `showModal()`'s own opening focus, or a Tab
 * arriving from the page — it means they are coming *in*, and focus goes to the near end instead.
 * Without that distinction a modal dialog would open with its last control focused.
 *
 * **One press the markers cannot see**, and it is the ordinary one: a click on the panel's empty
 * space leaves focus on the `<dialog>` itself, from where Tab may skip the whole subtree. That
 * single case is answered by a `keydown` on the element, and only when it is the element's own.
 *
 * Nothing is rendered: the markers are zero-sized, carry no text and no role, and are removed on
 * teardown. A binding calls this and passes nothing but the flag.
 *
 * @internal Not part of the public API.
 */

/** A focusable marker that occupies nothing and shows nothing. */
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
  ctx: ModalDomContext,
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
  // Clicking a panel's empty space — the area under the last button, a paragraph, a footer's
  // leftover room — focuses the nearest *click-focusable* ancestor, and an open `<dialog>` is one
  // even though it takes no `tabindex` and refuses `focus()` from script. From there the engines
  // disagree: Chromium and Firefox descend into the subtree, **WebKit does not** and swallows the
  // press, leaving the keyboard on the element with nothing but the mouse to recover it.
  //
  // **Unconditional, and that is the point.** This used to sit behind `containFocus`, which made
  // an ordinary click cost the keyboard on WebKit in every dialog that had not opted in — modal
  // ones included, where the option looks irrelevant. Nothing here traps anybody: it answers a
  // press that two engines already answer this way, so what it removes is a disagreement rather
  // than a choice.
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
  // This half is what `containFocus` buys, and it is the half worth choosing: on a toast or a
  // popover, keeping Tab inside is the defect rather than the fix. A modal dialog is wrapped by
  // the top layer already, so the markers are redundant there — harmless, and not what the option
  // is for.
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
