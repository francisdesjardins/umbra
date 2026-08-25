import { createActionFactory } from '../core/action-factory.js';
import type { RegisteredModalId } from '../core/registry.js';
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
import { dialogAttributes, setDialogAttributes } from '../core/dialog-props.js';
import {
  createModalRuntime,
  resolveModalOptions,
  shouldDismissOnBackdropClick,
  teardownModal,
} from '../core/modal-runtime.js';
import { applyStyle } from '../core/style.js';
import { dialogManager as singleton } from '../manager/dialog-manager.js';
import {
  DEFAULT_MODAL_ANIMATION,
  getDialogAnimationStyles,
  resolveAnimation,
} from '../utils/animation-utils.js';
import { answerDismiss } from '../utils/dismiss-gate.js';
import { createLogger } from '../utils/logger.js';
import type { ModalDomContext } from '../core/attach-types.js';
import type { DialogStyle } from '../core/style.js';
import type { GetDialog, ModalAnimation } from '../core/types.js';
import type {
  BindDialogOptions,
  DialogController,
  ModalSnapshot,
  RegisteredBindOptions,
  RegisteredController,
} from './types.js';

const log = createLogger('modal');

/**
 * Drive a `<dialog>` you wrote yourself, with everything the hook bindings give theirs.
 *
 * **A controller, not a renderer**: the element is yours, the lifecycle is ours, and every step of
 * it is a call into `core/` in the order `umbra/react` and `umbra/solid` make the same calls.
 *
 * The only binding that can adopt **server-rendered** markup, the element being in the document
 * already. One that arrives open is adopted where it stands if it declares `nonModal`, and closed
 * with a warning otherwise: the top layer is enterable only from script, so an `open` attribute in
 * HTML is by definition a non-modal open.
 * @example
 * const confirm = bindDialog<{ id: string }, 'approve' | 'decline'>({
 *   id: 'billing:confirm',
 *   dialog: confirmDialog,
 *   onClose: (result) => report(result.reason),
 * });
 *
 * const unbind = confirm.bindAction(approveButton, {
 *   reason: 'approve',
 *   hotkey: 'Enter',
 *   onAction: async (close) => {
 *     close(await charge());
 *   },
 * });
 *
 * const [error, result] = await confirm.openAndWait();
 */
/**
 * The registered door, first so a declared id is matched by it. While `ModalRegistry` is empty
 * `RegisteredModalId` is `never`, the overload is uninhabitable, and every call falls through to
 * the one below — which is the signature `bindDialog` has always had.
 */
export function bindDialog<TId extends RegisteredModalId>(
  options: RegisteredBindOptions<TId>
): RegisteredController<TId>;
export function bindDialog<TData = void, TReason extends string = string>(
  options: BindDialogOptions<TData, TReason>
): DialogController<TData, TReason>;
export function bindDialog<TData = void, TReason extends string = string>(
  options: BindDialogOptions<TData, TReason>
): DialogController<TData, TReason> {
  const modalId = options.id;
  const { dialog } = options;
  const manager = options.manager ?? singleton;

  const resolved = resolveModalOptions(options);
  // Annotated for the reason React's binding gives.
  const animation: ModalAnimation = options.animation ?? DEFAULT_MODAL_ANIMATION;
  const { primaryProperty, exitDuration } = resolveAnimation(animation);

  const { store, engine, open, openAndWait, handle } = createModalRuntime<TData, TReason>(modalId);
  const getDialog: GetDialog = () => {
    return dialog;
  };

  // Absent options skip rather than empty, so an audit still sees an unnamed dialog and an
  // `aria-labelledby` in the caller's markup survives. A function, because `aria-busy` moves.
  const writeAttributes = () => {
    setDialogAttributes(
      dialog,
      dialogAttributes({
        modalId,
        nonModal: resolved.isNonModal,
        isPreparing: store.getSnapshot().isPreparing,
        ariaLabel: options.ariaLabel,
        ariaLabelledBy: options.ariaLabelledBy,
        ariaDescribedBy: options.ariaDescribedBy,
        role: options.role,
      })
    );
  };
  // Before registration, so nothing can observe the element without its identity on it.
  writeAttributes();

  if (resolved.placement.host) {
    // The parent is the only host a binding that owns no markup can assume.
    const host = options.host ?? dialog.parentElement;
    if (host) {
      host.setAttribute('data-modal-container', modalId);
      applyStyle(host, { next: resolved.placement.host });
    } else {
      log.warn('Contained dialog has no host to position against', { id: modalId });
    }
  }

  store.setOnClose((result) => {
    return options.onClose?.(result);
  });

  manager.register(modalId, {
    store,
    template: resolved.template,
    nonModal: resolved.isNonModal,
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

  const handleDialogClick = (event: MouseEvent) => {
    if (
      shouldDismissOnBackdropClick(event, {
        dialog,
        store,
        engine,
        isNonModal: resolved.isNonModal,
        dismissOnBackdropClick: resolved.dismissOnBackdropClick,
        dismissWhilePreparing: resolved.dismissWhilePreparing,
      })
    ) {
      answerDismiss(store, { request: options.onDismissRequest, cause: 'backdrop-click' });
    }
  };
  dialog.addEventListener('click', handleDialogClick);

  // No render and no signal here, so the store is the clock: attachments rebuild when the phase or
  // `prepare`'s progress moves, the dependency list the other two bindings hand their effects.
  const focus = createFocusCoordinator({ getDialog, modalId, manager }, { engine });

  let appliedStyle: DialogStyle | undefined;
  let detachments: (() => void)[] = [];
  let attachedFor = '';

  const domContext = (phase: ModalSnapshot['phase']): ModalDomContext => {
    return { store, getDialog, modalId, phase, manager };
  };

  const sync = () => {
    const snapshot = store.getSnapshot();

    // `aria-busy` is the only one of these that moves.
    writeAttributes();

    // Styles first, so the exit/entrance state is on the element before `syncOpenSequence` shows it.
    appliedStyle = applyStyle(dialog, {
      next: getDialogAnimationStyles(snapshot.phase, {
        animation,
        customStyle: options.style,
        placement: resolved.placement,
      }),
      previous: appliedStyle,
    });

    const key = `${snapshot.phase}:${String(snapshot.isPreparing)}`;
    if (key !== attachedFor) {
      attachedFor = key;
      for (const detach of detachments) {
        detach();
      }

      const ctx = domContext(snapshot.phase);
      const keydownOptions = {
        isPreparing: snapshot.isPreparing,
        onKeyDown: options.onKeyDown,
        dismissKey: resolved.dismissKey,
        engine,
        nonModal: resolved.isNonModal,
        dismissWhilePreparing: resolved.dismissWhilePreparing,
        onDismissRequest: options.onDismissRequest,
      };

      detachments = [
        attachDialogKeydown(ctx, keydownOptions),
        attachDialogCancel(ctx, keydownOptions),
        attachWindowDismissKey(ctx, keydownOptions),
        attachClickOutside(ctx, {
          dismissOnClickOutside: resolved.dismissOnClickOutside,
          dismissWhilePreparing: resolved.dismissWhilePreparing,
          engine,
          onDismissRequest: options.onDismissRequest,
        }),
        attachFocusContainment(ctx, { containFocus: resolved.containFocus }),
        syncCloseSequence(ctx, {
          onError: options.onError,
          nonModal: resolved.isNonModal,
          primaryProperty,
          exitDuration,
        }),
        focus.sync(snapshot.phase),
      ].filter((detach) => {
        return detach !== undefined;
      });
    }

    // Guarded internally on `phase === 'opening'` and `!dialog.open`, so every notification is safe.
    syncOpenSequence(domContext(snapshot.phase), {
      prepare: options.prepare,
      onError: options.onError,
      nonModal: resolved.isNonModal,
    });

    syncLabellingDiagnostics(domContext(snapshot.phase), {
      isPreparing: snapshot.isPreparing,
    });
  };

  // The hydration gap: a server-rendered `<dialog open>` meets a store saying `closed`, and the
  // first style write would hide an element the DOM still reports open. Only the non-modal case is
  // honest (see above), so a modal one is closed instead.
  if (dialog.open) {
    if (resolved.isNonModal) {
      log('Adopting a dialog that was already open', { id: modalId });
      store.beginOpen();
      store.scheduleOpenTransition();
      store.finishPreparing();
    } else {
      log.warn(
        'A modal dialog cannot be adopted open — the top layer is only enterable from script, so ' +
          'this one was closed. Render it closed and call open().',
        { id: modalId }
      );
      dialog.close();
    }
  }

  const unsubscribe = store.subscribe(sync);
  // Once up front, so a closed dialog carries `display: none` before anything can see it.
  sync();

  // The engine's own snapshot: no reactive layer here, so `syncState` below pushes the props' live
  // getters onto the element, the job a renderer does elsewhere.
  const action = createActionFactory<TData, TReason>(engine, engine.getSnapshot);

  const bindAction: DialogController<TData, TReason>['bindAction'] = (button, binding) => {
    const { reason, ...actionOptions } = binding;
    const props = action(reason, actionOptions);

    // Retiring the action must retire its writes onto a button this binding did not create — one
    // left `disabled` is a dead control. Restoring, not clearing, keeps a button the caller
    // disabled off; the *attribute*, since `button.type` reads `'submit'` when there is no `type`.
    const restore = [
      'type',
      'disabled',
      'data-loading',
      'aria-busy',
      'aria-keyshortcuts',
      'data-focus-on-open',
    ].map((name) => {
      const previous = button.getAttribute(name);
      return () => {
        if (previous === null) {
          button.removeAttribute(name);
        } else {
          button.setAttribute(name, previous);
        }
      };
    });

    button.type = props.type;
    if (props['aria-keyshortcuts'] !== undefined) {
      button.setAttribute('aria-keyshortcuts', props['aria-keyshortcuts']);
    }
    if (props['data-focus-on-open'] === true) {
      button.setAttribute('data-focus-on-open', 'true');
    }

    const handleClick = (event: MouseEvent) => {
      void props.onClick(event);
    };
    button.addEventListener('click', handleClick);

    const syncState = () => {
      button.disabled = props.disabled;
      button.setAttribute('data-loading', String(props['data-loading']));
      button.setAttribute('aria-busy', String(props['aria-busy']));
    };
    syncState();
    const unsubscribeState = engine.subscribe(syncState);

    return () => {
      unsubscribeState();
      button.removeEventListener('click', handleClick);
      // Stops the hotkey outliving the button and lets `hasActions()` go back to false.
      engine.undeclare(reason);
      for (const undo of restore) {
        undo();
      }
    };
  };

  const getSnapshot = (): ModalSnapshot => {
    const { phase, isPreparing } = store.getSnapshot();
    const { hasRunningAction, error } = engine.aggregated();
    return { phase, isVisible: phase !== 'closed', isPreparing, hasRunningAction, error };
  };

  const subscribe = (listener: () => void) => {
    const offStore = store.subscribe(listener);
    const offEngine = engine.subscribe(listener);
    return () => {
      offStore();
      offEngine();
    };
  };

  const destroy = () => {
    unsubscribe();
    for (const detach of detachments) {
      detach();
    }
    detachments = [];
    dialog.removeEventListener('click', handleDialogClick);
    teardownModal(store, { manager, modalId, dialog, onError: options.onError });
    // Destroyed mid-`prepare`, nothing else would ever clear `aria-busy` off the caller's element.
    writeAttributes();
  };

  return {
    open,
    openAndWait,
    handle,
    bindAction,
    isActionRunning: action.isRunning,
    subscribe,
    getSnapshot,
    destroy,
    dialogManager: manager,
  };
}
