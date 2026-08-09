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
  if (nonModal) {
    dialog.show();
  } else {
    dialog.showModal();
  }
  dialog.style.zIndex = String(zIndex);
  dialog.dataset['modalZ'] = String(zIndex);
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
  const fallbackTimer = setTimeout(() => {
    onFallbackTimeout?.();
    onFinish();
  }, exitDuration + 50);

  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.target !== dialog || e.propertyName !== primaryProperty) {
      return;
    }
    clearTimeout(fallbackTimer);
    onFinish();
  };

  dialog.addEventListener('transitionend', handleTransitionEnd);
  return () => {
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
