import { useSyncExternalStore } from 'react';
import { useDialogManagerContext } from './dialog-manager-context.js';
import type { DialogManager, DialogManagerSnapshot } from '../manager/dialog-manager.js';
import type { ModalInfo } from '../manager/types.js';

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
function lookupIn(
  id: string,
  source: { readonly manager: DialogManager; readonly snapshot: DialogManagerSnapshot }
): ModalInfo {
  const { manager, snapshot } = source;
  // Linear scan — n is always tiny (1-3 open modals)
  const openModal = snapshot.openDialogs.find((d) => {
    return d.id === id;
  });
  if (openModal) {
    return openModal;
  }

  // Closed or unregistered — derive from imperative lookup
  return manager.lookup(id);
}

export function useLookup(id: string): ModalInfo {
  const manager = useDialogManagerContext();
  const snapshot = useSyncExternalStore(manager.subscribeSnapshot, manager.getSnapshot);

  // `snapshot` is passed rather than read inside, and it is the difference between working and
  // silently freezing. The closed branch answers from `manager.lookup(id)`, a read of mutable
  // state the compiler has no way to see into — so left inline it memoises on `manager` and `id`,
  // neither of which changes when a modal registers, and the hook reports the answer it gave on
  // the first render for ever. Naming the snapshot makes it the dependency it already was: it is
  // what says *when* the imperative read may have gone stale. Uncompiled this looks identical,
  // which is why it took compiling the component bundle to see it at all.
  return lookupIn(id, { manager, snapshot });
}
