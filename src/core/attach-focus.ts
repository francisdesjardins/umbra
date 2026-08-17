import { isOwnEventTarget } from '../utils/dialog-scope.js';
import { restoreOpenerFocus } from './dialog-lifecycle.js';
import {
  activeWithin,
  captureActionRunner,
  findActionButton,
  reclaimFocus,
  restoreFocus,
  settleOpeningFocus,
} from './focus-policy.js';
import { chooseActionRunner, preferredRestoreTarget } from '../utils/focus-restore-policy.js';
import type { FocusCoordinatorOptions, ModalDomContext } from './attach-types.js';
import type { ModalPhase } from './types.js';

/**
 * The scheduling half of the focus policy — where `focus-policy.ts`'s decisions are asked. A
 * coordinator rather than an `attach*` function because where the opening focus landed must
 * outlive one attachment: it is read when an action settles, phases later.
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
   * Whether the opening focus has been decided, including the decision *not* to take it —
   * `openingFocus` cannot carry that, since `null` is also "nothing to focus".
   */
  let settled = false;
  /**
   * The last element inside to take focus, remembered from `focusin` rather than read at action
   * start: a binding that disables its button from its own synchronous engine subscriber
   * (`umbra/vanilla` does) blurs the element before this coordinator could read it.
   */
  let lastFocusInside: HTMLElement | null = null;
  /**
   * The last control *activated*, which is the only useful answer on WebKit: it does not focus a
   * clicked `<button>`, so neither `activeElement` nor `focusin` can name what ran the action —
   * both answer with whatever held focus before the press. A `click` names it on every engine.
   */
  let lastActivated: HTMLElement | null = null;

  /**
   * Which action is running, by reason.
   *
   * The identity that outlives its button: a fine-grained renderer replaces the node when the
   * action's state changes, so every element the reads below capture can be detached by the time the
   * restore runs. Asked of the engine rather than read off an element, so it answers for an action
   * nothing pressed too.
   */
  const runningReason = (): string | null => {
    for (const [reason, state] of Object.entries(engine.getSnapshot().states)) {
      if (state.isRunning) {
        return reason;
      }
    }
    return null;
  };

  return {
    /**
     * Bring focus handling in line with a phase, and return the teardown for what it attached.
     *
     * Call it whenever the phase changes, tearing down the previous attachment first.
     */
    sync(phase: ModalPhase): (() => void) | undefined {
      // Clear on close, but after the floor: by this pass the platform's own restore has had its
      // turn, so a keyboard still on `<body>` is one the close stranded. See `restoreOpenerFocus`.
      if (phase === 'closed') {
        const dialog = getDialog();
        if (dialog) {
          restoreOpenerFocus(dialog);
        }
        openingFocus = null;
        settled = false;
        lastFocusInside = null;
        lastActivated = null;
        return undefined;
      }

      // Settle the opening focus once open — unless something else is in front, since a dialog
      // opening *underneath* another would leave the one the user is looking at with no focus and
      // so no dismiss key. Asked of the manager, which is what knows the order; declining is all
      // this does, and the watcher below puts focus back.
      if (phase === 'open' && !settled) {
        const dialog = getDialog();
        if (dialog) {
          settled = true;
          openingFocus = manager.lookup().isForeground(modalId) ? settleOpeningFocus(dialog) : null;
        }
      }

      // Subscribed to the engine so the restore fires on every `hasRunningAction` transition
      // whether or not the binding re-renders; both flags are per-attachment.
      let wasRunning = false;
      let runner: HTMLElement | null = null;
      /** The reason behind `runner`, kept so the button can be found again if the node went away. */
      let runnerReason: string | null = null;
      let frame = 0;

      // A frame later, because the engine notifies synchronously while the button is still
      // `disabled` and cannot take focus.
      const scheduleRestore = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const dialog = getDialog();
          if (!dialog?.open) {
            return;
          }
          // Not while something else is in front: an action settling *underneath* the dialog the
          // user is looking at has no claim on their keyboard. A guard rather than an assumption —
          // Chromium's top-layer inertness makes this `focus()` a silent no-op, WebKit lets it
          // through, and CI found the difference.
          if (!manager.lookup().isForeground(modalId)) {
            return;
          }
          // The captured element first — it is the one that actually ran the action — then the same
          // button found again by reason, which is the answer when the renderer replaced the node.
          // `chooseActionRunner` skips a detached candidate at either position.
          const found = runnerReason === null ? null : findActionButton(dialog, runnerReason);
          restoreFocus(
            dialog,
            preferredRestoreTarget(chooseActionRunner(runner, found), openingFocus)
          );
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
            // Three reads, narrowing. The live one is the most specific and is what the hook
            // bindings give on an engine that focuses what it clicks. The activation is the only
            // one that survives WebKit refusing to. `lastFocusInside` is the floor for an action
            // that nothing pressed — a hotkey on a control already focused, or a programmatic
            // start. See both declarations.
            runner = chooseActionRunner(
              captureActionRunner(getDialog()),
              lastActivated,
              lastFocusInside
            );
            // Read at the same instant and for the same reason: this is the one moment the engine
            // names the running action, and the only identity that survives to the restore.
            runnerReason = runningReason();
          }
          wasRunning = true;
          return;
        }
        const dialog = getDialog();
        if (!dialog?.open) {
          return;
        }
        if (wasRunning) {
          // Unconditional on running → idle: covers the async escape and the sync throw alike.
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

      // Remember focus as it arrives, scoped with `isOwnEventTarget`: both events bubble, and a
      // nested modal renders in this subtree, so the one underneath would restore to its button.
      //
      // **Bound to the root, and the dialog resolved per event.** Binding to the element is the
      // obvious shape and it silently stops working: a renderer that replaces the `<dialog>` leaves
      // every listener on an orphan, and nothing re-attaches them — this step's inputs are the phase
      // alone, which does not change when the node does. The bookkeeping then reports an empty
      // memory for the rest of the dialog's life, so a restore that depends on it does nothing.
      // Measured under a loaded suite: the handler was never once called while the events reached
      // the dialog on screen throughout. The root outlives the node, and `getRootNode()` rather than
      // `document` keeps a dialog inside a shadow root heard in its own tree.
      let stopRemembering: (() => void) | undefined;
      const watched = getDialog();
      const eventRoot = watched?.getRootNode();
      if (eventRoot) {
        /** This dialog's own subtree, as it stands right now — never as it stood at attach time. */
        const ownTarget = (event: Event): HTMLElement | null => {
          const dialog = getDialog();
          const { target } = event;
          return dialog &&
            target instanceof HTMLElement &&
            target !== dialog &&
            isOwnEventTarget(dialog, target)
            ? target
            : null;
        };

        const remember = (event: Event) => {
          const target = ownTarget(event);
          if (target) {
            lastFocusInside = target;
          }
        };
        // `closest` because the press often lands on a label or icon inside the control. Capture
        // is load-bearing: the engine notifies synchronously from the button's own handler, so a
        // bubbling listener would hear the click after the restore target had been chosen.
        //
        // A press outside this dialog leaves the memory alone rather than clearing it: on the root
        // this listener hears the whole page, where on the element it heard only its own.
        const rememberActivation = (event: Event) => {
          const target = ownTarget(event);
          if (target) {
            lastActivated = target.closest<HTMLElement>('button, [role="button"]');
          }
        };
        eventRoot.addEventListener('focusin', remember);
        eventRoot.addEventListener('click', rememberActivation, true);
        stopRemembering = () => {
          eventRoot.removeEventListener('focusin', remember);
          eventRoot.removeEventListener('click', rememberActivation, true);
        };
      }

      // ── Taking the focus back when the stack moves ────────────────────────
      //
      // Every dialog answers for its own focus, by watching the manager: it owns its element (no
      // `document.querySelector`, which finds nothing in a shadow root), it remembers where focus
      // actually was rather than re-honouring `focusOnOpen` over a caret, and it hears every way
      // the stack moves — including the close that leaves it in front. The snapshot changes on
      // dialog transitions and nothing else, so a click on the page behind never reaches here.
      let stopWatchingStack: (() => void) | undefined;
      let stopWatchingStrand: (() => void) | undefined;
      /** Its own handle: the restore's `frame` is a different question, asked at a different time. */
      let strandedTimer: ReturnType<typeof setTimeout> | undefined;
      if (phase === 'open') {
        const reclaimIfInFront = () => {
          const dialog = getDialog();
          if (!dialog?.open) {
            return;
          }
          const info = manager.lookup(modalId);
          if (!info.isForeground || (info.exists && info.nonModal)) {
            // Modal only, as a rule: a non-modal panel never owned the page's focus, and its
            // dismiss key comes from `attachWindowDismissKey`, which answers wherever focus is. A
            // modal has no such listener — its keydown is scoped to itself — so focus is its
            // keyboard.
            return;
          }
          if (dialog.contains(activeWithin(dialog))) {
            // Ours already — though "ours" is not "where the user was": a raise re-shows the
            // dialog and `showModal()` focuses its first control, satisfying this guard and losing
            // a caret. Fixing it needs a window `raiseDialog` publishes and this reads, so the
            // raise's own `focusin` stops overwriting the memory. Known limit, pinned by "keeps
            // the keyboard when something opens over it" in `vanilla/__tests__/bind-dialog.ct.tsx`.
            return;
          }
          openingFocus = reclaimFocus(dialog, lastFocusInside) ?? openingFocus;
        };
        stopWatchingStack = manager.subscribeSnapshot(reclaimIfInFront);

        // ── …and when a control inside strands it ──────────────────────────
        //
        // The stack is not the only way a modal loses its keyboard: a control that disables itself
        // — the shape of every loading button — is blurred by the engine, and focus lands on
        // `<body>`, where this dialog's keydown listener cannot hear it. Only the platform's own
        // `cancel` still works, which is why such a dialog answers Escape and no other hotkey.
        //
        // **It gives the keyboard back to that control and to nothing else.** Sending it to the
        // dialog's first focusable instead would end an ordinary "saving…" on the confirm button,
        // where the Enter meant for the work commits the dialog — a repair worth less than the
        // fault. So a strand this cannot undo is left alone: focus stays where the engine put it,
        // which is exactly the state without this listener.
        //
        // `relatedTarget === null` is what says *stranded* rather than *moved*: focus going to
        // another element is somebody's choice and carries its destination, while focus going
        // nowhere is what the engine does when the thing holding it stops being focusable.
        if (watched) {
          let watchEnable: MutationObserver | undefined;

          const giveItBack = (control: HTMLElement) => {
            const dialog = getDialog();
            const info = manager.lookup(modalId);
            // The same three guards the stack path uses, for the same reasons — and one more: if
            // focus has since landed somewhere real, the user moved on and this is stale.
            if (
              !dialog?.open ||
              !info.isForeground ||
              (info.exists && info.nonModal) ||
              dialog.contains(activeWithin(dialog)) ||
              !control.isConnected
            ) {
              return;
            }
            restoreFocus(dialog, control);
          };

          const reclaimIfStranded = (raised: Event) => {
            const event: FocusEvent | null = raised instanceof FocusEvent ? raised : null;
            const control = event?.target ?? null;
            if (!event) {
              return;
            }
            // Resolved per event, never captured: a renderer may replace the `<dialog>` between the
            // open and the strand, and a listener bound to the node this attachment started with
            // then hears nothing at all. Measured — under a loaded suite the handler simply stopped
            // being called, while the event was reaching the dialog on screen the whole time.
            const dialog = getDialog();
            if (
              event.relatedTarget !== null ||
              !(control instanceof HTMLElement) ||
              !dialog ||
              // The dialog itself is not a control to hand anything back to: `showModal()` focuses
              // it when nothing inside can take focus, and restoring *it* would make
              // `dialog.contains(activeWithin())` true — reflexively — of a dialog holding nobody.
              control === dialog ||
              // Scoped like the two listeners above, and for their reason: `focusout` bubbles, and
              // a nested dialog renders in this subtree.
              !isOwnEventTarget(dialog, control)
            ) {
              return;
            }
            watchEnable?.disconnect();

            // Armed **synchronously and over the whole dialog**, because neither narrowing survives
            // contact: work that finishes inside the same task re-enables the control before any
            // deferral could arm this, and watching that one element for `disabled` misses every
            // other way a renderer brings it back — a re-created node, a wrapper toggled around it,
            // a property set without the attribute. Anything changing in the dialog is the cue to
            // re-ask a cheap question, and the answer disconnects it.
            // **Disconnected on success, not on the first attempt.** The control coming back and the
            // control being focusable are not the same instant — a renderer that re-enables it and
            // re-paints it in the same batch will refuse the focus in between, and a one-shot
            // observer spends its only try there and leaves the keyboard on the page. Every later
            // mutation is another chance, so the repair costs a predicate rather than a guess about
            // when the DOM has settled.
            watchEnable = new MutationObserver(() => {
              if (control.matches(':disabled') || !control.isConnected) {
                return;
              }
              giveItBack(control);
              const dialog = getDialog();
              if (dialog && dialog.contains(activeWithin(dialog))) {
                watchEnable?.disconnect();
              }
            });
            watchEnable.observe(dialog, { subtree: true, childList: true, attributes: true });

            // The other shape: a control blurred without being disabled — hidden, or re-rendered
            // away. A task later, so the renderer has committed and may have placed focus itself,
            // and on a timer rather than a frame because a page the engine is not painting
            // throttles `requestAnimationFrame`, and this must not depend on being visible.
            clearTimeout(strandedTimer);
            strandedTimer = setTimeout(() => {
              if (!control.matches(':disabled')) {
                watchEnable?.disconnect();
                giveItBack(control);
              }
            }, 0);
          };

          // Bound to the **root**, not to the element: `focusout` bubbles there either way, and the
          // root outlives a dialog its renderer replaces. `getRootNode()` rather than `document`, so
          // a dialog inside a shadow root is heard in its own tree instead of at a boundary the
          // event is retargeted across.
          const strandRoot = watched.getRootNode();
          strandRoot.addEventListener('focusout', reclaimIfStranded);
          stopWatchingStrand = () => {
            watchEnable?.disconnect();
            strandRoot.removeEventListener('focusout', reclaimIfStranded);
          };
        }
      }

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(strandedTimer);
        stopRemembering?.();
        stopWatchingStack?.();
        stopWatchingStrand?.();
        unsubscribe();
      };
    },
  };
}

/** The coordinator as its consumers see it. */
export type FocusCoordinator = ReturnType<typeof createFocusCoordinator>;
