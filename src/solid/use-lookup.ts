import type { Accessor } from 'solid-js';
import { useDialogManagerContext } from './dialog-manager-context.js';
import { fromStore } from './from-store.js';
import type { ModalInfo } from '../manager/types.js';

/**
 * One modal's live state.
 *
 * **Returns an accessor, and that is forced rather than chosen.** `ModalInfo` is a discriminated
 * union — `info.exists` narrows it — and a union cannot be handed back as one object of getters
 * without flattening the discriminant away, which would cost exactly the narrowing the type
 * exists for. So this one is `info()`, while {@link useDialogManager} next door is not.
 *
 * @example
 * const info = useLookup('settings');
 * const label = () => {
 *   return info().exists && info().isVisible ? 'Open' : 'Closed';
 * };
 */
export function useLookup(id: string): Accessor<ModalInfo> {
  const dm = useDialogManagerContext();
  const snapshot = fromStore({ subscribe: dm.subscribeSnapshot, getSnapshot: dm.getSnapshot });

  return () => {
    // Linear scan — n is always tiny (1-3 open modals)
    const openModal = snapshot().openDialogs.find((d) => {
      return d.id === id;
    });
    if (openModal) {
      return openModal;
    }

    // Closed or unregistered — derive from imperative lookup
    return dm.lookup(id);
  };
}
