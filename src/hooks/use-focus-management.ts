import { useEffect, useRef } from 'react';
import { queryOwn } from '../utils/dialog-scope.js';
import type { FocusManagementOptions, ModalHookContext } from './hook-types.js';

/** The marker an action sets with `focusOnOpen` — see `ActionButtonProps`. */
const FOCUS_ON_OPEN_SELECTOR = '[data-focus-on-open]';

/**
 * Decides where a modal's focus starts, and puts it back after a failed action.
 *
 * - Hands the opening focus to an action that asked for it (`focusOnOpen`), or captures
 *   whatever the browser focused once the dialog is fully open.
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

    // Settle the opening focus once the dialog is fully open, and remember where it landed —
    // that is also where a failed action sends it back to.
    if (phase === 'open' && defaultFocusRef.current === null) {
      const dialog = getDialog();
      // An action that asked for the opening focus takes it from whatever `showModal()` picked.
      // Scoped to this dialog's own content: a modal opened from inside this one renders its
      // `<dialog>` in this subtree, and its buttons are not ours to focus.
      const claimed = dialog ? queryOwn(dialog, FOCUS_ON_OPEN_SELECTOR) : null;
      if (claimed) {
        claimed.focus();
      }
      // Reading document.activeElement is reliable here — showModal() fires
      // autofocus synchronously before effects run.
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
