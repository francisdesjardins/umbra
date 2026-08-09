import { fireAndForget } from '../utils/fire-and-forget.js';
import type { ModalStore } from './modal-store.js';

/** Minimal store surface needed to finalize a close. */
type FinalizableStore = Pick<ModalStore, 'getSnapshot' | 'runOnClose' | 'finalize'>;

/**
 * Shared tail of every close path: close the native dialog if still open,
 * fire the user's `onClose` callback with the close result, then finalize the
 * store (settle the close resolvers, transition to `'closed'`).
 *
 * Used by both the closing-animation path (`syncCloseSequence`) and the
 * teardown path (`teardownModal`) so the two cannot drift.
 *
 * @internal
 */
export function finalizeModalClose(
  store: FinalizableStore,
  dialog: HTMLDialogElement | null,
  onCloseError: (error: Error) => void
): void {
  if (dialog?.open) {
    dialog.close();
  }

  const { closeResult: result } = store.getSnapshot();
  if (result) {
    fireAndForget(() => {
      return store.runOnClose(result);
    }, onCloseError);
  }

  store.finalize();
}
