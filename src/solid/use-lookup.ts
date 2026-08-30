import type { Accessor } from 'solid-js';
import type { DialogId } from '../core/registry.js';
import { useDialogManagerContext } from './dialog-manager-context.js';
import { fromStore } from './from-store.js';
import { lookupIn } from '../manager/lookup.js';
import type { DialogInfo } from '../manager/types.js';

/**
 * One dialog's live state. **An accessor, forced rather than chosen**: `DialogInfo` is a
 * discriminated union (`info.exists` narrows it) and an object of getters would flatten the
 * discriminant away, so this one is `info()` while {@link useDialogManager} is not.
 *
 * @example
 * const info = useLookup('settings');
 * const label = () => {
 *   return info().exists && info().isVisible ? 'Open' : 'Closed';
 * };
 */
export function useLookup(id: DialogId): Accessor<DialogInfo> {
  const manager = useDialogManagerContext();
  const snapshot = fromStore({
    subscribe: manager.subscribeSnapshot,
    getSnapshot: manager.getSnapshot,
  });

  return () => {
    return lookupIn(id, { manager, snapshot: snapshot() });
  };
}
