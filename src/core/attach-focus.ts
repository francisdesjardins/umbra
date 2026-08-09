import {
  captureActionRunner,
  preferredRestoreTarget,
  restoreFocus,
  settleOpeningFocus,
} from './focus-policy.js';
import type { FocusManagementOptions, ModalDomContext } from './attach-types.js';
import type { ModalPhase } from './types.js';

/**
 * The scheduling half of the focus policy — where the decisions in `focus-policy.ts` are asked.
 *
 * A coordinator rather than a bare `attach*` function because one thing has to outlive a single
 * attachment: where the opening focus landed. It is read when an action settles, which can be
 * several phase changes later, so it lives on the coordinator while everything else lives inside
 * the attachment it belongs to.
 *
 * @internal Not part of the public API.
 */
export function createFocusCoordinator(
  ctx: Pick<ModalDomContext, 'getDialog'>,
  options: FocusManagementOptions
) {
  const { getDialog } = ctx;
  const { engine } = options;

  let openingFocus: HTMLElement | null = null;

  return {
    /**
     * Bring focus handling in line with a phase, and return the teardown for what it attached.
     *
     * Call it whenever the phase changes, tearing down the previous attachment first.
     */
    sync(phase: ModalPhase): (() => void) | undefined {
      // Clear on close so the next open starts fresh.
      if (phase === 'closed') {
        openingFocus = null;
        return undefined;
      }

      // Settle the opening focus once the dialog is fully open, and remember where it landed —
      // reading `document.activeElement` is reliable here, because `showModal()` fires autofocus
      // synchronously before a binding's effects run.
      if (phase === 'open' && openingFocus === null) {
        const dialog = getDialog();
        if (dialog) {
          openingFocus = settleOpeningFocus(dialog);
        }
      }

      // Subscribe directly to the action state changes so focus restoration fires on every
      // hasRunningAction transition regardless of whether the binding re-renders. `wasRunning`
      // and `runner` are local to this attachment: they only need to survive between successive
      // check() calls within one, not across them.
      let wasRunning = false;
      let runner: HTMLElement | null = null;
      let frame = 0;

      // The engine notifies synchronously, so at that instant the button that just ran is still
      // rendered `disabled` and cannot take focus. A frame later the binding has committed the
      // idle state and the button is focusable again — which is the difference between the
      // hotkey working on the retry and the modal answering to nothing but the mouse.
      const scheduleRestore = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const dialog = getDialog();
          if (!dialog?.open) {
            return;
          }
          restoreFocus(dialog, preferredRestoreTarget(runner, openingFocus));
        });
      };

      const check = () => {
        if (phase !== 'open' && phase !== 'opening') {
          wasRunning = false;
          return;
        }
        const { hasRunningAction } = engine.aggregated();
        if (hasRunningAction) {
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
          restoreFocus(dialog, openingFocus);
        }
      };

      const unsubscribe = engine.subscribe(check);
      return () => {
        cancelAnimationFrame(frame);
        unsubscribe();
      };
    },
  };
}

/** The coordinator as its consumers see it. */
export type FocusCoordinator = ReturnType<typeof createFocusCoordinator>;
