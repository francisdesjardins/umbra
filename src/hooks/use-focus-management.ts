import { useEffect, useRef } from 'react';
import type { FocusManagementOptions, ModalHookContext } from './hook-types.js';

/**
 * Tracks the native autofocus target and restores focus after a failed action.
 *
 * - Captures the focused element once the dialog is fully open (the native autofocus target).
 * - Clears the captured element when the modal closes so the next open starts fresh.
 * - Subscribes directly to the action state changes to detect the isRunning → false
 *   transition, then restores focus unconditionally (covers both async focus-escape and
 *   synchronous throws where focus stays on the throwing button inside the dialog).
 *
 * Receives a `getDialog` getter to access the DOM element without passing refs.
 */
export function useFocusManagement(ctx: ModalHookContext, options: FocusManagementOptions): void {
  const { getDialog, phase } = ctx;
  const { bridge } = options;

  const defaultFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Clear on close so the next open starts fresh.
    if (phase === 'closed') {
      defaultFocusRef.current = null;
      return;
    }

    // Capture the native-autofocus target once the dialog is fully open.
    // Reading document.activeElement is reliable here — showModal() fires
    // autofocus synchronously before effects run.
    if (phase === 'open' && defaultFocusRef.current === null) {
      const dialog = getDialog();
      const active = document.activeElement;
      if (dialog && active instanceof HTMLElement && active !== dialog && dialog.contains(active)) {
        defaultFocusRef.current = active;
      }
    }

    if (!bridge) {
      return;
    }

    // Subscribe directly to the action state changes so focus restoration
    // fires on every isRunning transition regardless of whether useModal re-renders.
    // `wasRunning` is closure-local — it only needs to survive between successive
    // check() calls within the same effect lifetime, not across re-runs.
    let wasRunning = false;
    const check = () => {
      if (phase !== 'open' && phase !== 'opening') {
        wasRunning = false;
        return;
      }
      const { isRunning } = bridge.getState();
      if (isRunning) {
        wasRunning = true;
        return;
      }
      const dialog = getDialog();
      if (!dialog?.open) {
        return;
      }
      if (wasRunning) {
        // Action just completed (running → idle transition). Restore focus
        // unconditionally — covers both async (focus escaped) and sync throws
        // (focus stays on the throwing button inside the dialog).
        wasRunning = false;
        (defaultFocusRef.current ?? dialog).focus();
        return;
      }
      // No action transition — restore only if focus escaped the dialog.
      if (!dialog.contains(document.activeElement)) {
        (defaultFocusRef.current ?? dialog).focus();
      }
    };
    return bridge.subscribe(check);
  }, [bridge, phase, getDialog]);
}
