import { fireAndForget } from '../utils/fire-and-forget.js';
import type { DialogStore } from './dialog-store.js';

/** Minimal store surface needed to finalize a close. */
type FinalizableStore = Pick<DialogStore, 'getSnapshot' | 'runOnClose' | 'finalize'>;

/**
 * The two members of the element this actually touches — narrowed for the reason the store is,
 * and with the same consequence: the close tail becomes assertable without a browser.
 */
type ClosableDialog = Pick<HTMLDialogElement, 'open' | 'close'>;

/** What the close tail needs beyond the store. */
export type FinalizeCloseOptions = {
  /** The element to close, or `null` when the binding never had one. */
  readonly dialog: ClosableDialog | null;
  /** Where a throwing `onClose` goes. Each call site names its own context. */
  readonly onCloseError: (error: Error) => void;
};

/**
 * Shared tail of every close path: close the native dialog if still open,
 * fire the user's `onClose` callback with the close result, then finalize the
 * store (settle the close resolvers, transition to `'closed'`).
 *
 * Used by both the closing-animation path (`syncCloseSequence`) and the
 * teardown path (`teardownDialog`) so the two cannot drift.
 *
 * @internal
 */
export function finalizeDialogClose(store: FinalizableStore, options: FinalizeCloseOptions): void {
  const { dialog, onCloseError } = options;

  if (dialog?.open) {
    dialog.close();
  }

  const { closeResult: result } = store.getSnapshot();
  if (result) {
    fireAndForget(
      () => {
        return store.runOnClose(result);
      },
      { onError: onCloseError }
    );
  }

  store.finalize();
}
