import { useSyncExternalStore } from 'react';
import type { DialogId } from '../core/registry.js';
import { useDialogManagerContext } from './dialog-manager-context.js';
import { lookupIn } from '../manager/lookup.js';
import type { DialogInfo } from '../manager/types.js';

/**
 * One dialog's `DialogInfo`, updating whenever any dialog opens or closes, through
 * `useSyncExternalStore` for tear-free reads. An open dialog answers with a stable reference from
 * the snapshot, a closed or unregistered one from `lookup(id)`. Scoped to the nearest
 * `DialogManagerProvider`, or the singleton when there is none.
 *
 * @example
 * function DialogStatus({ id }: { id: string }) {
 *   const info = useLookup(id);
 *   if (!info.exists) return <span>Not registered</span>;
 *   return <span>{info.isVisible ? 'Open' : 'Closed'}</span>;
 * }
 */
export function useLookup(id: DialogId): DialogInfo {
  const manager = useDialogManagerContext();
  // Server-readable for the reason on `useDialog`: nothing here asks the DOM anything.
  const snapshot = useSyncExternalStore(
    manager.subscribeSnapshot,
    manager.getSnapshot,
    manager.getSnapshot
  );

  // `snapshot` is passed rather than read inside — see `lookupIn`.
  return lookupIn(id, { manager, snapshot });
}
