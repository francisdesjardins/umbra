import { queryAllOwn, queryOwn } from '../utils/dialog-scope.js';

/**
 * Where a dialog's focus goes, as plain DOM functions.
 *
 * None of this needs React: it is four questions about a `<dialog>` element — who claimed the
 * opening focus, where focus landed, who was standing on the action that just ran, and how to
 * put focus back. A binding decides *when* to ask them; the answers are the same in every
 * framework, and a second binding that re-derived them would drift from this one.
 *
 * **Every read of who holds focus goes through {@link activeWithin}**, which is why the scan below
 * lives here rather than beside the containment that calls it: asking the `document` is wrong
 * inside a shadow root, and a focus function in another file is that question waiting to be asked
 * the wrong way.
 */

/** The marker an action sets with `focusOnOpen` — see `ActionButtonProps`. */
const FOCUS_ON_OPEN_SELECTOR = '[data-focus-on-open]';

/**
 * Focus, **and say so on screen** — for the moves the library makes on the user's behalf.
 *
 * `:focus-visible` follows input modality, and a dialog opened by a mouse click inherits "pointer"
 * from that click. Measured on all three engines: a plain `focus()` after a click on a trigger
 * draws no ring on Chromium or Firefox, and one on WebKit. So a caller who declares `focusOnOpen`
 * gets an invisible focus on two engines out of three, and the same dialog reopened after any key
 * press looks different — which is the platform being consistent with itself and inconsistent to a
 * user.
 *
 * `focusVisible: true` overrides the heuristic, and does so on all three.
 *
 * **The restore after an action needs it for the same reason**, which is not obvious: the button
 * is `disabled` while its action runs, the browser blurs a disabled element, and focus is on
 * `<body>` by the time the action settles. So putting it back is a move the library makes from
 * nowhere — not a continuation of the click, which ended several hundred milliseconds earlier.
 * Without the ring a failed action reads as a dialog that lost the keyboard, and the retry the
 * docs promise is under a hand that cannot see it.
 *
 * **Where it does *not* belong**, so the next reader does not add it for symmetry: a hotkey's
 * `clickHotkeyButton` runs from a keydown, so the modality is already keyboard and this is a
 * no-op; and `restoreFocus`'s last-resort `dialog.focus()` targets the element, which takes no
 * ring at all.
 *
 * @internal
 */
export const SHOW_THE_RING: FocusOptions = { focusVisible: true };

/**
 * Everything Tab can stop on, in document order — the same set the browser walks.
 *
 * The scan below forgives a false positive (a candidate that refuses focus costs one step), but a
 * kind this list does not name is never tried at all — a dialog whose only stop was a
 * `contenteditable` editor had no recovery, no wrap destination and no reclaim floor, which is why
 * the list errs wide. Kept private on purpose: one source, no userland override, so the door to a
 * configurable set stays openable without a refactor.
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
 * Marks the containment markers, so they are never mistaken for content to send focus to. Set by
 * `attach-focus-containment.ts` and read by the scan below, which is the only reason it is here.
 *
 * @internal
 */
export const FOCUS_GUARD_ATTRIBUTE = 'data-dialog-focus-guard';

/**
 * Move focus to the first candidate that actually takes it, scanning from whichever end the
 * caller names.
 *
 * **Asked rather than computed**, which is the other half of not predicting the tab order: a
 * candidate that matches the selector but cannot hold focus — a container whose child is the real
 * stop, an element the browser skips — simply fails to take focus, and the scan moves on. So a
 * wrong guess costs a step instead of losing the keyboard.
 *
 * **The confirmation is `activeWithin`, not the document.** A shadow root answers the document
 * with its *host*, so a candidate that took focus perfectly well failed the check: the scan walked
 * the whole list, left the dialog on its **last** control instead of its first, and reported that
 * nothing had taken it — which the Tab recovery reads as "do not swallow the key", so the press
 * was then processed from wherever the scan had dumped focus.
 *
 * **The candidates are `queryAllOwn`'s, not a plain `querySelectorAll`'s.** A modal opened from
 * inside this one renders its `<dialog>` in this subtree — the documented shape, since the top
 * layer leaves no other way to open a second dialog — so an unscoped scan collects that dialog's
 * controls too. Reversed, they come *first*: measured on all three engines, `Shift+Tab` on this
 * dialog's element handed focus to a button belonging to a panel nested inside it.
 *
 * @returns Whether anything took it. The caller needs the answer before it swallows a key: a
 *   dialog with nothing focusable in it would otherwise be a `preventDefault` and no move, which
 *   is a Tab that does nothing for as long as the dialog is open.
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
    // The library picked this one, so it announces itself — see {@link SHOW_THE_RING}. Under the
    // Tab recovery the modality is already keyboard and this changes nothing; under the reclaim
    // floor it is the difference between a dialog that has the keyboard and one that looks it.
    candidate.focus(SHOW_THE_RING);
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
 * Who holds focus **inside** the dialog's content, which is the question every caller here was
 * spelling out for itself.
 *
 * `contains` is reflexive, so the dialog element is the one member of its own subtree that has to
 * be excluded by hand — and a truthy wrong answer there is worse than a miss, because it satisfies
 * every check the caller makes next. Stated once so the exclusion cannot be remembered in two
 * places and forgotten in a third.
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
 * Scoped to the dialog's own content: a modal opened from inside this one renders its
 * `<dialog>` in this subtree, and its buttons are not ours to focus.
 *
 * @returns the element now holding focus inside the dialog, or `null` if focus is elsewhere —
 *   which is ordinary, since `showModal()` focuses the dialog itself when nothing inside it can
 *   take focus.
 * @internal
 */
export function settleOpeningFocus(dialog: HTMLDialogElement): HTMLElement | null {
  // Whoever is going to hold it: the claim if there is one, otherwise whatever `showModal()`'s
  // own focusing steps already picked. **Only the first of those moves focus** — the second is
  // the element that already has it, and is re-taken purely so it is visible.
  const target = queryOwn(dialog, FOCUS_ON_OPEN_SELECTOR) ?? focusInside(dialog);
  if (target !== null) {
    // Refocusing an element that already has focus is a no-op on all three engines, flags
    // included, so dropping focus first is what makes the ring appear. Done only when it buys
    // one: never when a ring is already showing, never when focus is somewhere else.
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
 * gets, the case a dialog declining its opening focus leaves behind — and the dialog's first
 * focusable is the floor under that, enough for its own keydown listener to hear a press.
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

  // **The floor, and it belongs to this path alone.** `restoreFocus` ends at `dialog.focus()`,
  // which an open `<dialog>` refuses — so a dialog with nothing to prefer and no `focusOnOpen`
  // claim was left with the keyboard on `<body>`, on screen and unreachable.
  //
  // Not in `restoreFocus`, which also serves the restore after an action. There, focus landing on
  // the dialog is an outcome WebKit produces on purpose — it focuses the dialog rather than the
  // button on a click — and moving it to the first focusable would take the keyboard off the
  // button the user just pressed, which is the one place the retry belongs.
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
  // The dialog itself is the one element inside its own subtree that can never be standing on an
  // action, and letting it through is not a near-miss: it is a *truthy* wrong answer, so every
  // fallback behind it is skipped and the restore puts focus back on the dialog — which is where
  // it already was. WebKit is where this surfaces, because it focuses the dialog rather than the
  // button when a button is clicked; the same read is correct by luck elsewhere. `focusInside`
  // owns that exclusion.
  return dialog === null ? null : focusInside(dialog);
}

/**
 * Put focus back inside the dialog, verifying rather than assuming.
 *
 * Focusing a `disabled` element is a silent no-op, and focus left on `<body>` is a modal with no
 * keyboard — the dialog's keydown listener only hears keys raised inside it, so its hotkeys go
 * dead. So the preferred target is tried, then checked, and the dialog itself is the floor —
 * which is where WebKit puts it after a click anyway, and where the action restore wants it.
 *
 * @internal
 */
export function restoreFocus(dialog: HTMLDialogElement, preferred: HTMLElement | null): void {
  (preferred ?? dialog).focus(SHOW_THE_RING);
  if (!dialog.contains(activeWithin(dialog))) {
    dialog.focus();
  }
}

/**
 * The target a settled action should return focus to: whoever ran it, or the opening focus as
 * the floor. A runner that has left the DOM (its button re-rendered away) is not a target.
 *
 * Generic over `{ isConnected }` rather than `HTMLElement`: that member is the whole of what it
 * reads, so the decision is a unit test rather than a browser one.
 *
 * @internal
 */
export function preferredRestoreTarget<T extends { isConnected: boolean }>(
  runner: T | null,
  openingFocus: T | null
): T | null {
  return runner?.isConnected === true ? runner : openingFocus;
}

/**
 * Who ran the action, chosen from the candidates in order of how specific each answer is.
 *
 * **The ordering is the policy, which is why it is a named function rather than a `??` chain.** A
 * candidate that is wrong but *truthy* silently disables every fallback behind it, and only an
 * engine that disagrees surfaces that — WebKit does not focus a `<button>` on click.
 *
 * Callers pass, in order: who holds focus, who was last activated, who held focus last. The first
 * two can each be absent on a given engine and the third is the floor.
 *
 * **A disconnected candidate is skipped rather than accepted**, at every position — checking only
 * the winner drops past a live candidate sitting right behind a dead one.
 *
 * Generic over `{ isConnected }` so the ordering is a unit test rather than a browser one.
 *
 * @internal
 */
export function chooseActionRunner<T extends { isConnected: boolean }>(
  ...candidates: readonly (T | null | undefined)[]
): T | null {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && candidate.isConnected) {
      return candidate;
    }
  }
  return null;
}
