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
      //
      // Declining is all this does. Putting the focus back is the front dialog's own business, and
      // the watcher below is where it does it.
      if (phase === 'open' && !settled) {
        const dialog = getDialog();
        if (dialog) {
          settled = true;
          openingFocus = manager.lookup().isForeground(modalId) ? settleOpeningFocus(dialog) : null;
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

      // ── Taking the focus back when the stack moves ────────────────────────
      //
      // **Every dialog answers for its own focus.** The alternative was tried: the dialog *opening
      // underneath* reached across and settled the focus back onto whichever dialog the manager
      // named as the front one. Three things were wrong with it, and they are the three findings
      // this replaces. It had to find that dialog's element with a
      // `document.querySelector('dialog[data-modal-id=…]')` — the one lookup this library documents
      // as broken, because it finds nothing inside a shadow root and can hit another manager's
      // dialog of the same id. It re-honoured the front dialog's `focusOnOpen` rather than the
      // position focus was actually in, so a caret in a text field became a ring on the primary
      // button. And it only ran on an *opening*, so the mirror case had nobody in it at all: when
      // the front dialog closed, the dialog left behind had declined its opening focus, was now the
      // one in front, and nothing ever gave it the keyboard.
      //
      // Watching the manager answers all three at once. The dialog that needs the focus is the one
      // asking for it, so it has its own element and its own memory of where focus was, and it
      // hears *every* way the stack can move — an open, a close, a `prioritize` raise — rather than
      // only the one the other dialog happened to notice.
      //
      // The snapshot changes on dialog transitions and on nothing else, which is what makes this
      // safe to act on: a user clicking the page behind a panel does not reach here, so the focus is
      // only ever taken back when the stack really did move under it.
      let stopWatchingStack: (() => void) | undefined;
      if (phase === 'open') {
        const reclaimIfInFront = () => {
          const dialog = getDialog();
          if (!dialog?.open) {
            return;
          }
          const info = manager.lookup(modalId);
          if (!info.isForeground || (info.exists && info.nonModal)) {
            // **Modal only, and that is a rule rather than a shortcut.** A non-modal dialog does not
            // own the page's focus and never did — the page underneath it is live, and a panel that
            // yanked the keyboard back every time some other dialog opened or closed would be taking
            // something the page did not agree to give. It does not need to: its dismiss key comes
            // from `attachWindowDismissKey`, which answers wherever focus is. A modal dialog has no
            // such listener — its keydown is scoped to itself and only Escape survives focus being
            // elsewhere, through the native `cancel` — so for that one, focus is the keyboard.
            return;
          }
          if (dialog.contains(activeWithin(dialog))) {
            // Focus is already ours, so there is nothing to take back — but note that "ours" is not
            // "where the user was". A `prioritize` raise re-shows this dialog, and `showModal()` then
            // puts focus on its first focusable, *inside* it; that satisfies this guard, so a position
            // moved by a raise is not corrected and a caret is lost. The memory below would be the
            // right answer, except the raise's own `showModal()` fires a `focusin` that overwrites it
            // first. Fixing it means ignoring focus the library itself moves during a raise, which
            // needs a window `raiseDialog` can publish and this can read. Pinned as a known limit by
            // "keeps the keyboard when something opens over it" in `vanilla/__tests__/bind-dialog.ct.tsx`.
            return;
          }
          openingFocus = reclaimFocus(dialog, lastFocusInside) ?? openingFocus;
        };
        stopWatchingStack = manager.subscribeSnapshot(reclaimIfInFront);
      }

      return () => {
        cancelAnimationFrame(frame);
        stopRemembering?.();
        stopWatchingStack?.();
        unsubscribe();
      };
    },
  };
}

/** The coordinator as its consumers see it. */
export type FocusCoordinator = ReturnType<typeof createFocusCoordinator>;
