import { canDismiss } from '../utils/dismiss-gate.js';
import { createLogger } from '../utils/logger.js';
import { DISMISS_REASON } from './dismiss-reason.js';
import type { ClickOutsideOptions, ModalDomContext } from './attach-types.js';

const log = createLogger('modal:click-outside');

/**
 * Dismiss a non-modal dialog when the user clicks outside its bounds.
 *
 * A document-level `pointerdown` listener (covers mouse and touch), attached only while
 * `dismissOnClickOutside` is `true` and the dialog is open. Suppressed while an action is
 * running, and — unless `dismissWhilePreparing` — while `prepare` is still preparing. Only the
 * topmost non-modal in a stack responds.
 *
 * Only meaningful for non-modal dialogs; a modal one has a backdrop, and the backdrop click is
 * a different path with a different question (did the pointer land outside the box).
 *
 * @returns A teardown that removes the listener, or `undefined` when nothing was attached.
 */
export function attachClickOutside(
  ctx: ModalDomContext,
  options: ClickOutsideOptions
): (() => void) | undefined {
  const { store, getDialog, modalId, phase, manager } = ctx;
  const { dismissOnClickOutside, dismissWhilePreparing, engine } = options;

  if (!dismissOnClickOutside || phase === 'closed') {
    return undefined;
  }

  const handlePointerDown = (event: PointerEvent) => {
    const snap = store.getSnapshot();
    if (
      !canDismiss({
        phase: snap.phase,
        isPreparing: snap.isPreparing,
        dismissWhilePreparing,
        hasRunningAction: engine.aggregated().hasRunningAction,
      })
    ) {
      return;
    }

    // Only the topmost dialog responds — stand down if another dialog is above us.
    if (!manager.lookup().isForeground(modalId)) {
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
    store.close(DISMISS_REASON);
  };

  document.addEventListener('pointerdown', handlePointerDown);
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
  };
}
