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

/**
 * Put focus back inside the dialog, verifying rather than assuming: focusing a `disabled`
 * element is a silent no-op, and focus left on `<body>` is a modal with no keyboard — the
 * dialog's keydown listener only hears keys raised inside it, so its hotkeys go dead.
 */
const restoreFocus = (dialog: HTMLDialogElement, preferred: HTMLElement | null) => {
  (preferred ?? dialog).focus();
  if (!dialog.contains(document.activeElement)) {
    dialog.focus();
  }
};
export function useFocusManagement(ctx: ModalHookContext, options: FocusManagementOptions): void {
  const { getDialog, phase } = ctx;
  const { engine } = options;

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

    // Subscribe directly to the action state changes so focus restoration
    // fires on every isRunning transition regardless of whether useModal re-renders.
    // `wasRunning` is closure-local — it only needs to survive between successive
    // check() calls within the same effect lifetime, not across re-runs.
    let wasRunning = false;
    let frame = 0;

    // The engine notifies synchronously, so at that instant the button that just ran is still
    // rendered `disabled` and cannot take focus. A frame later React has committed the idle
    // state and the button is focusable again — which is the difference between the hotkey
    // working on the retry and the modal answering to nothing but the mouse.
    const scheduleRestore = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const dialog = getDialog();
        if (!dialog?.open) {
          return;
        }
        restoreFocus(dialog, defaultFocusRef.current);
      });
    };

    const check = () => {
      if (phase !== 'open' && phase !== 'opening') {
        wasRunning = false;
        return;
      }
      const { isRunning } = engine.aggregated();
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
        scheduleRestore();
        return;
      }
      // No action transition — restore only if focus escaped the dialog.
      if (!dialog.contains(document.activeElement)) {
        restoreFocus(dialog, defaultFocusRef.current);
      }
    };

    const unsubscribe = engine.subscribe(check);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [engine, phase, getDialog]);
}
