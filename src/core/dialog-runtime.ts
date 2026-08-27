import { createActionEngine } from '../actions/action-engine.js';
import { canDismiss } from '../utils/dismiss-gate.js';
import { Key } from '../utils/keys.js';
import { createLogger } from '../utils/logger.js';
import { isBackdropClick, type BackdropClickEvent, type BackdropDialog } from './dialog-props.js';
import { DISMISS_REASON } from './dismiss-reason.js';
import { finalizeDialogClose } from './finalize-close.js';
import { createDialogStore } from './dialog-store.js';
import { dialogPlacement, type DialogPlacement } from './placement.js';
import type { ActionGate } from '../actions/action-engine.js';
import type { DialogId } from './registry.js';
import type { HotkeyDef } from '../actions/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';
import type { DialogStore } from './dialog-store.js';
import type {
  AwaitedClose,
  DialogFailure,
  DialogHandle,
  DialogVariant,
  PortalTarget,
} from './types.js';

const log = createLogger('dialog');

/**
 * The parts of a dialog that are the same in every binding — options in, doors out, teardown.
 *
 * Everything here was written twice before Solid existed and was identical both times, which is
 * the only test that matters for "does this belong in the core". What is left in a binding after
 * this is renderer work: creating a node, scheduling an effect, and bridging a store to whatever
 * that framework calls reactive.
 */

// ── Option resolution ────────────────────────────────────────────────────────

/**
 * The option fields whose defaults and variant-narrowing are shared. Deliberately structural
 * rather than `UseDialogOptions<…>`: it takes four type parameters, and none of them affects a
 * single answer computed here.
 */
export type UnresolvedDialogOptions = DialogVariant & {
  readonly portal?: PortalTarget | undefined;
  readonly clipContainer?: boolean | undefined;
  readonly dismissWhilePreparing?: boolean | undefined;
  readonly dismissKey?: HotkeyDef | false | undefined;
  readonly containFocus?: boolean | undefined;
  readonly template?: string | undefined;
};

/** Every option a binding needs resolved before it can render or wire anything. */
export type ResolvedDialogOptions = {
  readonly isNonModal: boolean;
  readonly isPortaled: boolean;
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
export function resolveDialogOptions(options: UnresolvedDialogOptions): ResolvedDialogOptions {
  const isNonModal = options.nonModal ?? false;
  // A host getter is a portal too — `?? false` would leave the function itself standing in for a
  // boolean, and every reader of `isPortaled` asks it as one.
  const isPortaled = options.portal !== undefined && options.portal !== false;

  return {
    isNonModal,
    isPortaled,
    dismissOnBackdropClick: options.nonModal !== true ? options.dismissOnBackdropClick : undefined,
    dismissOnClickOutside:
      options.nonModal === true ? (options.dismissOnClickOutside ?? false) : false,
    dismissWhilePreparing: options.dismissWhilePreparing ?? true,
    dismissKey: options.dismissKey ?? Key.Escape,
    // Off by default, and **not narrowed on the variant**: the same attachment answers a Tab
    // pressed while focus is on the `<dialog>` itself, which WebKit swallows. So `nonModal: false`
    // does not make this inert, and reading the variant out here would be the bug.
    containFocus: options.containFocus ?? false,
    template: options.template ?? 'dialog',
    // Where this dialog is positioned from, and what it has to be positioned *against*. The
    // rules — and why a contained dialog needs a host at all — live in `core/placement.ts`.
    placement: dialogPlacement({
      nonModal: isNonModal,
      portal: isPortaled,
      clip: options.clipContainer ?? false,
    }),
  };
}

// ── The runtime ──────────────────────────────────────────────────────────────

/**
 * The dialog's state and the three doors onto it, built once per dialog.
 *
 * The engine is created here rather than handed in, so it can be wired straight to this dialog's
 * `close`: nothing has to bridge the two because nothing built it anywhere else.
 *
 * React holds the result in a `useState` initializer and Solid simply keeps the value, but both
 * get the same guarantee for the same reason — `open`, `openAndWait` and `handle` close over the
 * store alone, so their identity is stable for the dialog's lifetime. In React that is what lets
 * them be used as effect dependencies (the compiler cannot memoize them: it treats the store as
 * opaque).
 */
export function createDialogRuntime<TData = void, TReason extends string = string>(
  dialogId: DialogId
) {
  const store = createDialogStore<TData, TReason>(dialogId);
  const engine = createActionEngine<TData, TReason>(dialogId);
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
   * `dialog-store.test.ts` and by `open-and-wait.story.tsx`.
   */
  const openAndWait = (): Promise<AwaitedClose<TData, TReason>> => {
    const closed = new Promise<AwaitedClose<TData, TReason>>((resolve) => {
      store.addCloseResolver(resolve);
    });
    store.beginOpen();
    return closed;
  };

  const handle: DialogHandle<TData, TReason> = {
    close: (reason = DISMISS_REASON, data?: TData) => {
      store.close(reason, data);
    },
  };

  return { store, engine, open, openAndWait, handle };
}

/** What {@link createDialogRuntime} produces. */
export type DialogRuntime<TData = void, TReason extends string = string> = ReturnType<
  typeof createDialogRuntime<TData, TReason>
>;

/**
 * Which element a portaled dialog is mounted into — the whole of what {@link PortalTarget} decides,
 * in one place because both hook bindings ask it and would otherwise each answer it.
 *
 * **`defaultHost` is passed in rather than read as `document.body`**, so this stays a pure function
 * of its inputs: the decision is three branches and a fallback, and none of them needs a document
 * to be worth testing. The binding supplies the body, at the one line that already owns the DOM.
 *
 * @returns The host, or `null` when this dialog is not portaled at all.
 */
export function resolvePortalHost(
  portal: PortalTarget | undefined,
  defaultHost: Element
): Element | null {
  if (portal === undefined || portal === false) {
    return null;
  }
  if (portal === true) {
    return defaultHost;
  }
  const host = portal();
  if (host !== null) {
    return host;
  }
  // Not a way to un-portal: by here the placement CSS has already been chosen for a portaled
  // dialog, and rendering it inline would position it against the wrong thing. The body is the
  // arrangement that still works, and the warning is what says the styling left with it.
  log.warn('Portal host resolved to null — falling back to the default host', {});
  return defaultHost;
}

// ── Backdrop dismissal ───────────────────────────────────────────────────────

/** What the backdrop decision needs to know beyond the click itself. */
export type BackdropDismissOptions = {
  /** The box the pointer is measured against — the last question, and the only geometric one. */
  readonly dialog: BackdropDialog;
  readonly store: DialogStore;
  readonly engine: ActionGate;
  readonly isNonModal: boolean;
  readonly dismissOnBackdropClick: boolean | undefined;
  readonly dismissWhilePreparing: boolean;
};

/**
 * Whether this click should dismiss the dialog — the full chain, in order.
 *
 * Four questions, and each one exists: a non-modal dialog has no backdrop at all; dismissal is
 * opt-out without actions and opt-in with them (a dialog offering buttons wants to be dismissed
 * through one); the shared gate covers phase, `prepare` and a running action; and only then does
 * the geometry decide whether the pointer actually landed outside the box.
 */
export function shouldDismissOnBackdropClick(
  event: BackdropClickEvent,
  options: BackdropDismissOptions
): boolean {
  const { dialog, store, engine, isNonModal, dismissOnBackdropClick, dismissWhilePreparing } =
    options;

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
 * Unregister the dialog and settle everything still waiting on it.
 *
 * Called from a React effect cleanup and from a Solid `onCleanup`, and the body is the same
 * because none of it is scheduling: a dialog torn down while open is a close nobody reported, and
 * a dialog torn down while closed can still have a resolver waiting for a close that will now
 * never come. `store.abandon()` is unconditional for that second case — after a normal close both
 * queues are already drained, so it costs nothing where it does not apply.
 */
export type TeardownOptions = {
  readonly manager: DialogManager;
  readonly dialogId: DialogId;
  readonly dialog: HTMLDialogElement | null;
  /** Where a throwing `onClose` goes on the unmount path — the same channel the close path uses. */
  readonly onError: ((failure: DialogFailure) => void) | undefined;
};

export function teardownDialog(store: DialogStore, options: TeardownOptions): void {
  const { manager, dialogId, dialog, onError } = options;
  const wasOpen = store.getSnapshot().phase !== 'closed';

  manager.unregister(dialogId);

  if (wasOpen) {
    log('Tearing down open dialog', { id: dialogId });

    // If not already closing, this initiates the close with a 'dismiss' reason so `closeResult`
    // is set for both `onClose` and the close resolvers (it also cancels any pending open frame).
    // If already closing, it is a no-op and `closeResult` keeps the original reason.
    store.close(DISMISS_REASON);

    finalizeDialogClose(store, {
      dialog,
      onCloseError: (error) => {
        log.error('onClose callback failed during cleanup', { id: dialogId, error: error.message });
        // The unmount path reports through the same channel as the close path. Without this an
        // `onClose` that throws is visible when the dialog closes and invisible when it is
        // unmounted while open — the same failure, reported or not by how it happened to end.
        onError?.({ error, source: 'onClose' });
      },
    });
  }

  store.abandon();
}
