import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { runDeclarationWindow } from '../actions/action-engine.js';
import { createActionFactory } from '../core/action-factory.js';
import type { RegisteredDialogId } from '../core/registry.js';
import type { RegisteredOptions, RegisteredReturn } from '../core/registered-types.js';
import { DIALOG_CONTENT_STYLE, dialogAttributes } from '../core/dialog-props.js';
import { createDialogDirector } from '../core/dialog-director.js';
import {
  createDialogRuntime,
  resolveDialogOptions,
  resolvePortalHost,
  shouldDismissOnBackdropClick,
  teardownDialog,
} from '../core/dialog-runtime.js';
import {
  DEFAULT_MODAL_ANIMATION,
  getDialogAnimationStyles,
  resolveAnimation,
} from '../utils/animation-utils.js';
import { answerDismiss } from '../utils/dismiss-gate.js';
import { useDialogManagerContext } from './dialog-manager-context.js';
import { useDialogOutletContext } from './dialog-outlet.js';
import type { GetDialog } from '../core/types.js';
import type { OpenRequestDispatch } from '../manager/dialog-manager.js';
import type { DialogAnimation, UseDialogOptions, UseDialogReturn } from './types.js';

/**
 * Core modal hook that renders a native `<dialog>` with animation, backdrop handling and typed
 * close results. Actions are declared by being rendered: the `action` given to `render` names a
 * reason, binds a handler and returns its button's props, in one expression. **What is React's
 * here is the scheduling and nothing else** — every decision, and the order they are asked in, is
 * `core/`'s, `core/dialog-director.ts`'s in particular.
 *
 * @typeParam TData - Type of the close data payload. Defaults to `void`.
 * @typeParam TReason - The reasons this modal closes with; declare a union
 * (`useDialog<Result, 'save' | 'cancel'>`) rather than take the `string` default. `'dismiss'` is
 * always among them — Escape, backdrop click, teardown — and is the one reason **no action may be
 * named**. See `DismissReason`.
 * @example
 * const { openAndWait, Modal } = useDialog<void, 'ok'>({
 *   id: 'my-modal',
 *   render: ({ action }) => <button {...action('ok')}>OK</button>,
 *   onClose: (result) => console.log(result.reason),
 * });
 */
/**
 * The registered door, first so a declared id is matched by it — whether the caller wrote the id
 * as a literal and let it infer, or named it as the one type argument. While `DialogRegistry` is
 * empty `RegisteredDialogId` is `never`, this overload is uninhabitable, and every call falls
 * through to the one below, which is the signature this hook has always had.
 */
export function useDialog<TId extends RegisteredDialogId>(
  options: RegisteredOptions<TId, CSSProperties, ReactNode>
): RegisteredReturn<TId, ReactNode>;
export function useDialog<TData = void, TReason extends string = string>(
  options: UseDialogOptions<TData, TReason>
): UseDialogReturn<TData, TReason>;
export function useDialog<TData = void, TReason extends string = string>(
  options: UseDialogOptions<TData, TReason>
): UseDialogReturn<TData, TReason> {
  const {
    id: dialogId,
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
    portal,
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
  } = resolveDialogOptions(options);

  const manager = useDialogManagerContext();

  const dialogRef = useRef<HTMLDialogElement>(null);

  // Built once: fresh doors each render would force consumers through refs and defeat memoization
  // inside `render`, and React Compiler cannot hoist them — they capture a value it treats opaque.
  const [init] = useState(() => {
    const runtime = createDialogRuntime<TData, TReason>(dialogId);

    // Safe to pass around: the closure captures the ref but never reads `.current` during render.
    const getDialog: GetDialog = () => {
      return dialogRef.current;
    };

    return { ...runtime, getDialog };
  });
  const { store, engine, getDialog, open, openAndWait, handle } = init;

  // Kept likewise: the director remembers each step's attachment and where opening focus landed.
  const [director] = useState(() => {
    return createDialogDirector({ store, getDialog, dialogId, manager, engine });
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

  // Annotated, not inferred: un-annotated, the fallback and the caller's `DialogAnimation` stay a
  // union, and `getDialogAnimationStyles` infers its style parameter from the first branch alone.
  const animation: DialogAnimation = animationProp ?? DEFAULT_MODAL_ANIMATION;

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
    manager.register(dialogId, {
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
      teardownDialog(store, {
        manager,
        dialogId,
        dialog: getDialog(),
        onError: (failure) => {
          errorHandler.current?.(failure);
        },
      });
    };
    // `isPortaled` is a dep the body never reads: like `nonModal`, it changes the structure.
  }, [acceptsOpenRequests, manager, getDialog, isNonModal, dialogId, template, isPortaled, store]);

  // Inline to satisfy React Compiler. The decision is `dialog-runtime.ts`'s and the answer is
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

  const outlet = useDialogOutletContext();

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
        dialogId,
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

  // Asked at placement rather than at hook time, so a host mounted by the time this first portals
  // is found. A host that changes identity *within* an era is deliberately not followed — see the
  // era below and `PortalTarget`'s own contract. `null` here is the un-portaled answer, which is
  // why it doubles as the branch below.
  //
  // Guarded on `isPortaled` rather than left to `resolvePortalHost`'s own `null` branch, because
  // the *argument* is the problem: `document.body` on a server pass throws where this binding
  // otherwise renders a closed `<dialog>` with no DOM in scope. Portaling has never server-rendered
  // — `createPortal` needs a live container — but the default and contained paths do, and asserting
  // that is what `verify:package` does.
  // Held across renders, and re-read only when `portal` flips between portaled and not — the one
  // structural change, and the one the teardown effect already treats as such. Re-reading it every
  // render is what a getter invites and what strands an open modal: a container of a different
  // identity makes React unmount the portal subtree and mount a *fresh*, closed `<dialog>`, and
  // `syncOpenSequence` will not show it again outside `'opening'`. The dialog vanishes with the
  // store still reporting `phase: 'open'`, and nothing on screen left to dismiss.
  const [portalEra, setPortalEra] = useState(() => {
    return { isPortaled, host: isPortaled ? resolvePortalHost(portal, document.body) : null };
  });
  if (portalEra.isPortaled !== isPortaled) {
    setPortalEra({
      isPortaled,
      host: isPortaled ? resolvePortalHost(portal, document.body) : null,
    });
  }
  const portalHost = portalEra.isPortaled === isPortaled ? portalEra.host : null;

  if (portalHost) {
    dialogNode = createPortal(dialogElement, portalHost);
  } else if (placement.host) {
    // The dialog's `absolute` positioning resolves against this host (closest positioned ancestor
    // wins), immune to transforms above, and it fills its parent so a slide anchors to that region.
    dialogNode = (
      <div data-dialog-container={dialogId} style={placement.host}>
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
    outlet.register(dialogId, dialogNode);
  });

  // Unmount-only: the outlet/dialogId identities are stable in practice.
  useEffect(() => {
    if (!outlet) {
      return;
    }
    return () => {
      outlet.unregister(dialogId);
    };
  }, [dialogId, outlet]);

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
