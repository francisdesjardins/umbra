import { queryAllOwn, queryOwn } from '../utils/dialog-scope.js';
import { preferredRestoreTarget } from '../utils/focus-restore-policy.js';

/**
 * Where a dialog's focus goes, as plain DOM functions — a binding decides *when* to ask, the
 * answers are the same in every framework. The decisions they act on are
 * `utils/focus-restore-policy.ts`, which is the half that needs no browser.
 *
 * Every read of who holds focus goes through {@link activeWithin}: asking the `document` is wrong
 * inside a shadow root, so a focus function living elsewhere is that question waiting to be asked
 * the wrong way.
 */

/** The marker an action sets with `focusOnOpen` — see `ActionButtonProps`. */
const FOCUS_ON_OPEN_SELECTOR = '[data-focus-on-open]';

/**
 * The button an action declared, found by the action's reason.
 *
 * The restore's second answer, and the only one that survives a renderer replacing the node: a
 * captured element goes stale, the reason does not. Scoped with `queryOwn` like every other lookup
 * here, so a nested dialog's identically-named action is never the answer. `CSS.escape` because the
 * reason is the caller's string.
 *
 * @internal
 */
export function findActionButton(dialog: HTMLElement, reason: string): HTMLElement | null {
  return queryOwn(dialog, `[data-action-reason="${CSS.escape(reason)}"]`);
}

/**
 * Focus, and show the ring, for every move the library makes on the user's behalf: modality would
 * otherwise hide it, and the post-action restore needs it, the browser having blurred the disabled
 * button long before the settle.
 *
 * **The flag draws it, and it is younger than the floor** — Chrome 145, Safari 18.4. It answers
 * what the heuristic cannot: whether a move the page made matters. Below it a pointer-opened dialog
 * rings on WebKit alone; the matrix's `enhancing` row has the measurements.
 *
 * Three exceptions, each for its own reason: `clickHotkeyButton` (keydown modality already rings),
 * `restoreFocus`'s last-resort `dialog.focus()` (the element takes no ring), and
 * `restoreOpenerFocus`'s caret branch — a caret the reader placed is their state, so it is silent.
 *
 * @internal
 */
export const SHOW_THE_RING: FocusOptions = { focusVisible: true };

/**
 * Everything Tab can stop on, in document order. The scan forgives a false positive (one wasted
 * step) but never tries a kind this list omits, so it errs wide. Private on purpose: one source,
 * so a configurable set stays openable without a refactor.
 */
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]:not([contenteditable="false"])',
  'audio[controls]',
  'video[controls]',
  'summary',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Marks the containment markers so the scan never mistakes one for content. Set by
 * `attach-focus-containment.ts`, read here — which is the only reason it lives in this file.
 *
 * @internal
 */
export const FOCUS_GUARD_ATTRIBUTE = 'data-dialog-focus-guard';

/**
 * Move focus to the first candidate that actually takes it, scanning from whichever end the
 * caller names.
 *
 * Asked rather than computed: a candidate that cannot hold focus simply fails to take it and the
 * scan moves on, so a wrong guess costs a step instead of the keyboard. Confirmed through
 * {@link activeWithin} (a shadow root answers the document with its *host*, failing a candidate
 * that took focus perfectly well) over `queryAllOwn`'s candidates — reversed, a nested dialog's
 * controls come first, and `Shift+Tab` handed focus to a panel inside this one.
 *
 * @returns Whether anything took it — a dialog with nothing focusable must not swallow the key.
 * @internal
 */
export function focusFirstAvailable(dialog: HTMLDialogElement, fromEnd: boolean): boolean {
  const candidates = queryAllOwn(dialog, FOCUSABLE).filter((element) => {
    return element.getAttribute(FOCUS_GUARD_ATTRIBUTE) === null;
  });
  if (fromEnd) {
    candidates.reverse();
  }

  for (const candidate of candidates) {
    // The library picked this one, so it announces itself — see {@link SHOW_THE_RING}.
    candidate.focus(SHOW_THE_RING);
    if (activeWithin(dialog) === candidate) {
      return true;
    }
  }
  return false;
}

/**
 * Move focus one step through the dialog's own controls, wrapping at either end.
 *
 * The scan a device that is not a keyboard has no other way to ask for: `queryAllOwn` scopes it to
 * this dialog, so a nested one's controls are never the answer, and the containment markers are
 * excluded like they are for the opening focus. Verified per candidate rather than computed, for
 * {@link focusFirstAvailable}'s reason — a candidate that refuses focus costs a step.
 *
 * @returns Whether anything took it; `false` on a dialog with nothing focusable in it.
 * @internal
 */
export function focusStep(dialog: HTMLDialogElement, forwards: boolean): boolean {
  const candidates = queryAllOwn(dialog, FOCUSABLE).filter((element) => {
    return element.getAttribute(FOCUS_GUARD_ATTRIBUTE) === null;
  });
  const { length } = candidates;
  if (length === 0) {
    return false;
  }

  const active = activeWithin(dialog);
  const from = active instanceof HTMLElement ? candidates.indexOf(active) : -1;

  // Nothing inside holds it, so there is no step to take from anywhere — the end the caller is
  // walking towards is the answer.
  if (from === -1) {
    return focusFirstAvailable(dialog, !forwards);
  }

  const step = forwards ? 1 : -1;
  for (let taken = 1; taken <= length; taken += 1) {
    const candidate = candidates[(((from + taken * step) % length) + length) % length];
    candidate?.focus(SHOW_THE_RING);
    if (activeWithin(dialog) === candidate) {
      return true;
    }
  }
  return false;
}

/**
 * Who holds focus, **as this dialog's own tree sees it**.
 *
 * `document.activeElement` is the wrong question for a dialog inside a shadow root: it answers
 * with the *host* element, and `dialog.contains(host)` is false, so every check below silently
 * concluded that focus had left the dialog. The visible cost was a dialog in a web component
 * putting focus on itself after a failed action instead of back on the button that ran it —
 * the retry is under that hand, and the docs promise it.
 *
 * `getRootNode()` returns the `Document` for an ordinary dialog and the `ShadowRoot` for one in a
 * component, and both answer `activeElement` about their own tree. Nested roots resolve to the
 * nearest one, which is the granularity `dialog.contains()` needs.
 */
export function activeWithin(dialog: HTMLElement): Element | null {
  const root = dialog.getRootNode();
  return root instanceof ShadowRoot || root instanceof Document ? root.activeElement : null;
}

/**
 * Who holds focus **inside** the dialog's content. `contains` is reflexive, so the dialog element
 * is excluded by hand — a truthy wrong answer there satisfies every check the caller makes next.
 *
 * @internal
 */
function focusInside(dialog: HTMLElement): HTMLElement | null {
  const active = activeWithin(dialog);
  return active instanceof HTMLElement && active !== dialog && dialog.contains(active)
    ? active
    : null;
}

/**
 * Hand the opening focus to the action that asked for it, and report where focus actually is.
 *
 * Scoped to the dialog's own content: a dialog opened from inside this one renders its
 * `<dialog>` in this subtree, and its buttons are not ours to focus.
 *
 * @returns the element now holding focus inside the dialog, or `null` if focus is elsewhere —
 *   which is ordinary, since `showModal()` focuses the dialog itself when nothing inside it can
 *   take focus.
 * @internal
 */
export function settleOpeningFocus(dialog: HTMLDialogElement): HTMLElement | null {
  // The claim, or whatever `showModal()`'s focusing steps already picked — only the first moves
  // focus, the second is re-taken purely so it is visible.
  const target = queryOwn(dialog, FOCUS_ON_OPEN_SELECTOR) ?? focusInside(dialog);
  if (target !== null) {
    // Two halves: the blur makes the re-focus take at all (refocusing an already-focused element
    // is a no-op), and the flag draws the ring. Dropped only where the ring is missing.
    if (activeWithin(dialog) === target && !target.matches(':focus-visible')) {
      target.blur();
    }
    target.focus(SHOW_THE_RING);
  }
  return focusInside(dialog);
}

/**
 * Take back the focus the stack moving took from this dialog.
 *
 * Unlike {@link settleOpeningFocus} this always acts: the focus was pulled away, so merely
 * reading it back would leave the keyboard on `<body>`. `preferred` comes first and is the
 * difference between taking focus back and moving it — re-honouring `focusOnOpen` over a caret
 * the user left in a field is a second theft dressed as a repair. The claim is the floor under
 * it, the first focusable the floor under that.
 *
 * @returns the element now holding focus inside the dialog, or `null` — same contract as
 *   {@link settleOpeningFocus}.
 * @internal
 */
export function reclaimFocus(
  dialog: HTMLDialogElement,
  preferred: HTMLElement | null
): HTMLElement | null {
  restoreFocus(dialog, preferredRestoreTarget(preferred, queryOwn(dialog, FOCUS_ON_OPEN_SELECTOR)));

  // The floor, and this path alone: `restoreFocus` ends at `dialog.focus()`, which an open
  // `<dialog>` refuses. Not in `restoreFocus` itself — there, focus on the dialog is what WebKit
  // produces on a click, and moving it would take the keyboard off the button the retry belongs to.
  if (focusInside(dialog) === null) {
    focusFirstAvailable(dialog, false);
  }

  return focusInside(dialog);
}

/**
 * Who is standing on the action that is starting.
 *
 * Read at the moment the engine reports `isRunning`, which is the one instant it can be read:
 * the button is still enabled and still holds focus. A frame later it is `disabled` and focus
 * has fallen to `<body>`.
 *
 * @internal
 */
export function captureActionRunner(dialog: HTMLDialogElement | null): HTMLElement | null {
  // `focusInside` excludes the dialog itself: it can never be standing on an action, and letting
  // it through is a *truthy* wrong answer that skips every fallback behind it. Surfaces on WebKit,
  // which focuses the dialog rather than the button on a click.
  return dialog === null ? null : focusInside(dialog);
}

/**
 * Put focus back inside the dialog, verifying rather than assuming.
 *
 * Focusing a `disabled` element is a silent no-op and focus on `<body>` is a dialog with no
 * keyboard (its keydown listener only hears keys raised inside it), so the preferred target is
 * tried, then checked, with the dialog itself as the floor.
 *
 * @internal
 */
export function restoreFocus(dialog: HTMLDialogElement, preferred: HTMLElement | null): void {
  (preferred ?? dialog).focus(SHOW_THE_RING);
  if (!dialog.contains(activeWithin(dialog))) {
    dialog.focus();
  }
}
