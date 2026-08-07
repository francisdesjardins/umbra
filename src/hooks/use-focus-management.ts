import { useEffect, useRef } from 'react';
import {
  captureActionRunner,
  preferredRestoreTarget,
  restoreFocus,
  settleOpeningFocus,
} from '../core/focus-policy.js';
import type { FocusManagementOptions, ModalHookContext } from './hook-types.js';

/**
 * Wires the framework-free focus policy (`core/focus-policy.ts`) to React's lifecycle.
 *
 * What is left here is scheduling, and only scheduling: when the phase says the dialog is open,
 * when the action engine says something started or settled, and the frame to wait before moving
 * focus. The decisions — who claimed the opening focus, who ran the action, where focus goes
 * back — are plain DOM functions a second binding calls at its own moments.
 *
 * Receives a `getDialog` getter to access the DOM element without passing refs.
 */
export function useFocusManagement(ctx: ModalHookContext, options: FocusManagementOptions): void {
  const { getDialog, phase } = ctx;
  const { engine } = options;

  const openingFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Clear on close so the next open starts fresh.
    if (phase === 'closed') {
      openingFocusRef.current = null;
      return;
    }

    // Settle the opening focus once the dialog is fully open, and remember where it landed —
    // reading `document.activeElement` is reliable here, because `showModal()` fires autofocus
    // synchronously before effects run.
    if (phase === 'open' && openingFocusRef.current === null) {
      const dialog = getDialog();
      if (dialog) {
        openingFocusRef.current = settleOpeningFocus(dialog);
      }
    }

    // Subscribe directly to the action state changes so focus restoration fires on every
    // isRunning transition regardless of whether `useModal` re-renders. `wasRunning` and
    // `runner` are closure-local: they only need to survive between successive check() calls
    // within one effect lifetime, not across re-runs.
    let wasRunning = false;
    let runner: HTMLElement | null = null;
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
        restoreFocus(dialog, preferredRestoreTarget(runner, openingFocusRef.current));
      });
    };

    const check = () => {
      if (phase !== 'open' && phase !== 'opening') {
        wasRunning = false;
        return;
      }
      const { isRunning } = engine.aggregated();
      if (isRunning) {
        if (!wasRunning) {
          runner = captureActionRunner(getDialog());
        }
        wasRunning = true;
        return;
      }
      const dialog = getDialog();
      if (!dialog?.open) {
        return;
      }
      if (wasRunning) {
        // Action just completed (running → idle transition). Restore focus unconditionally —
        // covers both async (focus escaped) and sync throws (focus stays on the throwing
        // button inside the dialog).
        wasRunning = false;
        scheduleRestore();
        return;
      }
      // No action transition — restore only if focus escaped the dialog.
      if (!dialog.contains(document.activeElement)) {
        restoreFocus(dialog, openingFocusRef.current);
      }
    };

    const unsubscribe = engine.subscribe(check);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [engine, phase, getDialog]);
}
