import { createActionEngine } from '../actions/action-engine.js';
import { canDismiss } from '../utils/dismiss-gate.js';
import { Key } from '../utils/keys.js';
import { createLogger } from '../utils/logger.js';
import { isBackdropClick, type BackdropClickEvent, type BackdropDialog } from './dialog-props.js';
import { DISMISS_REASON } from './dismiss-reason.js';
import { finalizeModalClose } from './finalize-close.js';
import { createModalStore } from './modal-store.js';
import { dialogPlacement, type DialogPlacement } from './placement.js';
import type { ActionGate } from '../actions/action-engine.js';
import type { HotkeyDef } from '../actions/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';
import type { ModalStore } from './modal-store.js';
import type { AwaitedClose, ModalHandle, ModalVariant } from './types.js';

const log = createLogger('modal');

/**
 * The parts of a modal that are the same in every binding — options in, doors out, teardown.
 *
 * Everything here was written twice before Solid existed and was identical both times, which is
 * the only test that matters for "does this belong in the core". What is left in a binding after
 * this is renderer work: creating a node, scheduling an effect, and bridging a store to whatever
 * that framework calls reactive.
 */

// ── Option resolution ────────────────────────────────────────────────────────

/**
 * The option fields whose defaults and variant-narrowing are shared. Deliberately structural
 * rather than `UseModalOptions<…>`: it takes four type parameters, and none of them affects a
 * single answer computed here.
 */
export type UnresolvedModalOptions = ModalVariant & {
  readonly portal?: boolean | undefined;
  readonly clipContainer?: boolean | undefined;
  readonly dismissWhilePreparing?: boolean | undefined;
  readonly dismissKey?: HotkeyDef | false | undefined;
  readonly containFocus?: boolean | undefined;
  readonly template?: string | undefined;
};

/** Every option a binding needs resolved before it can render or wire anything. */
export type ResolvedModalOptions = {
  readonly isNonModal: boolean;
  readonly shouldPortal: boolean;
  /** Modal variant only; `undefined` means "decide from whether any action was drawn". */
  readonly dismissOnBackdropClick: boolean | undefined;
  /** Non-modal variant only. */
  readonly dismissOnClickOutside: boolean;
  readonly dismissWhilePreparing: boolean;
  readonly dismissKey: HotkeyDef | false;
  readonly containFocus: boolean;
  readonly template: string;
  readonly placement: DialogPlacement;
};

/**
 * Apply the defaults and narrow the variant.
 *
 * The variant narrowing is the part worth having in one place: `dismissOnBackdropClick` exists
 * only on the modal branch and `dismissOnClickOutside` only on the non-modal one, so reading
 * either without checking `nonModal` first is a type error in the core and a silently-ignored
 * option in a binding that got it wrong.
 *
 * `animation` is **not** resolved here. Its fallback is a concrete literal, and a function
 * generic over the binding's style type could not return it — so each binding keeps the one
 * annotated line, which is also where the comment explaining the annotation belongs.
 */
export function resolveModalOptions(options: UnresolvedModalOptions): ResolvedModalOptions {
  const isNonModal = options.nonModal ?? false;
  const shouldPortal = options.portal ?? false;

  return {
    isNonModal,
    shouldPortal,
    dismissOnBackdropClick: options.nonModal !== true ? options.dismissOnBackdropClick : undefined,
    dismissOnClickOutside:
      options.nonModal === true ? (options.dismissOnClickOutside ?? false) : false,
    dismissWhilePreparing: options.dismissWhilePreparing ?? true,
    dismissKey: options.dismissKey ?? Key.Escape,
    // Off by default, for both variants and for opposite reasons: a modal dialog is contained by
    // the browser already, and a non-modal one is often a toast or a popover, where trapping Tab
    // would be the defect rather than the fix.
    containFocus: options.containFocus ?? false,
    template: options.template ?? 'modal',
    // Where this dialog is positioned from, and what it has to be positioned *against*. The
    // rules — and why a contained dialog needs a host at all — live in `core/placement.ts`.
    placement: dialogPlacement({
      nonModal: isNonModal,
      portal: shouldPortal,
      clip: options.clipContainer ?? false,
    }),
  };
}

// ── The runtime ──────────────────────────────────────────────────────────────

/**
 * The modal's state and the three doors onto it, built once per modal.
 *
 * The engine is created here rather than handed in, so it can be wired straight to this modal's
 * `close`: nothing has to bridge the two because nothing built it anywhere else.
 *
 * React holds the result in a `useState` initializer and Solid simply keeps the value, but both
 * get the same guarantee for the same reason — `open`, `openAndWait` and `handle` close over the
 * store alone, so their identity is stable for the modal's lifetime. In React that is what lets
 * them be used as effect dependencies (the compiler cannot memoize them: it treats the store as
 * opaque).
 */
export function createModalRuntime<TData = void, TReason extends string = string>(modalId: string) {
  const store = createModalStore<TData, TReason>(modalId);
  const engine = createActionEngine<TData, TReason>(modalId);
  engine.bindClose((reason, data) => {
    store.close(reason, data);
  });

  // The store decides which branch settles the promise (start / join an in-flight open / resolve
  // immediately) — it owns the state machine, so it owns the rule.
  const open = (): Promise<void> => {
    return new Promise((resolve) => {
      store.beginOpen(resolve);
    });
  };

  /**
   * The resolver goes on **before** the open is requested, and that ordering is the whole method
   * — it is why the store's `addCloseResolver` is not public. A close resolver waits for the
   * *next* close by design, so one registered afterwards waits for a close that will never come;
   * `prepare` is what makes that window wide enough to fall into, since `finalize` flushes the
   * open resolvers defensively and an `open()` would return as if nothing had happened. Pinned by
   * `modal-store.test.ts` and by `open-and-wait.story.tsx`.
   */
  const openAndWait = (): Promise<AwaitedClose<TData, TReason>> => {
    const closed = new Promise<AwaitedClose<TData, TReason>>((resolve) => {
      store.addCloseResolver(resolve);
    });
    store.beginOpen();
    return closed;
  };

  const handle: ModalHandle<TData, TReason> = {
    close: (reason = DISMISS_REASON, data?: TData) => {
      store.close(reason, data);
    },
  };

  return { store, engine, open, openAndWait, handle };
}

/** What {@link createModalRuntime} produces. */
export type ModalRuntime<TData = void, TReason extends string = string> = ReturnType<
  typeof createModalRuntime<TData, TReason>
>;

// ── Backdrop dismissal ───────────────────────────────────────────────────────

/** What the backdrop decision needs to know beyond the click itself. */
export type BackdropDismissOptions = {
  readonly store: ModalStore;
  readonly engine: ActionGate;
  readonly isNonModal: boolean;
  readonly dismissOnBackdropClick: boolean | undefined;
  readonly dismissWhilePreparing: boolean;
};

/**
 * Whether this click should dismiss the modal — the full chain, in order.
 *
 * Four questions, and each one exists: a non-modal dialog has no backdrop at all; dismissal is
 * opt-out without actions and opt-in with them (a modal offering buttons wants to be dismissed
 * through one); the shared gate covers phase, `prepare` and a running action; and only then does
 * the geometry decide whether the pointer actually landed outside the box.
 */
export function shouldDismissOnBackdropClick(
  event: BackdropClickEvent,
  dialog: BackdropDialog,
  options: BackdropDismissOptions
): boolean {
  const { store, engine, isNonModal, dismissOnBackdropClick, dismissWhilePreparing } = options;

  if (isNonModal) {
    return false;
  }

  if (!(dismissOnBackdropClick ?? !engine.hasActions())) {
    return false;
  }

  const snapshot = store.getSnapshot();
  if (
    !canDismiss({
      phase: snapshot.phase,
      isPreparing: snapshot.isPreparing,
      dismissWhilePreparing,
      hasRunningAction: engine.aggregated().hasRunningAction,
    })
  ) {
    return false;
  }

  return isBackdropClick(event, dialog);
}

// ── Teardown ─────────────────────────────────────────────────────────────────

/**
 * Unregister the modal and settle everything still waiting on it.
 *
 * Called from a React effect cleanup and from a Solid `onCleanup`, and the body is the same
 * because none of it is scheduling: a modal torn down while open is a close nobody reported, and
 * a modal torn down while closed can still have a resolver waiting for a close that will now
 * never come. `store.abandon()` is unconditional for that second case — after a normal close both
 * queues are already drained, so it costs nothing where it does not apply.
 */
export function teardownModal(
  store: ModalStore,
  manager: DialogManager,
  modalId: string,
  dialog: HTMLDialogElement | null
): void {
  const wasOpen = store.getSnapshot().phase !== 'closed';

  manager.unregister(modalId);

  if (wasOpen) {
    log('Tearing down open modal', { id: modalId });

    // If not already closing, this initiates the close with a 'dismiss' reason so `closeResult`
    // is set for both `onClose` and the close resolvers (it also cancels any pending open frame).
    // If already closing, it is a no-op and `closeResult` keeps the original reason.
    store.close(DISMISS_REASON);

    finalizeModalClose(store, dialog, (error) => {
      log.error('onClose callback failed during cleanup', { id: modalId, error: error.message });
    });
  }

  store.abandon();
}
