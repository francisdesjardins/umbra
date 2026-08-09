import { useSyncExternalStore } from 'react';
import type { DialogManagerSnapshot } from '../manager/dialog-manager.js';
import { useDialogManagerContext } from './dialog-manager-context.js';

export type { DialogManagerSnapshot };

/**
 * Reactive hook for subscribing to dialog manager state changes.
 *
 * Returns an immutable `DialogManagerSnapshot` that updates whenever
 * modals open or close. Uses `useSyncExternalStore` for tear-free reads.
 *
 * Automatically uses the nearest `DialogManagerProvider` instance, or
 * falls back to the static `dialogManager` singleton when no provider
 * is present.
 *
 * @example
 * function ModalCounter() {
 *   const { openDialogs } = useDialogManager();
 *   return <span>{openDialogs.length} modals open</span>;
 * }
 *
 * @example
 * function TopModalIndicator() {
 *   const { foreground } = useDialogManager();
 *   if (!foreground) return null;
 *   return <span>Top modal: {foreground.id}</span>;
 * }
 */
export function useDialogManager(): DialogManagerSnapshot {
  const manager = useDialogManagerContext();
  return useSyncExternalStore(manager.subscribeSnapshot, manager.getSnapshot);
}
