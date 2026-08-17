import { useDialogManagerContext } from './dialog-manager-context.js';
import { fromStore } from './from-store.js';
import type { DialogManagerSnapshot } from '../manager/dialog-manager.js';

export type { DialogManagerSnapshot };

/**
 * The manager's live state — React's `DialogManagerSnapshot`, with both fields as getters so
 * reading one inside JSX subscribes that expression. A fixed pair can be an object and stay
 * reactive; `useLookup`'s discriminated union cannot.
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
