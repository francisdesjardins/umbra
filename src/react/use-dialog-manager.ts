import { useSyncExternalStore } from 'react';
import type { DialogManagerSnapshot } from '../manager/dialog-manager.js';
import { useDialogManagerContext } from './dialog-manager-context.js';

export type { DialogManagerSnapshot };

/**
 * An immutable `DialogManagerSnapshot` that updates whenever dialogs open or close, through
 * `useSyncExternalStore` for tear-free reads. Scoped to the nearest `DialogManagerProvider`, or
 * the singleton when there is none.
 *
 * @example
 * function DialogCounter() {
 *   const { openDialogs } = useDialogManager();
 *   return <span>{openDialogs.length} dialogs open</span>;
 * }
 *
 * @example
 * function TopDialogIndicator() {
 *   const { foreground } = useDialogManager();
 *   if (!foreground) return null;
 *   return <span>Top dialog: {foreground.id}</span>;
 * }
 */
export function useDialogManager(): DialogManagerSnapshot {
  const manager = useDialogManagerContext();
  // The registry is in-memory, so the server reads it too — see `useDialog` for why the third
  // argument is the same reader and what omitting it costs.
  return useSyncExternalStore(manager.subscribeSnapshot, manager.getSnapshot, manager.getSnapshot);
}
