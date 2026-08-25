/**
 * Framework-agnostic native-`<dialog>` DOM orchestration.
 *
 * These act on a `<dialog>` element and know nothing about a store or a phase —
 * `attach-lifecycle.ts` wires them to store transitions, which keeps the DOM logic testable in
 * isolation. Everything here is a `run*`/`show*` verb: it does the thing it names, immediately;
 * the phase-driven decision of whether to do it at all is `sync*`, next door.
 */

import { ensureDialogStyles, styleRootOf } from './dialog-styles.js';
import { SHOW_THE_RING } from './focus-policy.js';

/**
 * Transition-disabled detection, cached so the closing path never forces a synchronous reflow.
 * Refreshed per *open* rather than per element: a `<dialog>` outlives every cycle and whether
 * transitions are live can change between them (a theme swap, a `prefers-reduced-motion` change).
 */
const transitionsDisabledCache = new WeakMap<HTMLDialogElement, boolean>();

/**
 * Measure whether transitions are effectively disabled (e.g. `transition: none !important`) and
 * cache it for {@link checkTransitionsDisabled}. Called once per open, so the reflow it costs is
 * paid outside the closing sequence.
 */
export function refreshTransitionsDisabled(dialog: HTMLDialogElement): boolean {
  const duration = getComputedStyle(dialog).transitionDuration;
  const disabled = duration === '0s' || duration === '0ms';
  transitionsDisabledCache.set(dialog, disabled);
  return disabled;
}

/**
 * Returns `true` when CSS transitions are effectively disabled on `dialog`, as measured by the
 * most recent {@link refreshTransitionsDisabled}. Measures on the spot if the element has never
 * been refreshed, so a caller reaching here first is still correct — only slower.
 */
export function checkTransitionsDisabled(dialog: HTMLDialogElement): boolean {
  return transitionsDisabledCache.get(dialog) ?? refreshTransitionsDisabled(dialog);
}

/**
 * Who held the keyboard when each dialog was shown, remembered because the platform's own restore
 * has a condition that can be lost: the close-the-dialog steps return focus for `show()` as well
 * as `showModal()` — measured on all three engines — but only when focus is still inside at
 * `close()` time, and an action-driven close leaves it on `<body>` (Chromium blurs the disabled
 * button). Per open, like {@link transitionsDisabledCache}.
 */
const openerFocus = new WeakMap<HTMLDialogElement, HTMLElement>();

/**
 * Open the dialog in the requested mode and stamp its stacking z-index.
 *
 * @param nonModal - `dialog.show()` (normal flow, no top layer) vs `dialog.showModal()` (top layer).
 * @param zIndex - resolved z-index; also mirrored onto `data-dialog-z` for debugging.
 */
export function showDialog(
  dialog: HTMLDialogElement,
  { nonModal, zIndex }: { nonModal: boolean; zIndex: number }
): void {
  // Here rather than at the manager: `adoptedStyleSheets` does not cross a shadow boundary, and
  // this is the one place that knows which root a dialog is in. Idempotent per root.
  const styleRoot = styleRootOf(dialog);
  if (styleRoot) {
    ensureDialogStyles(styleRoot);
  }

  // Before the show: the focusing steps run for `show()` too, so a read afterwards would already
  // find focus inside. `<body>` records as nothing — restoring to it is the failure to prevent.
  const opener = deepActiveElement(dialog.ownerDocument);
  if (opener instanceof HTMLElement && opener !== dialog.ownerDocument.body && opener !== dialog) {
    openerFocus.set(dialog, opener);
  } else {
    openerFocus.delete(dialog);
  }

  if (nonModal) {
    dialog.show();
  } else {
    dialog.showModal();
  }
  stampZIndex(dialog, zIndex);
}

/**
 * Give the keyboard back to whoever had it before the open — but only when the close left it on
 * nothing.
 *
 * The floor under the platform's own restore, not a replacement for it: when the close-the-dialog
 * steps already returned focus, or the user is somewhere real — typing in the page a non-modal
 * panel never blocked, holding a control in the dialog underneath — the read below finds a live
 * element and this does nothing. It acts on the one outcome that serves nobody: a close that
 * stranded the keyboard on `<body>`, which is what an action-driven close produces on Chromium
 * (see {@link openerFocus}) and what the APG's "focus returns to the invoker" exists to rule out.
 *
 * Visibly, like every focus move the library makes from nowhere — see `SHOW_THE_RING`.
 *
 * @internal
 */
export function restoreOpenerFocus(dialog: HTMLDialogElement): void {
  const opener = openerFocus.get(dialog);
  openerFocus.delete(dialog);
  if (!opener?.isConnected) {
    return;
  }

  const doc = dialog.ownerDocument;
  const active = deepActiveElement(doc);
  const stranded = active === null || active === doc.body || active === doc.documentElement;
  if (stranded) {
    opener.focus(SHOW_THE_RING);
  }
}

/**
 * Write the stacking z-index onto a dialog, mirrored onto `data-dialog-z` for debugging.
 *
 * Its own function because the stamp outlives the show: a policy can reorder open dialogs, and for
 * a non-modal one — never in the top layer — this is the whole of what moving it means.
 */
export function stampZIndex(dialog: HTMLElement, zIndex: number): void {
  dialog.style.zIndex = String(zIndex);
  dialog.dataset['dialogZ'] = String(zIndex);
}

/**
 * The innermost focused element, following shadow boundaries down: `document.activeElement`
 * answers with the *host*, so a raise inside a web component would restore focus to the host.
 */
function deepActiveElement(root: DocumentOrShadowRoot): Element | null {
  const active = root.activeElement;
  if (active?.shadowRoot) {
    return deepActiveElement(active.shadowRoot);
  }
  return active;
}

/** Whether `element` is inside `dialog`, counting through shadow boundaries. */
function containsAcrossRoots(dialog: HTMLDialogElement, element: Element): boolean {
  let node: Node | null = element;
  while (node) {
    if (node === dialog) {
      return true;
    }
    const parent: Node | null = node.parentNode;
    // On through the host: `contains` stops at the boundary.
    node = parent instanceof ShadowRoot ? parent.host : parent;
  }
  return false;
}

/**
 * Depth, not a boolean: nothing nests raises today, and a counter costs one character to make that
 * assumption stop mattering if a plan ever lifts one dialog from inside another's teardown.
 */
let raiseDepth = 0;

/**
 * Whether a {@link raiseDialog} round-trip is in progress — the window the focus coordinator reads.
 *
 * **Every focus move inside that window is the library's, not the user's**, and telling the two
 * apart is the whole problem: `close()` + `showModal()` makes the engine focus something, and the
 * `focusin` it fires is indistinguishable at the listener from a person clicking a field. Recording
 * it overwrites the memory that exists to put the caret back, which is why the dialog that was
 * *not* holding the keyboard used to come back on the engine's choice of control.
 *
 * **A plain synchronous flag is enough because focus events are synchronous**: `close()`,
 * `showModal()` and `focus()` dispatch `focusin` before they return, so every event this is meant
 * to cover is delivered inside the `try` below. Anything arriving later is somebody's actual doing
 * and must be recorded.
 *
 * @internal Not part of the public API.
 */
export function isRaisingDialog(): boolean {
  return raiseDepth > 0;
}

/**
 * Lift an already-open modal dialog to the front of the top layer.
 *
 * Close-and-re-show is the only mechanism: the platform paints top-layer elements in the order
 * they were added and `z-index` does not apply between them. Three unavoidable consequences:
 *
 * - **The native `close` event still fires**, queued, so it arrives with `dialog.open` back to
 *   `true` — the only guard a listener has for telling a raise from a real close. Matters most in
 *   `umbra/vanilla`, where the listener is the caller's.
 * - **Focus is restored only when this dialog had it**, which mostly means a policy installed
 *   *late*: the first plan lifts every dialog bottom-first, and the bottom one has been up longest
 *   and is often the one being typed in. `stack-priority.ct.tsx` pins the caret. A dialog that did
 *   *not* hold it is put back in front by `showModal()`, which focuses whatever the engine picks —
 *   the case {@link isRaisingDialog} exists for, since only the coordinator knows where the user
 *   actually was inside it.
 * - **CSS keyed on `[open]` re-runs** — `@starting-style`, `dialog[open] { animation }`. The
 *   library's own entrance is phase-driven and unaffected.
 *
 * @returns `false` when there was nothing to lift.
 */
export function raiseDialog(dialog: HTMLDialogElement): boolean {
  if (!dialog.open) {
    return false;
  }

  const active = deepActiveElement(dialog.ownerDocument);
  const holdsFocus = active !== null && containsAcrossRoots(dialog, active);

  raiseDepth += 1;
  try {
    dialog.close();
    dialog.showModal();

    if (holdsFocus && active instanceof HTMLElement && active.isConnected) {
      // Visibly: `showModal()` above has just taken the keyboard, so this is a restore from
      // nowhere — a button would otherwise come back silently.
      active.focus(SHOW_THE_RING);
    }
  } finally {
    raiseDepth -= 1;
  }
  return true;
}

/**
 * Drive the exit animation and call `onFinish` when it completes — via `transitionend` on the
 * primary property, or the safety timeout if that never fires — animating the `::backdrop` out in
 * sync (modal only). Returns a teardown for the listeners, the timer and the animation.
 *
 * Both paths call `onFinish`, so idempotency is the caller's: {@link runCloseSequence} guards it.
 */
export function runDialogExit(
  dialog: HTMLDialogElement,
  {
    nonModal,
    primaryProperty,
    exitDuration,
    onFinish,
    onFallbackTimeout,
  }: {
    nonModal: boolean;
    primaryProperty: string;
    exitDuration: number;
    onFinish: () => void;
    onFallbackTimeout?: () => void;
  }
): () => void {
  // Animate backdrop exit in sync with dialog content (non-modal has no backdrop).
  let backdropAnimation: Animation | undefined;
  if (!nonModal) {
    try {
      backdropAnimation = dialog.animate([{ opacity: 0 }], {
        duration: exitDuration,
        fill: 'none',
        pseudoElement: '::backdrop',
      });
    } catch {
      // Dialog may have been closed between the open check and this animate call.
    }
  }

  // Safety timeout, armed here and re-armed from `transitionstart`, because those are two clocks:
  // the style write and the recalculation that starts the transition were measured 245 ms apart on
  // a busy page against a 200 ms exit, so a single timer cut the slide as it began.
  let fallbackTimer = setTimeout(() => {
    onFallbackTimeout?.();
    onFinish();
  }, exitDuration + 50);

  const handleTransitionStart = (e: TransitionEvent) => {
    if (e.target !== dialog || e.propertyName !== primaryProperty) {
      return;
    }
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(() => {
      onFallbackTimeout?.();
      onFinish();
    }, exitDuration + 50);
  };

  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.target !== dialog || e.propertyName !== primaryProperty) {
      return;
    }
    clearTimeout(fallbackTimer);
    onFinish();
  };

  dialog.addEventListener('transitionstart', handleTransitionStart);
  dialog.addEventListener('transitionend', handleTransitionEnd);
  return () => {
    dialog.removeEventListener('transitionstart', handleTransitionStart);
    dialog.removeEventListener('transitionend', handleTransitionEnd);
    clearTimeout(fallbackTimer);
    backdropAnimation?.cancel();
  };
}

/**
 * The whole exit: which of three ways this dialog ends, finishing exactly once whichever it was.
 * A binding knows *when* a dialog entered `'closing'`; what happens next is a property of
 * `<dialog>` and the declared animation, so a second binding inherits it rather than re-deriving
 * three branches and a double-fire guard.
 *
 * 1. **The browser already closed it** — the ESC cancel race; nothing to wait for.
 * 2. **Transitions are off** (`transition: none`, a harness, `prefers-reduced-motion` in user
 *    land) — `transitionend` will never fire, so waiting would hang the close.
 * 3. **Otherwise** run the exit, finalizing on whichever of it or the timeout lands first.
 *
 * @returns A teardown for case 3, `undefined` when the close already finished.
 */
export function runCloseSequence(
  dialog: HTMLDialogElement,
  {
    nonModal,
    primaryProperty,
    exitDuration,
    finalize,
    log,
  }: {
    nonModal: boolean;
    primaryProperty: string;
    exitDuration: number;
    /** Close the dialog and settle the store. Called exactly once. */
    finalize: () => void;
    /** Told which way it went, for the debug log. */
    log?: (event: 'native' | 'no-transition' | 'animated' | 'fallback-timeout') => void;
  }
): (() => void) | undefined {
  let finished = false;
  const finishOnce = (how: 'native' | 'no-transition' | 'animated') => {
    if (finished) {
      return;
    }
    finished = true;
    log?.(how);
    finalize();
  };

  if (!dialog.open) {
    finishOnce('native');
    return undefined;
  }

  if (checkTransitionsDisabled(dialog)) {
    finishOnce('no-transition');
    return undefined;
  }

  return runDialogExit(dialog, {
    nonModal,
    primaryProperty,
    exitDuration,
    onFinish: () => {
      finishOnce('animated');
    },
    onFallbackTimeout: () => {
      log?.('fallback-timeout');
    },
  });
}
