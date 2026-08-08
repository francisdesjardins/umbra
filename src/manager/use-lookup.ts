import { useSyncExternalStore } from 'react';
import { useDialogManagerContext } from './dialog-manager-context.js';
import type { ModalInfo } from './types.js';

/**
 * Reactive hook for querying a single modal's state.
 *
 * Returns `ModalInfo` that updates whenever any modal opens or closes.
 * Uses `useSyncExternalStore` for tear-free reads. For open modals,
 * the result is a stable reference from the snapshot; for closed or
 * unregistered modals, the imperative `lookup(id)` provides the info.
 *
 * Automatically uses the nearest `DialogManagerProvider` instance, or
 * falls back to the static `dialogManager` singleton when no provider
 * is present.
 *
 * @example
 * function ModalStatus({ id }: { id: string }) {
 *   const info = useLookup(id);
 *   if (!info.exists) return <span>Not registered</span>;
 *   return <span>{info.isVisible ? 'Open' : 'Closed'}</span>;
 * }
 */
export function useLookup(id: string): ModalInfo {
  const dm = useDialogManagerContext();
  const snapshot = useSyncExternalStore(dm.subscribeSnapshot, dm.getSnapshot);

  // Linear scan — n is always tiny (1-3 open modals)
  const openModal = snapshot.openDialogs.find((d) => {
    return d.id === id;
  });
  if (openModal) {
    return openModal;
  }

  // Closed or unregistered — derive from imperative lookup
  return dm.lookup(id);
}
