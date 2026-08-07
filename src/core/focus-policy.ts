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
  const active = document.activeElement;
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
  const active = document.activeElement;
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
  if (!dialog.contains(document.activeElement)) {
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
