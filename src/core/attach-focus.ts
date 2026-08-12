import { isOwnEventTarget } from '../utils/dialog-scope.js';
import {
  activeWithin,
  captureActionRunner,
  preferredRestoreTarget,
  reclaimFocus,
  restoreFocus,
  settleOpeningFocus,
} from './focus-policy.js';
import type { FocusCoordinatorOptions, ModalDomContext } from './attach-types.js';
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
  ctx: Pick<ModalDomContext, 'getDialog' | 'modalId' | 'manager'>,
  options: FocusCoordinatorOptions
) {
  const { getDialog, modalId, manager } = ctx;
  const { engine } = options;

  let openingFocus: HTMLElement | null = null;
  /**
   * Whether the opening focus has been decided for this open — including the decision *not* to
   * take it. `openingFocus` cannot carry that: `null` is also what a dialog with nothing to focus
   * records, and the two would be indistinguishable on the next pass.
   */
  let settled = false;
  /**
   * The last element inside the dialog to take focus, remembered as it happens.
   *
   * Reading `activeElement` when the engine reports a running action assumes nothing has
   * disabled the button yet, and that assumption is a subscriber-order bet. It holds where the
   * binding commits on a later frame and loses where the binding writes `disabled` from its own
   * synchronous engine subscriber — `umbra/vanilla`, whose `bindAction` subscribes before this
   * coordinator does, because the caller binds actions after `bindDialog` has returned. The
   * browser blurs a disabled element, so the read finds nothing and the retry lands on the
   * dialog instead of on the button that was pressed.
   *
   * `focusin` cannot lose that race: it fires when focus arrives, which is before any of it.
   */
  let lastFocusInside: HTMLElement | null = null;

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
        settled = false;
        lastFocusInside = null;
        return undefined;
      }

      // Settle the opening focus once the dialog is fully open, and remember where it landed —
      // reading the active element is reliable here, because `showModal()` fires autofocus
      // synchronously before a binding's effects run.
      //
      // Unless something else is in front. A dialog opening *underneath* another is not what the
      // user is looking at, and taking the keyboard from what they are looking at is the worst
      // thing an opening can do: the dialog in front is left with no focus, so its own keydown
      // listener hears nothing and its dismiss key goes dead. Reported from an application — a
      // connection error in the top layer, focused on its cancel button, losing the focus the
      // instant a side panel opened behind it.
      //
      // Asked of the manager rather than of the DOM, because the question is which dialog is in
      // front rather than which element is where, and the manager is the one that knows — modal
      // before non-modal, then whatever policy is installed.
      if (phase === 'open' && !settled) {
        const dialog = getDialog();
        if (dialog) {
          settled = true;
          if (manager.lookup().isForeground(modalId)) {
            openingFocus = settleOpeningFocus(dialog);
          } else {
            // Not only declined but *returned*. `show()` runs the platform's focusing steps
            // before any of this code, so opening underneath has already pulled the keyboard off
            // the dialog in front — whether it landed here or fell to `<body>`, it is no longer
            // where the user is looking. The front dialog's own coordinator will not re-run, so the
            // focus is settled back onto it here, through the same call it used on its own
            // opening — which re-honours its `focusOnOpen`. Unconditional rather than guarded on
            // "did we steal it": the theft is what opening a dialog *is*, and re-reading
            // `activeElement` to confirm only reintroduces the subscriber-order bet documented
            // above.
            openingFocus = null;
            const front = manager.lookup().getForeground();
            if (front !== undefined) {
              const frontElement = dialog.ownerDocument.querySelector<HTMLDialogElement>(
                `dialog[data-modal-id="${CSS.escape(front.id)}"]`
              );
              if (frontElement !== null) {
                reclaimFocus(frontElement);
              }
            }
          }
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
            // The live read first — it is the most specific answer and it is what the hook
            // bindings give. `lastFocusInside` is the floor for the binding that has already
            // disabled the button by now; see its declaration.
            runner = captureActionRunner(getDialog()) ?? lastFocusInside;
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
        if (!dialog.contains(activeWithin(dialog))) {
          restoreFocus(dialog, openingFocus);
        }
      };

      const unsubscribe = engine.subscribe(check);

      // Remember focus as it arrives. Scoped with `isOwnEventTarget` for the same reason the
      // keydown listener is: a modal opened from inside this one renders its `<dialog>` in this
      // subtree, and `focusin` bubbles — without this, the modal underneath would restore focus
      // to a button belonging to the modal above it.
      let stopRemembering: (() => void) | undefined;
      const watched = getDialog();
      if (watched) {
        const remember = (event: Event) => {
          const { target } = event;
          if (
            target instanceof HTMLElement &&
            target !== watched &&
            isOwnEventTarget(watched, target)
          ) {
            lastFocusInside = target;
          }
        };
        watched.addEventListener('focusin', remember);
        stopRemembering = () => {
          watched.removeEventListener('focusin', remember);
        };
      }

      return () => {
        cancelAnimationFrame(frame);
        stopRemembering?.();
        unsubscribe();
      };
    },
  };
}

/** The coordinator as its consumers see it. */
export type FocusCoordinator = ReturnType<typeof createFocusCoordinator>;
