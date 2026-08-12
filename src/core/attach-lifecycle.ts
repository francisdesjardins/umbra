import { fireAndForget } from '../utils/fire-and-forget.js';
import { createLogger } from '../utils/logger.js';
import { findLabellingProblems } from './dialog-labelling.js';
import { refreshTransitionsDisabled, runCloseSequence, showDialog } from './dialog-lifecycle.js';
import { styleRootOf } from './dialog-styles.js';
import { finalizeModalClose } from './finalize-close.js';
import type {
  CloseSequenceOptions,
  LabellingDiagnosticsOptions,
  ModalDomContext,
  OpenSequenceOptions,
} from './attach-types.js';

const log = createLogger('modal:lifecycle');

/**
 * The `<dialog>` lifecycle, driven by phase — with no framework deciding what a phase is.
 *
 * The DOM operations themselves live in `dialog-lifecycle.ts`; the two functions here are the
 * sequencing between those and the store, and none of that is a renderer's. A binding calls
 * `syncOpenSequence` when it sees `'opening'` and `syncCloseSequence` on every other phase change.
 *
 * **`sync*` here, `run*` there**, and the prefix is the difference: a `sync*` function is handed a
 * phase and decides whether there is anything to do, so it is safe to call on every pass; a `run*`
 * function in `dialog-lifecycle.ts` does the thing it names, immediately, every time.
 */

/**
 * Show the dialog, schedule its entrance frame, and run `prepare`.
 *
 * A no-op unless the phase is `'opening'` and the element is not already open, which is what
 * makes it safe to call on every render of the opening phase — the guard, not a dependency list,
 * is what stops the work happening twice.
 */
export function syncOpenSequence(ctx: ModalDomContext, options: OpenSequenceOptions): void {
  const { store, getDialog, modalId, phase, manager } = ctx;
  const { prepare, nonModal } = options;

  if (phase !== 'opening') {
    return;
  }

  const dialog = getDialog();
  if (!dialog || dialog.open) {
    return;
  }

  log('Showing dialog', { id: modalId, nonModal });

  showDialog(dialog, { nonModal, zIndex: manager.getZIndex(modalId) });

  // The one moment the manager cannot see for itself: it observes *stores*, and a store reaching
  // `'opening'` is a dialog that has not been shown. So a stack policy would only get to reorder a
  // frame later — one painted frame with the wrong dialog in front. Here it is still the same task
  // as the `showModal()` above, so the reorder lands before anything is painted. A no-op unless
  // `prioritize` was called.
  manager.syncStackOrder(modalId);

  store.scheduleOpenTransition();

  if (prepare) {
    // The signal is the store's — it aborts on `close()`, which is a transition this sequence
    // does not own and should not be re-deriving from `phase`.
    const signal = store.prepareSignal();
    fireAndForget(
      async () => {
        await prepare(signal);
        log('prepare completed', { id: modalId });
      },
      (error) => {
        log.error('prepare failed', { id: modalId, error: error.message });
      },
      () => {
        store.finishPreparing();
      }
    );
  } else {
    store.finishPreparing();
  }
}

/**
 * Re-measure on `'open'`, run the exit and finalize on `'closing'`.
 *
 * The `'open'` pass re-measures the transition state on every open, so the closing path reads
 * *this* open's answer from the cache rather than the first one's — and reads it without a
 * reflow. The `'closing'` pass short-circuits when transitions are disabled, otherwise waits for
 * the exit (`transitionend` or the fallback timeout) before finalizing.
 *
 * @returns The teardown for the exit listeners, or `undefined` when nothing was attached.
 */
export function syncCloseSequence(
  ctx: ModalDomContext,
  options: CloseSequenceOptions
): (() => void) | undefined {
  const { store, getDialog, modalId, phase } = ctx;
  const { nonModal, primaryProperty, exitDuration } = options;

  const dialog = getDialog();
  if (!dialog) {
    return undefined;
  }

  if (phase === 'open') {
    refreshTransitionsDisabled(dialog);
    return undefined;
  }

  if (phase !== 'closing') {
    return undefined;
  }

  return runCloseSequence(dialog, {
    nonModal,
    primaryProperty: primaryProperty,
    exitDuration,
    finalize: () => {
      finalizeModalClose(store, dialog, (error) => {
        log.error('onClose callback failed', { id: modalId, error: error.message });
      });
    },
    log: (how) => {
      if (how === 'fallback-timeout') {
        log.warn('Animation fallback timeout', { id: modalId, exitDuration });
        return;
      }
      log('Close finished', { id: modalId, how });
    },
  });
}

/**
 * Dialogs already told about this open. Membership is dropped on `'closed'`, not left to the
 * element's lifetime: a `<dialog>` outlives every open/close cycle, so a per-element cache would
 * stay silent about the *next* open's broken content — the same trap `transitionsDisabledCache`
 * documents from the other side.
 */
const reported = new WeakSet<Element>();

/**
 * Say, once per open, when this dialog's labelling cannot do its job.
 *
 * The check that neither a type nor a linter can make: `aria-labelledby` is a string in one place
 * and an `id` on an element in another, and only the DOM knows whether they met. What it reports
 * is in {@link findLabellingProblems}; everything here is about asking at a moment when the answer
 * means something.
 *
 * **Not before `prepare` has settled**, because a name may legitimately point at a heading the
 * caller has not been able to render yet — a modal that shows a spinner while it loads is the
 * documented normal case, not an edge one, and a component test on two bindings pins that it stays
 * quiet there. That guard is the whole of the timing this needs: by the phase `'open'`, every
 * binding has committed its content, `ModalOutlet` included. That one was the suspect — it
 * registers its node from an effect, a commit behind — and it is not one, because the phase
 * reaches `'open'` on its own frame, after the outlet has rendered. Deferring a frame on top of
 * that was tried, measured against all three cases, and changed nothing; it is not here.
 */
export function syncLabellingDiagnostics(
  ctx: ModalDomContext,
  options: LabellingDiagnosticsOptions
): void {
  const { getDialog, modalId, phase } = ctx;

  const dialog = getDialog();
  if (!dialog) {
    return;
  }

  if (phase === 'closed') {
    reported.delete(dialog);
    return;
  }

  if (phase !== 'open' || options.isPreparing || reported.has(dialog)) {
    return;
  }
  reported.add(dialog);

  const root = styleRootOf(dialog);
  if (!root) {
    // A detached fragment resolves nothing, and "we cannot tell" is not "it is broken".
    return;
  }

  const problems = findLabellingProblems(
    {
      label: dialog.getAttribute('aria-label'),
      labelledBy: dialog.getAttribute('aria-labelledby'),
      describedBy: dialog.getAttribute('aria-describedby'),
    },
    // The element's own tree, which is what the platform resolves an IDREF against — so for a
    // dialog in a shadow root, an id out in the light DOM genuinely resolves to nothing for a
    // screen reader too, and reporting it is right rather than over-strict.
    (id) => {
      return root.getElementById(id) !== null;
    }
  );

  for (const problem of problems) {
    log.warn(`Dialog labelling — ${problem}`, { id: modalId });
  }
}
