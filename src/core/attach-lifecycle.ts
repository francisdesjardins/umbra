import { fireAndForget } from '../utils/fire-and-forget.js';
import { createLogger } from '../utils/logger.js';
import { refreshTransitionsDisabled, runCloseSequence, showDialog } from './dialog-lifecycle.js';
import { finalizeModalClose } from './finalize-close.js';
import type { CloseSequenceOptions, ModalDomContext, OpenSequenceOptions } from './attach-types.js';

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
