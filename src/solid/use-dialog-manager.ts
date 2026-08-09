import { useDialogManagerContext } from './dialog-manager-context.js';
import { fromStore } from './from-store.js';
import type { DialogManagerSnapshot } from '../manager/dialog-manager.js';

export type { DialogManagerSnapshot };

/**
 * The manager's live state — the same `DialogManagerSnapshot` React's hook returns, with the two
 * fields as getters so reading one inside JSX subscribes that expression to it.
 *
 * A snapshot is a fixed pair, so it can be handed back as an object and stay reactive. Contrast
 * `useLookup`, whose `ModalInfo` is a discriminated union and therefore cannot.
 *
 * @example
 * const dialogs = useDialogManager();
 * const openCount = () => {
 *   return dialogs.openDialogs.length;
 * };
 */
export function useDialogManager(): DialogManagerSnapshot {
  const manager = useDialogManagerContext();
  const snapshot = fromStore({
    subscribe: manager.subscribeSnapshot,
    getSnapshot: manager.getSnapshot,
  });

  return {
    get openDialogs() {
      return snapshot().openDialogs;
    },
    get foreground() {
      return snapshot().foreground;
    },
  };
}
