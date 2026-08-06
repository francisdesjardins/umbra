import { useEffect } from 'react';
import { canDismiss } from '../utils/dismiss-gate.js';
import { createLogger } from '../utils/logger.js';
import type { ClickOutsideOptions, ModalHookContext } from './hook-types.js';

const log = createLogger('modal:click-outside');

/**
 * Dismisses a non-modal dialog when the user clicks outside its bounds.
 *
 * Attaches a document-level `pointerdown` listener (covers mouse and touch)
 * when `dismissOnClickOutside` is `true` and the dialog is open. Suppressed while an action is
 * running, and — unless `dismissWhilePreparing` — while `onOpen` is still preparing. Only the
 * topmost non-modal in a stack responds to click-outside.
 *
 * Only meaningful for non-modal dialogs — modal dialogs use backdrop click
 * detection instead (`dismissOnBackdropClick`).
 */
export function useClickOutside(ctx: ModalHookContext, options: ClickOutsideOptions): void {
  const { store, getDialog, modalId, phase, dm } = ctx;
  const { dismissOnClickOutside, dismissWhilePreparing, engine } = options;

  useEffect(() => {
    if (!dismissOnClickOutside || phase === 'closed') {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const snap = store.getSnapshot();
      if (
        !canDismiss({
          phase: snap.phase,
          isPreparing: snap.isPreparing,
          dismissWhilePreparing,
          isActionRunning: engine.aggregated().isRunning,
        })
      ) {
        return;
      }

      // Only the topmost dialog responds — stand down if another dialog is above us.
      if (!dm.lookup().isForeground(modalId)) {
        return;
      }

      const dialog = getDialog();
      if (!dialog) {
        return;
      }

      if (event.target instanceof Node && dialog.contains(event.target)) {
        return;
      }

      log('Click outside', { id: modalId });
      store.close('dismiss');
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [phase, dismissOnClickOutside, dismissWhilePreparing, engine, modalId, store, getDialog, dm]);
}
