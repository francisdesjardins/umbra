import { isOwnEventTarget } from '../utils/dialog-scope.js';
import { isRaisingDialog, restoreOpenerFocus, watchOpenerActivation } from './dialog-lifecycle.js';
import {
  activeWithin,
  captureActionRunner,
  findActionButton,
  reclaimFocus,
  restoreFocus,
  settleOpeningFocus,
} from './focus-policy.js';
import {
  chooseActionRunner,
  divergedFromMemory,
  preferredRestoreTarget,
} from '../utils/focus-restore-policy.js';
import type { ActionGate } from '../actions/action-engine.js';
import type { FocusCoordinatorOptions, DialogDomContext } from './attach-types.js';
import type { DialogPhase } from './types.js';

/**
 * What the steps below need to know about the dialog they are wiring: the focus half of
 * {@link DialogDomContext}, minus the `phase` — which each step is handed on its own, because it is
 * what decides whether that step runs at all.
 */
type FocusContext = Pick<DialogDomContext, 'getDialog' | 'dialogId' | 'manager' | 'store'>;

/**
 * The bookkeeping that outlives one attachment, which is the whole reason this file exports a
 * coordinator rather than an `attach*` function: where the opening focus landed is read when an
 * action settles, phases later.
 *
 * One mutable cell rather than four parameters, because two steps *write* it — the opening pass
 * decides `openingFocus` and {@link attachStackReclaim} revises it when it takes the keyboard back.
 * Everything else a step needs is per-attachment and lives inside that step, which is what makes
 * this the whole of the shared state.
 */
type FocusMemory = {
  /** Where the opening pass put the caret, and the floor every later restore falls back to. */
  openingFocus: HTMLElement | null;
  /**
   * Whether the opening focus has been decided, including the decision *not* to take it —
   * `openingFocus` cannot carry that, since `null` is also "nothing to focus".
   */
  settled: boolean;
  /**
   * The last element inside to take focus, remembered from `focusin` rather than read at action
   * start: a binding that disables its button from its own synchronous engine subscriber
   * (`umbra/vanilla` does) blurs the element before this coordinator could read it.
   */
  lastFocusInside: HTMLElement | null;
  /**
   * The last control *activated*, which is the only useful answer on WebKit: it does not focus a
   * clicked `<button>`, so neither `activeElement` nor `focusin` can name what ran the action —
   * both answer with whatever held focus before the press. A `click` names it on every engine.
   */
  lastActivated: HTMLElement | null;
};

/** What the action restore needs beyond the context, in the `(ctx, options)` shape every
 * `attach*` function takes: the engine it listens to, the memory it reads, and the phase that
 * decides whether it does anything at all. */
type ActionRestoreOptions = {
  readonly engine: ActionGate;
  readonly memory: FocusMemory;
  readonly phase: DialogPhase;
};

const createFocusMemory = (): FocusMemory => {
  return { openingFocus: null, settled: false, lastFocusInside: null, lastActivated: null };
};

/**
 * Which action is running, by reason.
 *
 * The identity that outlives its button: a fine-grained renderer replaces the node when the
 * action's state changes, so every element the reads below capture can be detached by the time the
 * restore runs. Asked of the engine rather than read off an element, so it answers for an action
 * nothing pressed too.
 */
function runningReason(engine: ActionGate): string | null {
  for (const [reason, state] of Object.entries(engine.getSnapshot().states)) {
    if (state.isRunning) {
      return reason;
    }
  }
  return null;
}

/**
 * Whether this dialog is the one the keyboard belongs to — the guard both reclaim steps open with,
 * which is why it is named once rather than spelled twice.
 *
 * Dialog only: a non-modal panel never owned the page's focus, and its dismiss key comes from
 * `attachWindowDismissKey`, which answers wherever focus is. A dialog's keydown is scoped to
 * itself, so focus is its keyboard.
 */
function ownsKeyboard(
  ctx: FocusContext,
  dialog: HTMLDialogElement | null
): dialog is HTMLDialogElement {
  if (!dialog?.open) {
    return false;
  }
  const info = ctx.manager.lookup(ctx.dialogId);
  return info.isForeground && !(info.exists && info.nonModal);
}

/**
 * The closing pass: hand the caret back to the opener, then forget everything.
 *
 * Cleared after the restore rather than before — by this pass the platform's own has had its turn,
 * which is what makes where focus landed readable at all. See `restoreOpenerFocus`.
 */
function releaseOnClose(ctx: FocusContext, memory: FocusMemory): void {
  const dialog = ctx.getDialog();
  if (dialog) {
    restoreOpenerFocus(dialog, () => {
      return ctx.store.resolveRestoreTarget();
    });
  }
  memory.openingFocus = null;
  memory.settled = false;
  memory.lastFocusInside = null;
  memory.lastActivated = null;
}

/**
 * The opening pass, run once per open.
 *
 * Declined when something else is in front: focusing a dialog opening *underneath* another would
 * leave the one the user is looking at without its dismiss key. The manager knows the order;
 * {@link attachStackReclaim} hands focus back.
 */
function takeOpeningFocus(ctx: FocusContext, memory: FocusMemory): void {
  const dialog = ctx.getDialog();
  if (!dialog) {
    return;
  }
  memory.settled = true;
  memory.openingFocus = ctx.manager.lookup().isForeground(ctx.dialogId)
    ? settleOpeningFocus(dialog)
    : null;
}

/**
 * Put the caret back on the control that ran an action, once that action settles.
 *
 * Subscribed to the engine so the restore fires on every `hasRunningAction` transition whether or
 * not the binding re-renders; every flag it keeps is per-attachment, which is what makes them
 * locals here rather than more shared memory.
 *
 * @returns A teardown that cancels the pending frame and unsubscribes.
 */
function attachActionRestore(ctx: FocusContext, options: ActionRestoreOptions): () => void {
  const { getDialog, dialogId, manager } = ctx;
  const { engine, memory, phase } = options;

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
      // An action settling *underneath* the dialog in front has no claim on the keyboard. A
      // guard rather than an assumption: Chromium's top-layer inertness makes this `focus()` a
      // silent no-op where WebKit lets it through.
      if (!manager.lookup().isForeground(dialogId)) {
        return;
      }
      // The captured element first — it is the one that actually ran the action — then the same
      // button found again by reason, which is the answer when the renderer replaced the node.
      // `chooseActionRunner` skips a detached candidate at either position.
      const found = runnerReason === null ? null : findActionButton(dialog, runnerReason);
      restoreFocus(
        dialog,
        preferredRestoreTarget(chooseActionRunner(runner, found), memory.openingFocus)
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
        // Three reads, narrowing: the live one where the engine focuses what it clicks, the
        // activation where WebKit refuses to, and `lastFocusInside` as the floor for an action
        // nothing pressed. See both declarations.
        runner = chooseActionRunner(
          captureActionRunner(getDialog()),
          memory.lastActivated,
          memory.lastFocusInside
        );
        // Read at the same instant and for the same reason: this is the one moment the engine
        // names the running action, and the only identity that survives to the restore.
        runnerReason = runningReason(engine);
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
      restoreFocus(dialog, memory.openingFocus);
    }
  };

  const unsubscribe = engine.subscribe(check);

  return () => {
    cancelAnimationFrame(frame);
    unsubscribe();
  };
}

/**
 * Record where focus lands inside this dialog, and what the reader activates — the two memories
 * every restore above and below reads.
 *
 * Scoped with `isOwnEventTarget`: both events bubble, and a nested dialog renders in this subtree.
 * Bound to the **root**, dialog resolved per event — this step's input is the phase, so a renderer
 * replacing the node re-attaches nothing and an orphaned listener goes silent.
 *
 * @returns A teardown that removes both listeners, or `undefined` when there was no dialog to take
 *   a root from.
 */
function attachFocusMemory(ctx: FocusContext, memory: FocusMemory): (() => void) | undefined {
  const { getDialog } = ctx;
  const eventRoot = getDialog()?.getRootNode();
  if (!eventRoot) {
    return undefined;
  }

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
    // A raise is `close()` + `showModal()`, so the engine focuses something on the way back —
    // the library's own doing, arriving as an ordinary `focusin`. Recording it would overwrite
    // the caret this memory exists to restore.
    if (isRaisingDialog()) {
      return;
    }
    const target = ownTarget(event);
    if (target) {
      memory.lastFocusInside = target;
    }
  };

  // `closest` because the press often lands on a label or icon inside the control; capture
  // because the engine notifies synchronously from the button's own handler, so a bubbling
  // listener would hear the click too late. A press outside leaves the memory alone.
  const rememberActivation = (event: Event) => {
    const target = ownTarget(event);
    if (target) {
      memory.lastActivated = target.closest<HTMLElement>('button, [role="button"]');
    }
  };

  eventRoot.addEventListener('focusin', remember);
  eventRoot.addEventListener('click', rememberActivation, true);

  return () => {
    eventRoot.removeEventListener('focusin', remember);
    eventRoot.removeEventListener('click', rememberActivation, true);
  };
}

/**
 * Take the focus back when the stack moves.
 *
 * Every dialog answers for its own focus by watching the manager: it owns its element, it restores
 * the caret rather than re-honouring `focusOnOpen`, and it hears every way the stack moves — the
 * close that leaves it in front included.
 *
 * @returns A teardown that unsubscribes from the manager.
 */
function attachStackReclaim(ctx: FocusContext, memory: FocusMemory): () => void {
  const { getDialog, manager } = ctx;

  const reclaimIfInFront = () => {
    const dialog = getDialog();
    if (!ownsKeyboard(ctx, dialog)) {
      return;
    }
    const active = activeWithin(dialog);
    if (
      dialog.contains(active) &&
      !divergedFromMemory({ active, dialog, remembered: memory.lastFocusInside })
    ) {
      // Ours, and standing where the memory says it should — nothing to do.
      return;
    }
    memory.openingFocus = reclaimFocus(dialog, memory.lastFocusInside) ?? memory.openingFocus;
  };

  return manager.subscribeSnapshot(reclaimIfInFront);
}

/**
 * Take the focus back when a control inside strands it.
 *
 * A control that disables itself — every loading button — is blurred by the engine and focus lands
 * on `<body>`, out of reach of this dialog's keydown. It goes back to that control alone: the first
 * focusable would put the Enter meant for the work on confirm.
 *
 * The one step that reads no {@link FocusMemory}: the control it hands focus back to is the one the
 * `focusout` names, so there is nothing here to remember between passes.
 *
 * @returns A teardown that clears the timer, disconnects the observer and removes the listener, or
 *   `undefined` when there was no dialog to take a root from.
 */
function attachStrandReclaim(ctx: FocusContext): (() => void) | undefined {
  const { getDialog } = ctx;
  const watched = getDialog();
  if (!watched) {
    return undefined;
  }

  let watchEnable: MutationObserver | undefined;
  /** Its own handle: the restore's frame is a different question, asked at a different time. */
  let strandedTimer: ReturnType<typeof setTimeout> | undefined;

  const giveItBack = (control: HTMLElement) => {
    const dialog = getDialog();
    // The guard the stack path uses, and two more: focus that has since landed somewhere real
    // means the user moved on and this is stale, and a control out of the DOM is no target.
    if (
      !ownsKeyboard(ctx, dialog) ||
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
    // then hears nothing at all.
    const dialog = getDialog();
    if (
      // *Stranded* rather than *moved*: focus going somewhere carries its destination,
      // where focus going nowhere is what the engine does to a control that stops being
      // focusable.
      event.relatedTarget !== null ||
      !(control instanceof HTMLElement) ||
      !dialog ||
      // The dialog itself is not a control to hand anything back to: `showModal()` focuses
      // it when nothing inside can take focus, and restoring *it* would make
      // `dialog.contains(activeWithin())` true — reflexively — of a dialog holding nobody.
      control === dialog ||
      // Scoped like the two listeners in `attachFocusMemory`, and for their reason: `focusout`
      // bubbles, and a nested dialog renders in this subtree.
      !isOwnEventTarget(dialog, control)
    ) {
      return;
    }
    watchEnable?.disconnect();

    // Armed **synchronously and over the whole dialog**: work finishing in the same task
    // beats any deferral, and watching that one element misses a re-created node.
    // Disconnected on success rather than on the first try, which a renderer re-enabling
    // and re-painting in one batch refuses.
    watchEnable = new MutationObserver(() => {
      if (control.matches(':disabled') || !control.isConnected) {
        return;
      }
      giveItBack(control);
      const settledInside = getDialog();
      if (settledInside && settledInside.contains(activeWithin(settledInside))) {
        watchEnable?.disconnect();
      }
    });
    watchEnable.observe(dialog, { subtree: true, childList: true, attributes: true });

    // The other shape: a control blurred without being disabled. A task later, so the
    // renderer has committed, and on a timer rather than a frame because a page the engine
    // is not painting throttles `requestAnimationFrame`.
    clearTimeout(strandedTimer);
    strandedTimer = setTimeout(() => {
      if (!control.matches(':disabled')) {
        watchEnable?.disconnect();
        giveItBack(control);
      }
    }, 0);
  };

  // Bound to the **root**, which outlives a dialog its renderer replaces. `getRootNode()`
  // rather than `document`, so a dialog inside a shadow root is heard in its own tree
  // instead of at a boundary the event is retargeted across.
  const strandRoot = watched.getRootNode();
  strandRoot.addEventListener('focusout', reclaimIfStranded);

  return () => {
    clearTimeout(strandedTimer);
    watchEnable?.disconnect();
    strandRoot.removeEventListener('focusout', reclaimIfStranded);
  };
}

/**
 * The scheduling half of the focus policy — where `focus-policy.ts`'s decisions are asked. A
 * coordinator rather than an `attach*` function because where the opening focus landed must
 * outlive one attachment: it is read when an action settles, phases later.
 *
 * @internal Not part of the public API.
 */
export function createFocusCoordinator(ctx: FocusContext, options: FocusCoordinatorOptions) {
  const { engine } = options;
  const memory = createFocusMemory();

  /**
   * Recording who the reader activated outside this dialog, so the show has an opener to capture on
   * the engine that focuses no clicked button. Armed on the first pass rather than at construction —
   * a director is built inside a `useState` initializer, and StrictMode both re-runs that and runs
   * an extra cleanup, so a listener bound here would be attached twice and released while the
   * dialog still lives. Re-armed by the next pass for the same reason.
   */
  let releaseActivationWatch: (() => void) | undefined;

  return {
    /** Stop recording activations. Called when the dialog this coordinator belongs to goes away. */
    destroy(): void {
      releaseActivationWatch?.();
      releaseActivationWatch = undefined;
    },

    /**
     * Bring focus handling in line with a phase, and return the teardown for what it attached.
     *
     * Call it whenever the phase changes, tearing down the previous attachment first.
     *
     * Four steps, each answering for its own listeners and its own teardown: the action restore and
     * the two memories run for every phase that is not `closed`, and the two reclaims only while
     * the dialog is `open`.
     */
    sync(phase: DialogPhase): (() => void) | undefined {
      releaseActivationWatch ??= watchOpenerActivation();

      if (phase === 'closed') {
        releaseOnClose(ctx, memory);
        return undefined;
      }

      if (phase === 'open' && !memory.settled) {
        takeOpeningFocus(ctx, memory);
      }

      const steps = [
        attachActionRestore(ctx, { engine, memory, phase }),
        attachFocusMemory(ctx, memory),
        ...(phase === 'open' ? [attachStackReclaim(ctx, memory), attachStrandReclaim(ctx)] : []),
      ];

      return () => {
        for (const stop of steps) {
          stop?.();
        }
      };
    },
  };
}

/** The coordinator as its consumers see it. */
export type FocusCoordinator = ReturnType<typeof createFocusCoordinator>;
