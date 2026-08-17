import { useSyncExternalStore } from 'react';
import { useDialogManagerContext } from './dialog-manager-context.js';
import type { DialogManager, DialogManagerSnapshot } from '../manager/dialog-manager.js';
import type { ModalInfo } from '../manager/types.js';

/**
 * One modal's `ModalInfo`, updating whenever any modal opens or closes, through
 * `useSyncExternalStore` for tear-free reads. An open modal answers with a stable reference from
 * the snapshot, a closed or unregistered one from `lookup(id)`. Scoped to the nearest
 * `DialogManagerProvider`, or the singleton when there is none.
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
  // silently freezing: the closed branch reads mutable state through `manager.lookup(id)`, so
  // inline the compiler memoises on `manager` and `id` — neither moves when a modal registers —
  // and the hook repeats its first answer for ever. Naming the snapshot makes it the dependency it
  // already was; uncompiled the two look identical, which is why this took the compiled bundle.
  return lookupIn(id, { manager, snapshot });
}
