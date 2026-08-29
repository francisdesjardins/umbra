import { createEffect, createMemo, createRenderEffect, getOwner, onCleanup } from 'solid-js';
import { insert } from 'solid-js/web';
import type { JSX } from 'solid-js';
import type { RegisteredDialogId } from '../core/registry.js';
import type { RegisteredOptions, RegisteredReturn } from '../core/registered-types.js';
import { runDeclarationWindow } from '../actions/action-engine.js';
import { createActionFactory } from '../core/action-factory.js';
import {
  DIALOG_CONTENT_STYLE,
  dialogAttributes,
  setDialogAttributes,
  createBackdropPressGuard,
} from '../core/dialog-props.js';
import { createDialogDirector } from '../core/dialog-director.js';
import {
  createDialogRuntime,
  resolveDialogOptions,
  resolvePortalHost,
  shouldDismissOnBackdropClick,
  teardownDialog,
} from '../core/dialog-runtime.js';
import { applyStyle } from '../core/style.js';
import {
  DEFAULT_DIALOG_ANIMATION,
  getDialogAnimationStyles,
  resolveAnimation,
} from '../utils/animation-utils.js';
import { answerDismiss } from '../utils/dismiss-gate.js';
import { useDialogManagerContext } from './dialog-manager-context.js';
import { fromStore } from './from-store.js';
import { useDialogOutletContext } from './dialog-outlet.js';
import type { DialogStyle } from '../core/style.js';
import type { GetDialog, DialogRenderArgs } from '../core/types.js';
import type { DialogAnimation, UseDialogOptions, UseDialogReturn } from './types.js';

/**
 * `umbra/solid`'s core hook — the same `useDialog` as React's, over the same core.
 *
 * **Written without JSX, on purpose**: Solid's JSX is a compile step (`babel-preset-solid`), and
 * requiring it to build *the library* would put a second toolchain in the way. So the `<dialog>`
 * is built with `document.createElement` and Solid's own `insert`, which is what compiled JSX
 * emits anyway; consumers write ordinary JSX and only a `JSX.Element` crosses the boundary.
 *
 * Two differences from React's binding, both the renderer's: nothing re-renders, and an action
 * un-declares itself — a button removed by its own `<Show>` calls `engine.undeclare` from
 * `onCleanup`, without which its hotkey lives on and `hasActions()`, which decides whether a
 * backdrop click dismisses, never returns to false.
 *
 * @typeParam TData - Type of the close data payload. Defaults to `void`.
 * @typeParam TReason - The reasons this dialog closes with. Declare them.
 */
/**
 * The registered door, first so a declared id is matched by it — whether the caller wrote the id as
 * a literal and let it infer, or named it as the one type argument. While `DialogRegistry` is empty
 * `RegisteredDialogId` is `never`, this overload is uninhabitable, and every call falls through to
 * the one below, which is the signature this hook has always had.
 */
export function useDialog<TId extends RegisteredDialogId>(
  options: RegisteredOptions<TId, DialogStyle, JSX.Element>
): RegisteredReturn<TId, JSX.Element>;
export function useDialog<TData = void, TReason extends string = string>(
  options: UseDialogOptions<TData, TReason>
): UseDialogReturn<TData, TReason>;
export function useDialog<TData = void, TReason extends string = string>(
  options: UseDialogOptions<TData, TReason>
): UseDialogReturn<TData, TReason> {
  const dialogId = options.id;

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

  // Annotated for the reason React's binding gives.
  const animation: DialogAnimation = options.animation ?? DEFAULT_DIALOG_ANIMATION;

  const manager = useDialogManagerContext();

  // Built here rather than handed to a renderer, so `getDialog` closes over it — no ref dance.
  const dialog = document.createElement('dialog');
  const getDialog: GetDialog = () => {
    return dialog;
  };

  const { store, engine, open, openAndWait, handle } = createDialogRuntime<TData, TReason>(
    dialogId,
    getDialog
  );

  const snapshot = fromStore(store);
  const actionState = fromStore(engine);

  // A render effect, so the element is stamped at creation, before anything can insert or show it.
  // `aria-busy` is why it is an effect at all — the rest of the table is fixed.
  createRenderEffect(() => {
    setDialogAttributes(
      dialog,
      dialogAttributes({
        dialogId,
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
  applyStyle(content, { next: DIALOG_CONTENT_STYLE });
  dialog.append(content);

  // A render effect, so the exit/entrance state is written before `syncOpenSequence` shows it.
  let appliedStyle: DialogStyle | undefined;
  createRenderEffect(() => {
    appliedStyle = applyStyle(dialog, {
      next: getDialogAnimationStyles(snapshot().phase, {
        animation,
        customStyle: options.style,
        placement,
      }),
      previous: appliedStyle,
    });
  });

  // The dialog's `absolute` positioning resolves against this host, immune to a transform above.
  let placed: HTMLElement = dialog;
  if (placement.host) {
    const host = document.createElement('div');
    host.setAttribute('data-dialog-container', dialogId);
    applyStyle(host, { next: placement.host });
    host.append(dialog);
    placed = host;
  }

  const baseAction = createActionFactory(engine, actionState);

  // The core factory plus the expiry a fine-grained renderer owes it: the owner is whatever scope
  // drew the button, so one that disappears takes its declaration with it. `typeof baseAction`
  // stops a bare arrow dropping `isRunning` off the wrapper, which `binding-parity.test.ts` cannot
  // catch.
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

  const renderArgs: DialogRenderArgs<TData, TReason> = {
    handle,
    action,
    get isPreparing() {
      return isPreparing();
    },
    get phase() {
      return snapshot().phase;
    },
    get hasRunningAction() {
      return hasRunningAction();
    },
    get error() {
      return currentError();
    },
  };

  // Keyed on visibility alone, not the whole snapshot: `isPreparing` reaches the content as a
  // getter, so a dialog that starts loading updates the part that reads it instead of redrawing.
  insert(content, () => {
    if (!isVisible()) {
      return null;
    }
    // The declaration window. Actions inside a `<Show>` run after it and declare themselves then,
    // which is why `declare` falls back to the live table and `undeclare` above retires them.
    return runDeclarationWindow(engine, () => {
      return options.render(renderArgs);
    });
  });

  const backdropPress = createBackdropPressGuard();
  dialog.addEventListener('pointerdown', (event: PointerEvent) => {
    backdropPress.press(event);
  });

  // The decision is `dialog-runtime.ts`'s — the same call React's binding makes from its `onClick`.
  dialog.addEventListener('click', (event: MouseEvent) => {
    if (
      shouldDismissOnBackdropClick(event, {
        pressedOnBackdrop: backdropPress.take(),
        dialog,
        store,
        engine,
        isNonModal,
        dismissOnBackdropClick,
        dismissWhilePreparing,
      })
    ) {
      // Read off `options` at the event rather than captured: this listener is attached once, and
      // the owner's handler is a prop like any other.
      answerDismiss(store, { request: options.onDismissRequest, cause: 'backdrop-click' });
    }
  });

  // One effect, and **no `onCleanup` inside it**: Solid runs an effect's cleanups before every
  // re-run, which would tear the sequence down each pass and leave the director nothing to diff.
  // Everything comes off in `destroy()`. It tracks the snapshot and the option getters the body
  // reads.
  const { primaryProperty, exitDuration } = resolveAnimation(animation);
  const director = createDialogDirector({ store, getDialog, dialogId, manager, engine });

  createEffect(() => {
    const snap = snapshot();
    director.sync({
      phase: snap.phase,
      isPreparing: snap.isPreparing,
      prepare: options.prepare,
      onError: options.onError,
      onKeyDown: options.onKeyDown,
      nonModal: isNonModal,
      primaryProperty,
      exitDuration,
      dismissKey,
      dismissWhilePreparing,
      onDismissRequest: options.onDismissRequest,
      containFocus,
      dismissOnClickOutside,
    });
  });

  // Setup, not effect work: a Solid body runs once, so nothing structural changes under the
  // registration — which is why React's needs a dependency list. Always registered, so a callback
  // added later stays reachable; `runOnClose` no-ops when there is none.
  store.setOnClose((result) => {
    return options.onClose?.(result);
  });

  store.setRestoreFocusTo((result) => {
    return options.restoreFocusTo?.(result);
  });

  manager.register(dialogId, {
    store,
    template,
    nonModal: isNonModal,
    getDialog,
    ...(options.onOpenRequest !== undefined && {
      // Returned, not swallowed — the manager awaits it, so an async validation can still refuse.
      onOpenRequest: (
        payload: unknown,
        request: Parameters<NonNullable<typeof options.onOpenRequest>>[1]
      ) => {
        return options.onOpenRequest?.(payload, request);
      },
    }),
  });

  onCleanup(() => {
    // One cleanup rather than two: Solid runs an owner's cleanups in reverse registration order,
    // so a pair would read as the opposite of what it does. Detachments first, as in React.
    director.destroy();
    teardownDialog(store, { manager, dialogId, dialog: getDialog(), onError: options.onError });
  });

  const outlet = useDialogOutletContext();

  let Dialog: JSX.Element = placed;

  if (isPortaled) {
    // The one place the surface differs from React's: a Solid dialog owns its element, so the
    // binding mounts it and `Dialog` is `null`. Resolved once: this branch mounts the node itself
    // and runs exactly once, so a moving getter has nothing left to move.
    const host = resolvePortalHost(options.portal, document.body) ?? document.body;
    host.append(placed);
    onCleanup(() => {
      placed.remove();
    });
    Dialog = null;
  } else if (outlet) {
    outlet.register(dialogId, placed);
    onCleanup(() => {
      outlet.unregister(dialogId);
    });
    Dialog = null;
  }

  return {
    open,
    openAndWait,
    handle,
    action,
    Dialog,
    dialogManager: manager,
    get isVisible() {
      return isVisible();
    },
    get phase() {
      return snapshot().phase;
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
