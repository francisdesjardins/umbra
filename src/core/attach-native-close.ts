import { DISMISS_REASON } from './dismiss-reason.js';
import { createLogger } from '../utils/logger.js';
import type { DialogDomContext } from './attach-types.js';

const log = createLogger('dialog:native-close');

/**
 * Follow a close the element made on its own, so the store never describes a dialog that is gone.
 *
 * `attachDialogCancel` states the rule — the browser must never close the dialog behind the store —
 * and prevents the one path that *can* be prevented. `<form method="dialog">` and a bare
 * `dialog.close()` cannot be: both run the element's close steps and announce them afterwards.
 * Unfollowed, the store stays `'open'` over a dialog nobody can see — still in the stack, still
 * answering the dismiss key for the ones under it, `onClose` never called.
 *
 * Closes the store directly rather than asking `onDismissRequest`, for the reason teardown asks
 * nobody: it has happened, so no answer could be honoured.
 *
 * @internal Not part of the public API.
 */
export function attachNativeClose(ctx: DialogDomContext): (() => void) | undefined {
  const { store, getDialog, dialogId, phase } = ctx;

  const dialog = getDialog();
  if (!dialog || phase === 'closed') {
    return undefined;
  }

  const handleNativeClose = (event: Event) => {
    // A raise fires this too — `close()` then `showModal()` queues the event, so it arrives with
    // the dialog **open again**, which is the only thing telling a raise from a real close.
    if (event.target !== dialog || dialog.open) {
      return;
    }

    // False on every close the library made itself: those reach here with the phase already
    // `'closing'`, where `store.close` is a no-op. So the log is the platform's closes and only
    // those.
    if (store.close(DISMISS_REASON)) {
      log('Closed by the platform', { id: dialogId });
    }
  };

  dialog.addEventListener('close', handleNativeClose);
  return () => {
    dialog.removeEventListener('close', handleNativeClose);
  };
}
