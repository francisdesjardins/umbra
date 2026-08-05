import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '../hooks/use-click-outside.js';
import { useDialogKeydown } from '../hooks/use-dialog-keydown.js';
import { useDialogLifecycle } from '../hooks/use-dialog-lifecycle.js';
import { useFocusManagement } from '../hooks/use-focus-management.js';
import { useDialogManagerContext } from '../manager/dialog-manager-context.js';
import { getDialogAnimationStyles } from '../utils/animation-utils.js';
import { canDismiss } from '../utils/dismiss-gate.js';
import { Key } from '../utils/keys.js';
import { createLogger } from '../utils/logger.js';
import { finalizeModalClose } from './finalize-close.js';
import { createModalStore } from './modal-store.js';
import { dialogPlacement } from './placement.js';
import { useModalOutletContext } from './modal-outlet.js';
import { createActionEngine } from '../actions/action-engine.js';
import { formatHotkeyLabel } from '../utils/hotkey-utils.js';
import type { ActionCloseFn, ActionFactory } from '../actions/types.js';
import type {
  GetDialog,
  ModalAnimation,
  ModalHandle,
  UseModalOptions,
  UseModalReturn,
  WaitForCloseResult,
} from './types.js';

/**
 * What an action does when it is given no handler: close with its own reason.
 *
 * Typed at `never` rather than at the modal's payload, which is what makes it usable as the
 * default for every action — a handler that ignores its `close` argument fits any payload.
 */
const autoClose: (close: ActionCloseFn) => void = (close) => {
  close();
};

const log = createLogger('modal');

const defaultAnimation: ModalAnimation = {
  entrance: { opacity: 1, transform: 'scale(1)' },
  exit: { opacity: 0, transform: 'scale(0.95)' },
  duration: 200,
  exitDuration: 150,
  transitionProperty: 'opacity, transform',
};

// ── useModal Hook ───────────────────────────────────────────────────────────

/**
 * Core modal hook that renders a native `<dialog>` element with animation,
 * backdrop handling, and typed close results.
 *
 * Actions are declared by being rendered: the `action` given to `render` names a reason, binds
 * a handler and returns the props for its button, all in one expression. There is no action
 * config and nothing to pass in.
 *
 * @typeParam TData - Type of the close data payload. Defaults to `void`.
 * @typeParam TReason - The reasons this modal closes with. Left at `string` any reason is
 * accepted; declaring a union (`useModal<Result, 'save' | 'cancel'>`) rejects a mistyped
 * reason, autocompletes it, and makes a `switch` on `result.reason` in `onClose` exhaustive.
 * `'dismiss'` is always allowed — the library produces it on Escape, backdrop click and
 * teardown.
 *
 * @example
 * const { open, Modal, waitForClose } = useModal<void, 'ok'>({
 *   id: 'my-modal',
 *   render: ({ action }) => <button {...action('ok')}>OK</button>,
 *   onClose: (result) => console.log(result.reason),
 * });
 */
export function useModal<TData = void, TReason extends string = string>(
  options: UseModalOptions<TData, TReason>
): UseModalReturn<TData, TReason> {
  const {
    id: modalId,
    render,
    animation: animationProp,
    style: styleProp,
    dismissKey: dismissKeyProp,
    dismissWhilePreparing: dismissWhilePreparingProp,
    onKeyDown,
    onOpen,
    onClose,
    modalType,
    nonModal,
    portal,
    clipContainer,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    role,
  } = options;
  // dismissOnBackdropClick only exists in the modal variant (nonModal !== true)
  const dismissOnBackdropClick =
    options.nonModal !== true ? options.dismissOnBackdropClick : undefined;
  // dismissOnClickOutside only exists in the non-modal variant (nonModal === true)
  const dismissOnClickOutside =
    options.nonModal === true ? (options.dismissOnClickOutside ?? false) : false;

  const isNonModal = nonModal ?? false;
  const shouldPortal = portal ?? false;
  // Where this dialog is positioned from, and what it has to be positioned *against*. The
  // rules — and why a contained dialog needs a host at all — live in `core/placement.ts`,
  // framework-free, so a second binding places a dialog exactly the way this one does.
  const placement = dialogPlacement({
    nonModal: isNonModal,
    portal: shouldPortal,
    clip: clipContainer ?? false,
  });
  const dismissWhilePreparing = dismissWhilePreparingProp ?? true;
  const dm = useDialogManagerContext();

  // Everything here closes over `store` alone, so it is all built once and keeps a
  // stable identity for the lifetime of the hook. That matters for the returned
  // `open` / `waitForClose` / `handle`: a fresh function each render would force
  // consumers to shuttle them through refs to use them in effects or pass them to
  // memoized children (and would defeat memoization inside `render`, which receives
  // `handle`). React Compiler cannot memoize them for us — they capture a value it
  // treats as opaque — so we hoist them into the initializer instead.
  const [init] = useState(() => {
    const store = createModalStore<TData, TReason>(modalId);
    // Built here rather than handed in, so it can be wired straight to this modal's `close`.
    // Nothing has to bridge the two because nothing built it anywhere else.
    const engine = createActionEngine<TData, TReason>(modalId);
    engine.bindClose((reason, data) => {
      store.close(reason, data);
    });

    // Stable getter that reads dialogRef.current — safe to pass to hooks
    // because the closure captures the ref but doesn't access .current during render.
    const getDialog: GetDialog = () => {
      return dialogRef.current;
    };

    // The store decides which branch settles the promise (start / join an in-flight
    // open / resolve immediately) — it owns the state machine, so it owns the rule.
    const open = (): Promise<void> => {
      return new Promise((resolve) => {
        store.requestOpen(resolve);
      });
    };

    const waitForClose = (): Promise<WaitForCloseResult<TData, TReason>> => {
      return new Promise((resolve) => {
        store.addCloseResolver(resolve);
      });
    };

    const handle: ModalHandle<TData, TReason> = {
      close: (reason = 'dismiss', data?: TData) => {
        store.close(reason, data);
      },
    };

    return { store, engine, getDialog, open, waitForClose, handle };
  });
  const { store, engine, getDialog, open, waitForClose, handle } = init;
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const actionSnap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  /**
   * The factory handed to `render`. Calling it declares the action — that is the only place an
   * action is ever declared — and returns the props for its button.
   */
  const action: ActionFactory<TData, TReason> = (reason, handlerOrOptions) => {
    const opts = typeof handlerOrOptions === 'function' ? undefined : handlerOrOptions;
    const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : opts?.onAction;
    const effective = handler ?? autoClose;
    const onClickBefore = opts?.onClick;
    const hotkey = opts?.hotkey;

    engine.declare(reason, hotkey);
    const state = engine.stateOf(reason);

    return {
      type: opts?.type ?? 'button',
      onClick: async (event) => {
        // The caller's handler goes first and owns the veto, so composing a click never has to
        // mean replacing the action's. Same protocol as `onKeyDown`.
        onClickBefore?.(event);
        if (event.defaultPrevented) {
          return;
        }
        await engine.run(reason, effective);
      },
      loading: state.isRunning,
      'data-loading': state.isRunning,
      // Includes *this* action: a running button that stays clickable re-enters its own handler
      // on a double click, which for a submit means submitting twice.
      disabled: actionSnap.isRunning || (opts?.disabled ?? false),
      'aria-busy': state.isRunning,
      ...(hotkey !== undefined && { 'aria-keyshortcuts': formatHotkeyLabel(hotkey) }),
    };
  };

  const dialogRef = useRef<HTMLDialogElement>(null);
  const animation = animationProp ?? defaultAnimation;

  // Intentionally no deps array — runs every render to always capture the latest onClose
  // reference without needing a ref. Extracted hooks and unmount cleanup read it via the store.
  useEffect(() => {
    store.setOnClose(onClose);
  });

  // ── Extracted hooks ──────────────────────────────────────────────────────

  // Resolve the effective dismiss key (defaults to Escape when not specified)
  const dismissKey = dismissKeyProp ?? Key.Escape;

  const hookCtx = { store, getDialog, modalId, phase: snap.phase, dm };

  useDialogLifecycle(hookCtx, { onOpen, animation, nonModal: isNonModal });

  useDialogKeydown(hookCtx, {
    isPreparing: snap.isPreparing,
    onKeyDown,
    dismissKey,
    engine,
    nonModal: isNonModal,
    dismissWhilePreparing,
  });

  useFocusManagement(hookCtx, { engine });

  useClickOutside(hookCtx, {
    dismissOnClickOutside,
    dismissWhilePreparing,
    engine,
  });

  // ── Registry registration + teardown ────────────────────────────────────
  // Re-runs when the reported flags (`modalType` / `nonModal`) change, because those
  // change the rendered DOM structure (inline / portal / contained wrapper) and a native
  // <dialog> cannot survive being remounted into a different structure while open. The
  // cleanup therefore both unregisters AND finalizes an open modal: on a structural prop
  // change this closes it cleanly (rather than leaving a stuck, orphaned dialog), and on a
  // true unmount it settles `onClose`/`waitForClose` with a 'dismiss' reason.
  useEffect(() => {
    dm.register(modalId, store, modalType ?? 'modal', isNonModal);

    return () => {
      const wasOpen = store.getSnapshot().phase !== 'closed';

      dm.unregister(modalId);

      if (wasOpen) {
        log('Tearing down open modal', { id: modalId });

        // If not already closing, initiate close with 'dismiss' reason so closeResult is
        // set for both onClose and waitForClose (this also cancels any pending open frame).
        // If already closing, this is a no-op and closeResult retains the original reason.
        store.close('dismiss');

        finalizeModalClose(store, getDialog(), (error) => {
          log.error('onClose callback failed during cleanup', {
            id: modalId,
            error: error.message,
          });
        });
      }

      // Unconditional: a modal can be destroyed while closed and still have waiters, because
      // `waitForClose()` may be called before the first `open()` — or after a close, awaiting
      // the next one that now never comes. `finalizeModalClose` above already settled the
      // open-modal case, so this drains an empty queue there and only bites in the case it
      // exists for. Without it those promises never settle.
      store.abandon();
    };
    // `shouldPortal` is a dep (though unused in the body) because it, like `nonModal`,
    // changes the rendered structure — so toggling it while open must tear the modal down
    // too, otherwise the remounted-into-a-new-structure <dialog> is left stuck open.
  }, [dm, getDialog, isNonModal, modalId, modalType, shouldPortal, store]);

  // ── Backdrop click ──────────────────────────────────────────────────────

  // Inline backdrop click handler to satisfy React Compiler
  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    // Non-modal dialogs have no backdrop — skip click-outside detection
    if (isNonModal) {
      return;
    }

    // Backdrop dismissal is opt-out without actions, opt-in with them.
    if (!(dismissOnBackdropClick ?? !engine.hasActions())) {
      return;
    }

    if (
      !canDismiss({
        phase: snap.phase,
        isPreparing: snap.isPreparing,
        dismissWhilePreparing,
        isActionRunning: actionSnap.isRunning,
      })
    ) {
      return;
    }

    // A real backdrop click targets the <dialog> itself; anything originating in the
    // content bubbles up with a descendant as its target. Checking this first is what
    // makes the coordinate test below safe: a keyboard-activated button dispatches a
    // click with clientX/clientY of 0, which lies outside a centred dialog's rect and
    // would otherwise read as a backdrop click and dismiss the modal.
    if (event.target !== event.currentTarget) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    // The dialog's own box can extend past its content (padding, a template's sizing),
    // so confirm the pointer actually landed outside it before dismissing.
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (isOutside) {
      store.close('dismiss');
    }
  };

  // ── Outlet-aware rendering ──────────────────────────────────────────────

  const outlet = useModalOutletContext();

  /**
   * Runs the caller's `render` inside a declaration window, so the engine learns exactly which
   * actions this pass drew. Re-declaring per pass (rather than accumulating) is what keeps a
   * hotkey from outliving the button that owned it and going on suppressing the dismiss key.
   */
  const renderContent = () => {
    engine.beginRender();
    try {
      return render({
        isPreparing: snap.isPreparing,
        handle,
        action,
        isRunning: actionSnap.isRunning,
        error: actionSnap.error,
      });
    } finally {
      engine.endRender();
    }
  };

  const dialogElement = (
    <dialog
      ref={dialogRef}
      // The styling surface: `data-modal-id` is this modal's id and `data-modal-type` its
      // variant, so user-land CSS can reach one dialog (or every non-modal one) without
      // knowing anything about the tree it renders in — and without keying off a test id.
      data-modal-id={modalId}
      data-testid={`modal-${modalId}`}
      data-modal-type={isNonModal ? 'non-modal' : 'modal'}
      // The name and the role are the caller's: nothing here knows what this dialog is for.
      // Omitted rather than defaulted when absent, so a `<dialog>` keeps its own implicit role
      // and an unnamed one is visibly unnamed to an audit instead of quietly `aria-label=""`.
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      role={role}
      onClick={handleBackdropClick}
      style={getDialogAnimationStyles(snap.phase, animation, styleProp, placement)}
    >
      {/*
        Content wrapper. It deliberately does NOT stop click propagation: the backdrop
        handler above identifies a real backdrop click by its target, so swallowing
        content clicks here would only rob user-land ancestors of events they should see.
      */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {snap.phase !== 'closed' && renderContent()}
      </div>
    </dialog>
  );

  let dialogNode: ReactNode;

  if (shouldPortal) {
    dialogNode = createPortal(dialogElement, document.body);
  } else if (placement.host) {
    // The host `dialogPlacement` asked for: the dialog's `absolute` positioning resolves
    // against this element (the closest positioned ancestor always wins), immune to
    // transformed ancestors above it. It fills its parent, so a slide anchors to that region.
    dialogNode = (
      <div data-modal-container={modalId} style={placement.host}>
        {dialogElement}
      </div>
    );
  } else {
    dialogNode = dialogElement;
  }

  // Register/update outlet content — NO cleanup. The <dialog> is always mounted so
  // dialogNode is never null, and we never need to unregister mid-lifecycle.
  // Cleanup on unmount is handled by the effect below.
  //
  // Passive, not layout. A layout effect looks tempting here — the node is rendered by
  // the outlet rather than by us, so in principle the outlet must re-render before the
  // paint or that paint shows the previous node. Measured, that frame does not exist:
  // React flushes the passive effect and the outlet's cascading re-render before the
  // next animation frame, and a layout effect is not even synchronous through the
  // cascade (the DOM still reads the old value at the end of the click's own task
  // either way). Both variants are indistinguishable by the next frame, so this stays
  // passive and does not block paint. See the paint-timing test in __tests__.
  useEffect(() => {
    if (!outlet) {
      return;
    }
    outlet.register(modalId, dialogNode);
  });

  // Unmount-only cleanup: unregister when the component unmounts or the
  // outlet/modalId identity changes (both are stable in practice).
  useEffect(() => {
    if (!outlet) {
      return;
    }
    return () => {
      outlet.unregister(modalId);
    };
  }, [modalId, outlet]);

  const Modal: ReactNode = outlet ? null : dialogNode;

  return {
    open,
    isOpen: snap.phase !== 'closed',
    isPreparing: snap.isPreparing,
    Modal,
    waitForClose,
    handle,
    action,
    isRunning: actionSnap.isRunning,
    error: actionSnap.error,
    dialogManager: dm,
  };
}
