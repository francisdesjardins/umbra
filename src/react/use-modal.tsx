import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { runDeclarationWindow } from '../actions/action-engine.js';
import { createActionFactory } from '../core/action-factory.js';
import { DISMISS_REASON } from '../core/dismiss-reason.js';
import { attachClickOutside } from '../core/attach-click-outside.js';
import { attachFocusContainment } from '../core/attach-focus-containment.js';
import { createFocusCoordinator } from '../core/attach-focus.js';
import {
  attachDialogCancel,
  attachDialogKeydown,
  attachWindowDismissKey,
} from '../core/attach-keydown.js';
import {
  syncOpenSequence,
  syncCloseSequence,
  syncLabellingDiagnostics,
} from '../core/attach-lifecycle.js';
import { DIALOG_CONTENT_STYLE, dialogAttributes } from '../core/dialog-props.js';
import {
  createModalRuntime,
  resolveModalOptions,
  shouldDismissOnBackdropClick,
  teardownModal,
} from '../core/modal-runtime.js';
import {
  DEFAULT_MODAL_ANIMATION,
  getDialogAnimationStyles,
  resolveAnimation,
} from '../utils/animation-utils.js';
import { useDialogManagerContext } from './dialog-manager-context.js';
import { useModalOutletContext } from './modal-outlet.js';
import type { ModalDomContext } from '../core/attach-types.js';
import type { GetDialog } from '../core/types.js';
import type { OpenRequestDispatch } from '../manager/dialog-manager.js';
import type { ModalAnimation, UseModalOptions, UseModalReturn } from './types.js';

// ── useModal Hook ───────────────────────────────────────────────────────────

/**
 * Core modal hook that renders a native `<dialog>` element with animation,
 * backdrop handling, and typed close results.
 *
 * Actions are declared by being rendered: the `action` given to `render` names a reason, binds
 * a handler and returns the props for its button, all in one expression. There is no action
 * config and nothing to pass in.
 *
 * **What is React's here is the scheduling and nothing else.** Every decision — the option
 * defaults, the state machine, the DOM lifecycle, the dismissal rules, focus, the backdrop test,
 * the teardown — is a call into `core/`, which is why `umbra/solid`'s `useModal` makes the same
 * calls in the same order from `createEffect`. The effects below are deliberately not extracted
 * into per-concern hook files: their whole content is a dependency array, and a folder of them
 * reads as a list of features the other binding is missing.
 *
 * @typeParam TData - Type of the close data payload. Defaults to `void`.
 * @typeParam TReason - The reasons this modal closes with. Left at `string` any reason is
 * accepted; declaring a union (`useModal<Result, 'save' | 'cancel'>`) rejects a mistyped
 * reason, autocompletes it, and makes a `switch` on `result.reason` in `onClose` exhaustive.
 * `'dismiss'` is always among them — the library produces it on Escape, backdrop click and
 * teardown — and is the one reason **no action may be named**, so that a close carrying it
 * always means the same thing. See `DismissReason`.
 *
 * @example
 * const { openAndWait, Modal } = useModal<void, 'ok'>({
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
    onKeyDown,
    prepare,
    onOpenRequest,
    onClose,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    role,
  } = options;

  // The defaults and the variant narrowing, from the one place both bindings read them.
  const {
    isNonModal,
    shouldPortal,
    dismissOnBackdropClick,
    dismissOnClickOutside,
    dismissWhilePreparing,
    dismissKey,
    containFocus,
    template,
    placement,
  } = resolveModalOptions(options);

  const manager = useDialogManagerContext();

  const dialogRef = useRef<HTMLDialogElement>(null);

  // Built once and kept: `open` / `openAndWait` / `handle` close over the store alone, so a fresh
  // set each render would force consumers to shuttle them through refs to use them in effects or
  // pass them to memoized children (and would defeat memoization inside `render`, which receives
  // `handle`). React Compiler cannot memoize them for us — they capture a value it treats as
  // opaque — so they are hoisted into the initializer instead.
  const [init] = useState(() => {
    const runtime = createModalRuntime<TData, TReason>(modalId);

    // Stable getter that reads dialogRef.current — safe to pass around because the closure
    // captures the ref but does not touch `.current` during render.
    const getDialog: GetDialog = () => {
      return dialogRef.current;
    };

    return { ...runtime, getDialog };
  });
  const { store, engine, getDialog, open, openAndWait, handle } = init;

  // Kept across renders for the same reason, in its own cell: where the opening focus landed has
  // to outlive a phase — it is read when an action settles, several phases later.
  const [focus] = useState(() => {
    return createFocusCoordinator({ getDialog }, { engine });
  });

  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const actionSnap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  /**
   * The factory handed to `render`. Calling it declares the action — that is the only place an
   * action is ever declared — and returns the props for its button.
   *
   * Built per render over the snapshot this render is showing, so the props it hands back are
   * that snapshot's. The factory itself is framework-free; what React contributes is the
   * snapshot, and the re-render that produces the next one.
   */
  const action = createActionFactory(engine, () => {
    return actionSnap;
  });

  // Annotated, not inferred: without it the fallback's literal type and the caller's
  // `ModalAnimation` stay a union, and `getDialogAnimationStyles` infers its style parameter
  // from the first branch — which the second then fails to satisfy.
  const animation: ModalAnimation = animationProp ?? DEFAULT_MODAL_ANIMATION;

  // Same resolution the <dialog>'s inline `transition` is built from, so the property the exit
  // waits on and the duration it times out against always match it.
  const { primaryProperty, exitDuration } = resolveAnimation(animation);

  const domContext: ModalDomContext = { store, getDialog, modalId, phase: snap.phase, manager };

  // Intentionally no deps array — runs every render to always capture the latest onClose
  // reference without needing a ref. The attach functions and the teardown read it via the store.
  useEffect(() => {
    store.setOnClose(onClose);
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────
  //
  // No deps array on the opening pass either, so `prepare` is always the latest closure. The
  // phase guard and the `dialog.open` check inside `syncOpenSequence` are what stop the work
  // happening twice, rather than a dependency list.
  useEffect(() => {
    syncOpenSequence(domContext, { prepare, nonModal: isNonModal });
  });

  // Deliberately listing `isPreparing`: the diagnostic asks its question once the content is
  // final, and a phase-only dependency would never bring it back when `prepare` settles.
  useEffect(() => {
    syncLabellingDiagnostics(
      { store, getDialog, modalId, phase: snap.phase, manager },
      { isPreparing: snap.isPreparing }
    );
  }, [snap.phase, snap.isPreparing, store, getDialog, modalId, manager]);

  // Explicit deps: only re-runs when the phase or the resolved animation changes. The context is
  // rebuilt inside rather than listed, because a fresh object per render would re-attach the exit
  // listeners on every render.
  useEffect(() => {
    return syncCloseSequence(
      { store, getDialog, modalId, phase: snap.phase, manager },
      { nonModal: isNonModal, primaryProperty, exitDuration }
    );
  }, [snap.phase, primaryProperty, exitDuration, modalId, store, getDialog, manager, isNonModal]);

  // ── Dismiss key ─────────────────────────────────────────────────────────
  //
  // Three listeners: on the dialog, on its native `cancel`, and — for a non-modal panel only —
  // on the window, so the key works wherever focus is. One effect, because they share a
  // dependency list to the letter, and because that is the shape Solid's binding has too.
  useEffect(() => {
    const ctx: ModalDomContext = { store, getDialog, modalId, phase: snap.phase, manager };
    const keydownOptions = {
      isPreparing: snap.isPreparing,
      onKeyDown,
      dismissKey,
      engine,
      nonModal: isNonModal,
      dismissWhilePreparing,
    };
    const teardowns = [
      attachDialogKeydown(ctx, keydownOptions),
      attachDialogCancel(ctx, keydownOptions),
      attachWindowDismissKey(ctx, keydownOptions),
    ];
    return () => {
      for (const teardown of teardowns) {
        teardown?.();
      }
    };
  }, [
    snap.phase,
    snap.isPreparing,
    onKeyDown,
    dismissKey,
    dismissWhilePreparing,
    engine,
    isNonModal,
    modalId,
    store,
    getDialog,
    manager,
  ]);

  // ── Focus ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return focus.sync(snap.phase);
  }, [focus, snap.phase]);

  // ── Focus containment (opt-in) ──────────────────────────────────────────

  useEffect(() => {
    return attachFocusContainment(
      { store, getDialog, modalId, phase: snap.phase, manager },
      { containFocus }
    );
  }, [snap.phase, containFocus, modalId, store, getDialog, manager]);

  // ── Click outside (non-modal only) ──────────────────────────────────────

  useEffect(() => {
    return attachClickOutside(
      { store, getDialog, modalId, phase: snap.phase, manager },
      { dismissOnClickOutside, dismissWhilePreparing, engine }
    );
  }, [
    snap.phase,
    dismissOnClickOutside,
    dismissWhilePreparing,
    engine,
    modalId,
    store,
    getDialog,
    manager,
  ]);

  // ── Registry registration + teardown ────────────────────────────────────
  // Re-runs when the reported flags (`template` / `nonModal`) change, because those
  // change the rendered DOM structure (inline / portal / contained wrapper) and a native
  // <dialog> cannot survive being remounted into a different structure while open. The
  // cleanup therefore both unregisters AND finalizes an open modal: on a structural prop
  // change this closes it cleanly (rather than leaving a stuck, orphaned dialog), and on a
  // true unmount it settles `onClose` and any pending close resolver with a 'dismiss' reason.
  // The handler the registry holds is stable for the life of the registration, and reads the
  // latest one through a ref — a new closure every render would make this effect re-register on
  // every render, and re-registering is not free: it tears the subscription down and back up.
  const openRequestHandler = useRef(onOpenRequest);
  useEffect(() => {
    openRequestHandler.current = onOpenRequest;
  }, [onOpenRequest]);

  // Whether the dialog answers bridged opens at all is a registration-time fact, so it is a
  // dependency below: a dialog that starts declaring one has to re-register to become reachable.
  const acceptsOpenRequests = onOpenRequest !== undefined;

  useEffect(() => {
    manager.register(modalId, store, {
      template,
      nonModal: isNonModal,
      ...(acceptsOpenRequests && {
        // Returned, not swallowed: the manager awaits the handler, so an owner that validates
        // asynchronously still gets to refuse before `requestOpenAndWait` answers.
        onOpenRequest: (payload: unknown, request: OpenRequestDispatch) => {
          return openRequestHandler.current?.(payload, request);
        },
      }),
    });

    return () => {
      teardownModal(store, manager, modalId, getDialog());
    };
    // `shouldPortal` is a dep (though unused in the body) because it, like `nonModal`,
    // changes the rendered structure — so toggling it while open must tear the modal down
    // too, otherwise the remounted-into-a-new-structure <dialog> is left stuck open.
  }, [acceptsOpenRequests, manager, getDialog, isNonModal, modalId, template, shouldPortal, store]);

  // ── Backdrop click ──────────────────────────────────────────────────────

  // Inline handler to satisfy React Compiler. The decision itself — variant, opt-in/opt-out,
  // the shared dismissal gate, and the geometry — is `modal-runtime.ts`'s, and it takes the
  // structural slice of the event, so React's synthetic one satisfies it unchanged.
  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (
      shouldDismissOnBackdropClick(event, dialog, {
        store,
        engine,
        isNonModal,
        dismissOnBackdropClick,
        dismissWhilePreparing,
      })
    ) {
      store.close(DISMISS_REASON);
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
    return runDeclarationWindow(engine, () => {
      return render({
        isPreparing: snap.isPreparing,
        handle,
        action,
        hasRunningAction: actionSnap.hasRunningAction,
        error: actionSnap.error,
      });
    });
  };

  const dialogElement = (
    <dialog
      ref={dialogRef}
      // The styling surface (`data-modal-id`, `data-modal-type`) and the accessible name, from
      // the one table both bindings read — see `dialog-props.ts`.
      {...dialogAttributes({
        modalId,
        nonModal: isNonModal,
        isPreparing: snap.isPreparing,
        ariaLabel,
        ariaLabelledBy,
        ariaDescribedBy,
        role,
      })}
      onClick={handleBackdropClick}
      style={getDialogAnimationStyles(snap.phase, animation, styleProp, placement)}
    >
      {/* Content wrapper — see `DIALOG_CONTENT_STYLE`, which both bindings read. */}
      <div style={DIALOG_CONTENT_STYLE}>{snap.phase !== 'closed' && renderContent()}</div>
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
    isVisible: snap.phase !== 'closed',
    isPreparing: snap.isPreparing,
    Modal,
    openAndWait,
    handle,
    action,
    hasRunningAction: actionSnap.hasRunningAction,
    error: actionSnap.error,
    dialogManager: manager,
  };
}
