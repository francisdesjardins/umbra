import { createEffect, createMemo, createRenderEffect, getOwner, onCleanup } from 'solid-js';
import { insert } from 'solid-js/web';
import type { JSX } from 'solid-js';
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
import {
  DIALOG_CONTENT_STYLE,
  dialogAttributes,
  setDialogAttributes,
} from '../core/dialog-props.js';
import {
  createModalRuntime,
  resolveModalOptions,
  shouldDismissOnBackdropClick,
  teardownModal,
} from '../core/modal-runtime.js';
import { applyStyle } from '../core/style.js';
import {
  DEFAULT_MODAL_ANIMATION,
  getDialogAnimationStyles,
  resolveAnimation,
} from '../utils/animation-utils.js';
import { useDialogManagerContext } from './dialog-manager-context.js';
import { fromStore } from './from-store.js';
import { useModalOutletContext } from './modal-outlet.js';
import type { ModalDomContext } from '../core/attach-types.js';
import type { DialogStyle } from '../core/style.js';
import type { GetDialog, ModalRenderArgs } from '../core/types.js';
import type { ModalAnimation, UseModalOptions, UseModalReturn } from './types.js';

/**
 * `umbra/solid`'s core hook — the same `useModal` as React's, over the same core.
 *
 * **Written without JSX, on purpose.** Solid's JSX is a compile step (`babel-preset-solid`), and
 * requiring it to build *the library* would put a second toolchain in the way of a package whose
 * whole claim is that a binding is thin. So the binding builds its one `<dialog>` with
 * `document.createElement` and Solid's own `insert` — which is precisely what compiled JSX emits.
 * Consumers write ordinary Solid JSX; their compiler handles it, and what crosses the boundary is
 * a `JSX.Element`, which needs no agreement about tooling.
 *
 * The differences from React's binding are the two that follow from the renderer, and no others:
 *
 * - **Nothing re-renders.** The body runs once. Everything live is a getter over a signal, so
 *   `modal.isVisible` inside JSX subscribes that one expression and nothing else.
 * - **An action un-declares itself.** React expires a declaration by re-running `render`
 *   wholesale; here a button removed by its own `<Show>` calls `engine.undeclare` from
 *   `onCleanup`. Without it the hotkey outlives the button and `hasActions()` — which decides
 *   whether a backdrop click dismisses — never goes back to false.
 *
 * @typeParam TData - Type of the close data payload. Defaults to `void`.
 * @typeParam TReason - The reasons this modal closes with. Declare them.
 */
export function useModal<TData = void, TReason extends string = string>(
  options: UseModalOptions<TData, TReason>
): UseModalReturn<TData, TReason> {
  const modalId = options.id;

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

  // Annotated for the reason React's binding gives: an un-annotated fallback leaves a union
  // whose branches disagree about the style parameter `getDialogAnimationStyles` infers.
  const animation: ModalAnimation = options.animation ?? DEFAULT_MODAL_ANIMATION;

  const manager = useDialogManagerContext();

  const { store, engine, open, openAndWait, handle } = createModalRuntime<TData, TReason>(modalId);

  const snapshot = fromStore(store);
  const actionState = fromStore(engine);

  // ── The element ─────────────────────────────────────────────────────────────
  //
  // Built here rather than described and handed to a renderer, which is what removes the ref
  // dance the React binding needs: `getDialog` can simply close over it.

  const dialog = document.createElement('dialog');
  const getDialog: GetDialog = () => {
    return dialog;
  };

  // A render effect rather than a plain one, for the reason the style effect below is: it runs
  // synchronously at creation, so the element is stamped before anything can insert or show it.
  // `aria-busy` is why this is an effect at all — the rest of the table never changes.
  createRenderEffect(() => {
    setDialogAttributes(
      dialog,
      dialogAttributes({
        modalId,
        nonModal: isNonModal,
        isPreparing: snapshot().isPreparing,
        ariaLabel: options.ariaLabel,
        ariaLabelledBy: options.ariaLabelledBy,
        ariaDescribedBy: options.ariaDescribedBy,
        role: options.role,
      })
    );
  });

  const content = document.createElement('div');
  applyStyle(content, DIALOG_CONTENT_STYLE);
  dialog.append(content);

  // The dialog's own styles, recomputed per phase. A render effect rather than an effect, so the
  // exit/entrance state is written before `syncOpenSequence` shows the dialog in the same flush.
  let appliedStyle: DialogStyle | undefined;
  createRenderEffect(() => {
    appliedStyle = applyStyle(
      dialog,
      getDialogAnimationStyles(snapshot().phase, animation, options.style, placement),
      appliedStyle
    );
  });

  // The host `dialogPlacement` asked for, when it asked for one: the dialog's `absolute`
  // positioning resolves against it, immune to a transformed ancestor above.
  let placed: HTMLElement = dialog;
  if (placement.host) {
    const host = document.createElement('div');
    host.setAttribute('data-modal-container', modalId);
    applyStyle(host, placement.host);
    host.append(dialog);
    placed = host;
  }

  const baseAction = createActionFactory(engine, actionState);

  /**
   * The core factory plus the one thing a fine-grained renderer owes it: an expiry.
   *
   * The owner here is whatever scope drew the button — the modal's content, or the `<Show>`
   * branch it sits in — so a button that disappears takes its declaration with it.
   *
   * Wrapping the *call* means re-attaching what hangs off it: `isRunning` is a property of the
   * factory, so an arrow that only forwarded the call would leave Solid with a factory the React
   * one has and it does not. The `typeof baseAction` annotation is what refuses that — since
   * `ActionFactory` is an object type with a call signature, a bare arrow is missing a required
   * property and fails to compile. `binding-parity.test.ts` would not catch it: that one diffs
   * the entry points' export *names*, and a property of a factory is not one.
   *
   * What the type cannot say is that the property stays *live* through the wrapper — that it is
   * still reading the same `readState` the props do — so a Solid component test asserts it.
   */
  const action: typeof baseAction = Object.assign(
    (...args: Parameters<typeof baseAction>) => {
      const props = baseAction(...args);
      if (getOwner()) {
        onCleanup(() => {
          engine.undeclare(args[0]);
        });
      }
      return props;
    },
    { isRunning: baseAction.isRunning }
  );

  const isPreparing = () => {
    return snapshot().isPreparing;
  };
  const hasRunningAction = () => {
    return actionState().hasRunningAction;
  };
  const currentError = () => {
    return actionState().error;
  };
  const isVisible = createMemo(() => {
    return snapshot().phase !== 'closed';
  });

  const renderArgs: ModalRenderArgs<TData, TReason> = {
    handle,
    action,
    get isPreparing() {
      return isPreparing();
    },
    get hasRunningAction() {
      return hasRunningAction();
    },
    get error() {
      return currentError();
    },
  };

  // ── Content ─────────────────────────────────────────────────────────────────
  //
  // Keyed on visibility alone, not on the whole snapshot: `isPreparing` reaches the content as a
  // getter, so a modal that starts loading updates the part that reads it instead of redrawing.
  insert(content, () => {
    if (!isVisible()) {
      return null;
    }
    // The declaration window. Actions drawn eagerly land in this pass; ones inside a `<Show>`
    // run later and declare themselves then — `declare` falls back to the live table for exactly
    // that case, and `undeclare` above is what retires them.
    return runDeclarationWindow(engine, () => {
      return options.render(renderArgs);
    });
  });

  // ── Backdrop click ──────────────────────────────────────────────────────────

  // The decision — variant, opt-in/opt-out, the shared dismissal gate, and the geometry — is
  // `modal-runtime.ts`'s, and it is the same call React's binding makes from its `onClick`.
  dialog.addEventListener('click', (event: MouseEvent) => {
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
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  const domContext = (): ModalDomContext => {
    return { store, getDialog, modalId, phase: snapshot().phase, manager };
  };

  createEffect(() => {
    syncOpenSequence(domContext(), { prepare: options.prepare, nonModal: isNonModal });
  });

  // Reading `isPreparing` here is what subscribes this effect to it — the effect above tracks the
  // phase alone, so a guard hidden inside the function would never bring the check back when
  // `prepare` settles.
  createEffect(() => {
    syncLabellingDiagnostics(domContext(), { isPreparing: snapshot().isPreparing });
  });

  const { primaryProperty, exitDuration } = resolveAnimation(animation);
  createEffect(() => {
    const teardown = syncCloseSequence(domContext(), {
      nonModal: isNonModal,
      primaryProperty,
      exitDuration,
    });
    if (teardown) {
      onCleanup(teardown);
    }
  });

  createEffect(() => {
    const snap = snapshot();
    const dom: ModalDomContext = { store, getDialog, modalId, phase: snap.phase, manager };
    const keydownOptions = {
      isPreparing: snap.isPreparing,
      onKeyDown: options.onKeyDown,
      dismissKey,
      engine,
      nonModal: isNonModal,
      dismissWhilePreparing,
      onDismissRequest: options.onDismissRequest,
    };
    const teardowns = [
      attachDialogKeydown(dom, keydownOptions),
      attachDialogCancel(dom, keydownOptions),
      attachWindowDismissKey(dom, keydownOptions),
    ];
    onCleanup(() => {
      for (const teardown of teardowns) {
        teardown?.();
      }
    });
  });

  const focus = createFocusCoordinator({ getDialog, modalId, manager }, { engine });
  createEffect(() => {
    const teardown = focus.sync(snapshot().phase);
    if (teardown) {
      onCleanup(teardown);
    }
  });

  createEffect(() => {
    const teardown = attachFocusContainment(domContext(), { containFocus });
    if (teardown) {
      onCleanup(teardown);
    }
  });

  createEffect(() => {
    const teardown = attachClickOutside(domContext(), {
      dismissOnClickOutside,
      dismissWhilePreparing,
      engine,
    });
    if (teardown) {
      onCleanup(teardown);
    }
  });

  // ── Registration + teardown ─────────────────────────────────────────────────
  //
  // Setup work, not effect work: a Solid component body runs once, so there is no
  // double-invocation to defend against and nothing structural can change under the
  // registration — which is why React's version needs an effect with a dependency list and this
  // one does not.

  // Always registered, so a callback added to the options object stays reachable; the store's
  // own `runOnClose` is a no-op when there is nothing to call.
  store.setOnClose((result) => {
    return options.onClose?.(result);
  });

  manager.register(modalId, store, {
    template,
    nonModal: isNonModal,
    getDialog,
    ...(options.onOpenRequest !== undefined && {
      // Returned, not swallowed: the manager awaits the handler, so an owner that validates
      // asynchronously still gets to refuse before `requestOpenAndWait` answers.
      onOpenRequest: (
        payload: unknown,
        request: Parameters<NonNullable<typeof options.onOpenRequest>>[1]
      ) => {
        return options.onOpenRequest?.(payload, request);
      },
    }),
  });

  onCleanup(() => {
    teardownModal(store, manager, modalId, getDialog());
  });

  // ── What the caller places ──────────────────────────────────────────────────

  const outlet = useModalOutletContext();

  let Modal: JSX.Element = placed;

  if (shouldPortal) {
    // **The one place the surface differs from React's, and it is the renderer's difference.**
    // React's `createPortal` produces a node the caller still has to render; a Solid modal owns
    // its element, so the binding mounts it here and `Modal` is `null`. Placing it anyway is
    // harmless, and neither an outlet nor a caller has to do anything for a portaled dialog to
    // appear — which is why there is no outlet registration on this branch.
    document.body.append(placed);
    onCleanup(() => {
      placed.remove();
    });
    Modal = null;
  } else if (outlet) {
    outlet.register(modalId, placed);
    onCleanup(() => {
      outlet.unregister(modalId);
    });
    Modal = null;
  }

  return {
    open,
    openAndWait,
    handle,
    action,
    Modal,
    dialogManager: manager,
    get isVisible() {
      return isVisible();
    },
    get isPreparing() {
      return isPreparing();
    },
    get hasRunningAction() {
      return hasRunningAction();
    },
    get error() {
      return currentError();
    },
  };
}
