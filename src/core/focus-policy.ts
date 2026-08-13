import { queryOwn } from '../utils/dialog-scope.js';

/**
 * Where a dialog's focus goes, as plain DOM functions.
 *
 * None of this needs React: it is four questions about a `<dialog>` element — who claimed the
 * opening focus, where focus landed, who was standing on the action that just ran, and how to
 * put focus back. A binding decides *when* to ask them; the answers are the same in every
 * framework, and a second binding that re-derived them would drift from this one.
 */

/** The marker an action sets with `focusOnOpen` — see `ActionButtonProps`. */
const FOCUS_ON_OPEN_SELECTOR = '[data-focus-on-open]';

/**
 * Who holds focus, **as this dialog's own tree sees it**.
 *
 * `document.activeElement` is the wrong question for a dialog inside a shadow root: it answers
 * with the *host* element, and `dialog.contains(host)` is false, so every check below silently
 * concluded that focus had left the dialog. The visible cost was a modal in a web component
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
 * Hand the opening focus to the action that asked for it, and report where focus actually is.
 *
 * Scoped to the dialog's own content: a modal opened from inside this one renders its
 * `<dialog>` in this subtree, and its buttons are not ours to focus.
 *
 * @returns the element now holding focus inside the dialog, or `null` if focus is elsewhere —
 *   which is ordinary, since `showModal()` focuses the dialog itself when nothing inside it can
 *   take focus.
 * @internal
 */
export function settleOpeningFocus(dialog: HTMLDialogElement): HTMLElement | null {
  const claimed = queryOwn(dialog, FOCUS_ON_OPEN_SELECTOR);
  claimed?.focus();
  const active = activeWithin(dialog);
  return active instanceof HTMLElement && active !== dialog && dialog.contains(active)
    ? active
    : null;
}

/**
 * Take back the focus the stack moving took from this dialog.
 *
 * Distinct from {@link settleOpeningFocus}, which only *acts* when the dialog claimed
 * `focusOnOpen` and merely reads otherwise: that is right for an opening, where the platform has
 * already put focus somewhere sensible, and wrong here, where the focus has been pulled away and
 * reading it back would leave the keyboard on `<body>`.
 *
 * **`preferred` comes first, and it is the difference between taking the focus back and moving
 * it.** A dialog that was already up had focus *somewhere* — a text field with a caret in it, the
 * button the user just pressed — and re-honouring `focusOnOpen` instead would be a second theft
 * dressed as a repair. So the caller passes what it remembers (`lastFocusInside`), the
 * `focusOnOpen` claim is the floor under it — which is what a dialog that never held focus at all
 * gets, the case a dialog declining its opening focus leaves behind — and the dialog itself is the
 * floor under that, enough for its own keydown listener to hear a press.
 *
 * @returns the element now holding focus inside the dialog, or `null` if focus is elsewhere — the
 *   same contract as {@link settleOpeningFocus}, so a caller can record it the same way.
 * @internal
 */
export function reclaimFocus(
  dialog: HTMLDialogElement,
  preferred: HTMLElement | null
): HTMLElement | null {
  restoreFocus(dialog, preferredRestoreTarget(preferred, queryOwn(dialog, FOCUS_ON_OPEN_SELECTOR)));
  const active = activeWithin(dialog);
  return active instanceof HTMLElement && active !== dialog && dialog.contains(active)
    ? active
    : null;
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
  const active = dialog === null ? null : activeWithin(dialog);
  return active instanceof HTMLElement && dialog?.contains(active) === true ? active : null;
}

/**
 * Put focus back inside the dialog, verifying rather than assuming.
 *
 * Focusing a `disabled` element is a silent no-op, and focus left on `<body>` is a modal with no
 * keyboard — the dialog's keydown listener only hears keys raised inside it, so its hotkeys go
 * dead. So the preferred target is tried, then checked, and the dialog itself is the floor.
 *
 * @internal
 */
export function restoreFocus(dialog: HTMLDialogElement, preferred: HTMLElement | null): void {
  (preferred ?? dialog).focus();
  if (!dialog.contains(activeWithin(dialog))) {
    dialog.focus();
  }
}

/**
 * The target a settled action should return focus to: whoever ran it, or the opening focus as
 * the floor. A runner that has left the DOM (its button re-rendered away) is not a target.
 *
 * @internal
 */
export function preferredRestoreTarget(
  runner: HTMLElement | null,
  openingFocus: HTMLElement | null
): HTMLElement | null {
  return runner?.isConnected === true ? runner : openingFocus;
}
