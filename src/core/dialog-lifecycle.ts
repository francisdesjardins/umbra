/**
 * Framework-agnostic native-`<dialog>` DOM orchestration.
 *
 * These functions operate directly on a `<dialog>` element and know nothing about a store or a
 * phase — `attach-lifecycle.ts` is what wires them to store transitions. The split is what keeps
 * the DOM logic testable in isolation and usable from a binding that owns its own element.
 *
 * Everything here is a `run*`/`show*` verb: it does the thing it names, immediately. The
 * phase-driven decisions of whether to do it at all are `sync*`, next door.
 */

import { ensureDialogStyles, styleRootOf } from './dialog-styles.js';

/**
 * Per-element cache for transition-disabled detection, so the closing path never triggers a
 * synchronous `getComputedStyle` reflow at close time. A `WeakMap` lets the entry be GC'd with
 * the element.
 *
 * The entry is per *open*, not per element: a `<dialog>` outlives every open/close cycle, and
 * whether transitions are live can change between them — a stylesheet toggled by a user
 * setting, a `prefers-reduced-motion` change, a theme swap. Caching for the element's lifetime
 * makes the close path act on the first open's answer forever.
 */
const transitionsDisabledCache = new WeakMap<HTMLDialogElement, boolean>();

/**
 * Measure whether CSS transitions are effectively disabled on `dialog` (e.g.
 * `transition: none !important`) and cache the answer for {@link checkTransitionsDisabled}.
 *
 * Called once per open, while the dialog is already `'open'` — the reflow it costs is paid
 * outside the closing sequence, which is the point of caching at all.
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
 * Open the dialog in the requested mode and stamp its stacking z-index.
 *
 * @param nonModal - `dialog.show()` (normal flow, no top layer) vs `dialog.showModal()` (top layer).
 * @param zIndex - resolved z-index; also mirrored onto `data-modal-z` for debugging.
 */
export function showDialog(
  dialog: HTMLDialogElement,
  { nonModal, zIndex }: { nonModal: boolean; zIndex: number }
): void {
  // Here rather than only at the manager, because the document is not the only root that needs
  // the sheet: `adoptedStyleSheets` does not cross a shadow boundary, so a dialog inside a web
  // component would show the UA's backdrop instead of this library's. This is the one place that
  // knows which root a given dialog is in, and adoption is idempotent per root.
  const styleRoot = styleRootOf(dialog);
  if (styleRoot) {
    ensureDialogStyles(styleRoot);
  }

  if (nonModal) {
    dialog.show();
  } else {
    dialog.showModal();
  }
  stampZIndex(dialog, zIndex);
}

/**
 * Write the stacking z-index onto a dialog, mirrored onto `data-modal-z` for debugging.
 *
 * Its own function because the stamp outlives the show: a stack policy can reorder dialogs that are
 * already open, and for a **non-modal** one — never in the top layer, so ordered by nothing else —
 * this is the whole of what moving it means.
 */
export function stampZIndex(dialog: HTMLElement, zIndex: number): void {
  dialog.style.zIndex = String(zIndex);
  dialog.dataset['modalZ'] = String(zIndex);
}

/**
 * The innermost focused element, following shadow boundaries down.
 *
 * `document.activeElement` answers with the *host* when focus is inside a shadow tree, and this
 * library supports a dialog in one — so without the walk, a raise inside a web component would
 * conclude that focus was on some custom element and put it back there.
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
    // Out of a shadow tree and on through its host — `contains` stops at the boundary, and a
    // dialog holding a web component with its own focusable content is not an edge case.
    node = parent instanceof ShadowRoot ? parent.host : parent;
  }
  return false;
}

/**
 * Lift an already-open modal dialog to the front of the top layer.
 *
 * Close-and-re-show is not a shortcut, it is the only mechanism: the platform paints top-layer
 * elements in the order they were added, and `z-index` does not apply between them — a dialog
 * stamped `z-index: 9999` still paints under one shown after it. So there is no way to move a
 * dialog within the top layer other than taking it out and putting it back.
 *
 * Three consequences a caller should know about, none of them avoidable:
 *
 * - **The element's native `close` event still fires.** `close()` queues it, so it arrives after
 *   the dialog is open again and `dialog.open` is `true` when it does — which is the guard for a
 *   listener that has to tell a raise from a real close. The library's own close reporting is
 *   driven by the store and is not involved. It matters most in `umbra/vanilla`, where the
 *   `<dialog>` and any listener on it are the caller's.
 * - **Focus is restored only when this dialog had it.** `showModal()` runs the focusing steps and
 *   would otherwise steal focus from the dialog above; when the raise is part of a reorder, the
 *   dialog that ends up on top is the one that should hold focus, and it is raised last.
 * - **CSS keyed on the element being shown re-runs** — `@starting-style`, a
 *   `dialog[open] { animation }`. The library's own entrance is driven by phase rather than by
 *   `[open]`, so it is unaffected.
 *
 * @returns `false` when there was nothing to lift, so a caller can skip its own bookkeeping.
 */
export function raiseDialog(dialog: HTMLDialogElement): boolean {
  if (!dialog.open) {
    return false;
  }

  const active = deepActiveElement(dialog.ownerDocument);
  const holdsFocus = active !== null && containsAcrossRoots(dialog, active);

  dialog.close();
  dialog.showModal();

  if (holdsFocus && active instanceof HTMLElement && active.isConnected) {
    active.focus();
  }
  return true;
}

/**
 * Drive the exit animation of an open, transitioning dialog and invoke `onFinish` exactly
 * once when it completes — via `transitionend` on the primary property, or a safety timeout
 * if that never fires. Also animates the `::backdrop` opacity out in sync (modal only, since
 * a non-modal dialog has no backdrop). Returns a teardown that removes the listener, clears
 * the timer, and cancels the backdrop animation.
 *
 * Idempotency of `onFinish` is the caller's responsibility (both the `transitionend` and the
 * timeout call it) — {@link runCloseSequence} is what guards it.
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

  // Safety timeout: finalize if `transitionend` never fires.
  //
  // It is armed here and **re-armed from `transitionstart`**, because those are two different
  // clocks. This runs when the exit style is written; the transition begins at the style
  // recalculation that follows, and on a busy page that gap is not a rounding error — measured in
  // a real application, 245 ms between the two while the exit itself lasts 200. The timer then
  // expires as the slide is starting and cuts it, intermittently, which reads as a jitter rather
  // than as a timeout. Re-arming puts both on the transition's own clock.
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
 * The whole exit, decided and driven: which of three ways this dialog ends, and finishing exactly
 * once whichever it was.
 *
 * Framework-free because none of the decision is React's. A binding knows *when* a modal entered
 * `'closing'`; what happens next is a property of `<dialog>` and of the animation the caller
 * declared, and a second binding should inherit it rather than re-derive three branches and a
 * double-fire guard from scratch.
 *
 * The three ways, in the order they are checked:
 *
 * 1. **The browser already closed it** — the ESC cancel race. There is no animation left to wait
 *    for, so finalizing immediately is the only correct answer; waiting would hang the close.
 * 2. **Transitions are off** (`transition: none`, a test harness, `prefers-reduced-motion`
 *    handled in user land). `transitionend` will never fire, so waiting for it would hang too.
 * 3. **Otherwise**, run the exit and finalize when it reports done — or when the safety timeout
 *    does, whichever comes first, which is why the guard exists.
 *
 * @returns A teardown for case 3, and `undefined` when the close already finished.
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
