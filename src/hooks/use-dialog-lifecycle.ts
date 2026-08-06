import { useEffect } from 'react';
import {
  refreshTransitionsDisabled,
  runCloseSequence,
  showDialog,
} from '../core/dialog-lifecycle.js';
import { finalizeModalClose } from '../core/finalize-close.js';
import { resolveAnimation } from '../utils/animation-utils.js';
import { fireAndForget } from '../utils/fire-and-forget.js';
import { createLogger } from '../utils/logger.js';
import type { DialogLifecycleOptions, ModalHookContext } from './hook-types.js';

const log = createLogger('modal:lifecycle');

/**
 * Wires the native-`<dialog>` DOM lifecycle (in `core/dialog-lifecycle.ts`) to modal store
 * transitions via React effects. The DOM orchestration itself is framework-agnostic; this
 * hook only handles phase gating, RAF/`onOpen` scheduling, and close finalization.
 *
 * Opening path (phase === 'opening'):
 *   `showDialog()` → RAF `transitionToOpen` → `resolveOpen`/`onOpen`
 * Open path (phase === 'open'):
 *   re-measure `refreshTransitionsDisabled` so the closing path reads this open's answer
 *   from the cache, without a sync reflow.
 * Closing path (phase === 'closing'):
 *   short-circuit (already closed natively / transitions disabled) → finalize, else
 *   `runDialogExit()` (backdrop WAAPI + `transitionend`/timeout) → finalize.
 *
 * The `finalized` flag guards the ESC cancel race: the browser may natively close the dialog
 * while the `transitionend` listener is still attached, making `dialog.open` unreliable.
 *
 * Receives a `getDialog` getter to access the DOM element without passing refs.
 */
export function useDialogLifecycle(ctx: ModalHookContext, options: DialogLifecycleOptions): void {
  const { store, getDialog, modalId, phase, dm } = ctx;
  const { onOpen, animation, nonModal } = options;

  // ── Opening effect ──────────────────────────────────────────────────────────
  // Intentionally no deps array — runs every render so `onOpen` always refers
  // to the latest closure. The phase guard + `dialog.open` check prevent
  // duplicate work on re-renders during the opening phase.
  useEffect(() => {
    if (phase !== 'opening') {
      return;
    }

    const dialog = getDialog();
    if (!dialog || dialog.open) {
      return;
    }

    log('Showing dialog', { id: modalId, nonModal });

    showDialog(dialog, { nonModal, zIndex: dm.getZIndex(modalId) });

    store.scheduleOpenTransition();

    if (onOpen) {
      // The signal is the store's — it aborts on `close()`, which is a transition this hook does
      // not own and should not be re-deriving from `phase`.
      const signal = store.openSignal();
      fireAndForget(
        async () => {
          await onOpen(signal);
          log('onOpen completed', { id: modalId });
        },
        (error) => {
          log.error('onOpen failed', { id: modalId, error: error.message });
        },
        () => {
          store.resolveOpen();
        }
      );
    } else {
      store.resolveOpen();
    }
  });

  // Same resolution the <dialog>'s inline `transition` is built from, so the property
  // we wait on and the duration we time out against always match it. Resolved out here
  // (rather than inside the effect) so the effect depends on the two primitives it
  // actually uses instead of the whole animation object.
  const { primaryProperty, exitDuration } = resolveAnimation(animation);

  // ── Closing / pre-cache effect ──────────────────────────────────────────────
  // Explicit deps: only re-runs when phase or the resolved animation changes.
  // Also handles the 'open' pre-cache pass so the closing path can read from
  // the WeakMap instead of calling getComputedStyle at close time.
  useEffect(() => {
    const dialog = getDialog();
    if (!dialog) {
      return;
    }

    // Re-measure the transition state on every open, so the closing path reads this open's
    // answer rather than the first one's — and reads it from the cache, without a reflow.
    if (phase === 'open') {
      refreshTransitionsDisabled(dialog);
      return;
    }

    if (phase !== 'closing') {
      return;
    }

    return runCloseSequence(dialog, {
      nonModal,
      primaryProp: primaryProperty,
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
  }, [phase, primaryProperty, exitDuration, modalId, store, getDialog, nonModal]);
}
