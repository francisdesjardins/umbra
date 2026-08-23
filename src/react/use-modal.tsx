import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { runDeclarationWindow } from '../actions/action-engine.js';
import { createActionFactory } from '../core/action-factory.js';
import type { DataOf, ReasonOf, RegisteredModalId } from '../core/registry.js';
import { DIALOG_CONTENT_STYLE, dialogAttributes } from '../core/dialog-props.js';
import { createModalDirector } from '../core/modal-director.js';
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
import { answerDismiss } from '../utils/dismiss-gate.js';
import { useDialogManagerContext } from './dialog-manager-context.js';
import { useModalOutletContext } from './modal-outlet.js';
import type { GetDialog } from '../core/types.js';
import type { OpenRequestDispatch } from '../manager/dialog-manager.js';
import type { ModalAnimation, UseModalOptions, UseModalReturn } from './types.js';

/**
 * Core modal hook that renders a native `<dialog>` with animation, backdrop handling and typed
 * close results. Actions are declared by being rendered: the `action` given to `render` names a
 * reason, binds a handler and returns its button's props, in one expression. **What is React's
 * here is the scheduling and nothing else** — every decision, and the order they are asked in, is
 * `core/`'s, `core/modal-director.ts`'s in particular.
 *
 * @typeParam TData - Type of the close data payload. Defaults to `void`.
 * @typeParam TReason - The reasons this modal closes with; declare a union
 * (`useModal<Result, 'save' | 'cancel'>`) rather than take the `string` default. `'dismiss'` is
 * always among them — Escape, backdrop click, teardown — and is the one reason **no action may be
 * named**. See `DismissReason`.
 * @example
 * const { openAndWait, Modal } = useModal<void, 'ok'>({
 *   id: 'my-modal',
 *   render: ({ action }) => <button {...action('ok')}>OK</button>,
 *   onClose: (result) => console.log(result.reason),
 * });
 */
/**
 * The registered door, first so a declared id is matched by it — whether the caller wrote the id
 * as a literal and let it infer, or named it as the one type argument. While `ModalRegistry` is
 * empty `RegisteredModalId` is `never`, this overload is uninhabitable, and every call falls
 * through to the one below, which is the signature this hook has always had.
 */
export function useModal<TId extends RegisteredModalId>(
  options: UseModalOptions<DataOf<TId>, ReasonOf<TId>> & { readonly id: TId }
): UseModalReturn<DataOf<TId>, ReasonOf<TId>>;
export function useModal<TData = void, TReason extends string = string>(
  options: UseModalOptions<TData, TReason>
): UseModalReturn<TData, TReason>;
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
    onError,
    onOpenRequest,
    onClose,
    onDismissRequest,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    role,
  } = options;

  // The defaults and the variant narrowing, from the one place both bindings read them.
  const {
    isNonModal,
    isPortaled,
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

  // Built once: fresh doors each render would force consumers through refs and defeat memoization
  // inside `render`, and React Compiler cannot hoist them — they capture a value it treats opaque.
  const [init] = useState(() => {
    const runtime = createModalRuntime<TData, TReason>(modalId);

    // Safe to pass around: the closure captures the ref but never reads `.current` during render.
    const getDialog: GetDialog = () => {
      return dialogRef.current;
    };

    return { ...runtime, getDialog };
  });
  const { store, engine, getDialog, open, openAndWait, handle } = init;

  // Kept likewise: the director remembers each step's attachment and where opening focus landed.
  const [director] = useState(() => {
    return createModalDirector({ store, getDialog, modalId, manager, engine });
  });

  // The same reader serves the server: both stores are in-memory and DOM-free, so a server pass and
  // hydration's first pass read the identical freshly-closed modal. Required rather than optional —
  // `useSyncExternalStore` throws without a third argument, taking the server render of any page
  // that mounts a modal down with it.
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const actionSnap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  // The only place an action is ever declared; built per render, over that render's snapshot.
  const action = createActionFactory(engine, () => {
    return actionSnap;
  });

  // Annotated, not inferred: un-annotated, the fallback and the caller's `ModalAnimation` stay a
  // union, and `getDialogAnimationStyles` infers its style parameter from the first branch alone.
  const animation: ModalAnimation = animationProp ?? DEFAULT_MODAL_ANIMATION;

  // The resolution the inline `transition` uses, so the exit's property and timeout match it.
  const { primaryProperty, exitDuration } = resolveAnimation(animation);

  // No deps array, so the store always holds the latest `onClose` without a ref.
  useEffect(() => {
    store.setOnClose(onClose);
  });

  // No deps, so `prepare` and `onKeyDown` are never a render behind; no cleanup, because one would
  // tear the sequence down before every re-run and leave the director nothing to diff.
  useEffect(() => {
    director.sync({
      phase: snap.phase,
      isPreparing: snap.isPreparing,
      prepare,
      onError,
      onKeyDown,
      nonModal: isNonModal,
      primaryProperty,
      exitDuration,
      dismissKey,
      dismissWhilePreparing,
      onDismissRequest,
      containFocus,
      dismissOnClickOutside,
    });
  });

  // Declared first: React runs cleanups in declaration order, so listeners detach before unregister.
  useEffect(() => {
    return () => {
      director.destroy();
    };
  }, [director]);

  // The registration below re-runs when `template` / `nonModal` change, because those change the
  // rendered structure (inline / portal / contained wrapper) and a native <dialog> cannot survive
  // remounting into a different one while open — so its cleanup unregisters *and* finalizes,
  // closing it cleanly rather than orphaning it and, on unmount, settling `onClose` and any pending
  // resolver with 'dismiss'. Both callbacks below go through a ref: listing one whose identity
  // moves every render would re-register on every render.
  const openRequestHandler = useRef(onOpenRequest);
  useEffect(() => {
    openRequestHandler.current = onOpenRequest;
  }, [onOpenRequest]);

  const errorHandler = useRef(onError);
  useEffect(() => {
    errorHandler.current = onError;
  }, [onError]);

  // A registration-time fact, hence a dependency: declaring one later means re-registering.
  const acceptsOpenRequests = onOpenRequest !== undefined;

  useEffect(() => {
    manager.register(modalId, {
      store,
      template,
      nonModal: isNonModal,
      getDialog,
      ...(acceptsOpenRequests && {
        // Returned, not swallowed: the manager awaits it, so an owner that validates asynchronously
        // still refuses before `requestOpenAndWait` answers.
        onOpenRequest: (payload: unknown, request: OpenRequestDispatch) => {
          return openRequestHandler.current?.(payload, request);
        },
      }),
    });

    return () => {
      teardownModal(store, {
        manager,
        modalId,
        dialog: getDialog(),
        onError: (failure) => {
          errorHandler.current?.(failure);
        },
      });
    };
    // `isPortaled` is a dep the body never reads: like `nonModal`, it changes the structure.
  }, [acceptsOpenRequests, manager, getDialog, isNonModal, modalId, template, isPortaled, store]);

  // Inline to satisfy React Compiler. The decision is `modal-runtime.ts`'s and the answer is
  // `answerDismiss`'s — a controlled surface hears this door the way it hears the dismiss key. It
  // takes only a structural slice of the event, so React's synthetic one satisfies it unchanged.
  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (
      shouldDismissOnBackdropClick(event, {
        dialog,
        store,
        engine,
        isNonModal,
        dismissOnBackdropClick,
        dismissWhilePreparing,
      })
    ) {
      answerDismiss(store, { request: onDismissRequest, cause: 'backdrop-click' });
    }
  };

  const outlet = useModalOutletContext();

  // A declaration window, so the engine learns which actions this pass drew: re-declaring rather
  // than accumulating stops a hotkey outliving its button and suppressing the dismiss key.
  const renderContent = () => {
    return runDeclarationWindow(engine, () => {
      return render({
        isPreparing: snap.isPreparing,
        phase: snap.phase,
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
      // Styling surface and accessible name, from the table both bindings read (`dialog-props.ts`).
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
      style={getDialogAnimationStyles(snap.phase, { animation, customStyle: styleProp, placement })}
    >
      {/* Content wrapper — see `DIALOG_CONTENT_STYLE`, which both bindings read. */}
      <div style={DIALOG_CONTENT_STYLE}>{snap.phase !== 'closed' && renderContent()}</div>
    </dialog>
  );

  let dialogNode: ReactNode;

  if (isPortaled) {
    dialogNode = createPortal(dialogElement, document.body);
  } else if (placement.host) {
    // The dialog's `absolute` positioning resolves against this host (closest positioned ancestor
    // wins), immune to transforms above, and it fills its parent so a slide anchors to that region.
    dialogNode = (
      <div data-modal-container={modalId} style={placement.host}>
        {dialogElement}
      </div>
    );
  } else {
    dialogNode = dialogElement;
  }

  // No cleanup: the <dialog> is always mounted, so `dialogNode` is never null and unmount is the
  // effect below. Passive, not layout — measured, the frame a layout effect would buy does not
  // exist, the outlet's re-render being a cascade rather than part of this commit either way.
  // Bounded by the paint-timing test in __tests__.
  useEffect(() => {
    if (!outlet) {
      return;
    }
    outlet.register(modalId, dialogNode);
  });

  // Unmount-only: the outlet/modalId identities are stable in practice.
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
    phase: snap.phase,
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
