import type { DialogManager, DialogManagerSnapshot } from './dialog-manager.js';
import type { DialogInfo } from './types.js';

/**
 * One dialog's `DialogInfo`, read from the snapshot first and the manager second.
 *
 * The two halves answer different questions and both are needed: the snapshot carries the open
 * dialogs and is what makes a subscriber re-render, while `lookup` answers for a dialog that is
 * registered and closed, or not registered at all. Framework-free because it is the same two lines
 * in every binding, and the **snapshot is a parameter rather than read inside** — that is the
 * difference between working and silently freezing, since the closed branch reads mutable state and
 * a memoiser given only `manager` and `id` sees nothing move when a dialog registers.
 *
 * @internal
 */
export function lookupIn(
  id: string,
  source: { readonly manager: DialogManager; readonly snapshot: DialogManagerSnapshot }
): DialogInfo {
  const { manager, snapshot } = source;
  // Linear scan — n is always tiny (1-3 open dialogs).
  const openDialog = snapshot.openDialogs.find((info) => {
    return info.id === id;
  });
  return openDialog ?? manager.lookup(id);
}
