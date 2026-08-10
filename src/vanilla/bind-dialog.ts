import { createActionFactory } from '../core/action-factory.js';
import { DISMISS_REASON } from '../core/dismiss-reason.js';
import { attachClickOutside } from '../core/attach-click-outside.js';
import { createFocusCoordinator } from '../core/attach-focus.js';
import {
  attachDialogCancel,
  attachDialogKeydown,
  attachWindowDismissKey,
} from '../core/attach-keydown.js';
import { syncOpenSequence, syncCloseSequence } from '../core/attach-lifecycle.js';
import { dialogAttributes } from '../core/dialog-props.js';
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
import { createLogger } from '../utils/logger.js';
import type { ModalDomContext } from '../core/attach-types.js';
import type { DialogStyle } from '../core/style.js';
import type { GetDialog, ModalAnimation } from '../core/types.js';
import type { BindDialogOptions, DialogController, ModalSnapshot } from './types.js';

const log = createLogger('modal');

/**
 * Drive a `<dialog>` you wrote yourself, with everything the hook bindings give theirs.
 *
 * **A controller, not a renderer** — which is the whole difference, and the reason this binding's
 * surface is not `useModal`'s. React and Solid render a dialog *and* its contents from a `render`
 * callback; a vanilla binding that did the same would have to invent a renderer, and a library
 * whose first rule is "zero shipped UI" has no business doing that. So the element is yours and
 * the lifecycle is ours: phases and the entrance/exit animation, `prepare` with its `AbortSignal`,
 * the dismiss key (dialog, native `cancel`, and window-level for a non-modal panel),
 * click-outside, backdrop hit-testing, opening focus and restoration, the manager registration
 * that makes it addressable by id, and the typed close.
 *
 * Nothing below is a decision this file makes. Every one of them is a call into `core/`, the same
 * calls `umbra/react` and `umbra/solid` make in the same order — which is the claim the
 * architecture rests on, tested here by a consumer that is not a framework at all.
 *
 * @example
 * const confirm = bindDialog<{ id: string }, 'approve' | 'decline'>({
 *   id: 'billing:confirm',
 *   dialog: confirmDialog,
 *   onClose: (result) => report(result.reason),
 * });
 *
 * const unbind = confirm.bindAction(approveButton, 'approve', {
 *   hotkey: 'Enter',
 *   onAction: async (close) => {
 *     close(await charge());
 *   },
 * });
 *
 * const [error, result] = await confirm.openAndWait();
 */
export function bindDialog<TData = void, TReason extends string = string>(
  options: BindDialogOptions<TData, TReason>
): DialogController<TData, TReason> {
  const modalId = options.id;
  const { dialog } = options;
  const manager = options.manager ?? singleton;

  const resolved = resolveModalOptions(options);
  // Annotated for the reason the other two bindings give: an un-annotated fallback leaves a union
  // whose branches disagree about the style parameter `getDialogAnimationStyles` infers.
  const animation: ModalAnimation = options.animation ?? DEFAULT_MODAL_ANIMATION;
  const { primaryProperty, exitDuration } = resolveAnimation(animation);

  const { store, engine, open, openAndWait, handle } = createModalRuntime<TData, TReason>(modalId);
  const getDialog: GetDialog = () => {
    return dialog;
  };

  // ── The element ─────────────────────────────────────────────────────────────

  for (const [name, value] of Object.entries(
    dialogAttributes({
      modalId,
      nonModal: resolved.isNonModal,
      ariaLabel: options.ariaLabel,
      ariaLabelledBy: options.ariaLabelledBy,
      ariaDescribedBy: options.ariaDescribedBy,
      role: options.role,
    })
  )) {
    // Skipped when absent rather than emptied, which here does double duty: an unnamed dialog
    // stays visibly unnamed to an audit, *and* an `aria-labelledby` written in the caller's own
    // markup is not overwritten by an option they never passed.
    if (value !== undefined) {
      dialog.setAttribute(name, value);
    }
  }

  if (resolved.placement.host) {
    // A contained panel is positioned `absolute` against a host, and in a binding that owns no
    // markup the host has to be pointed at. The parent is the sane default — it is what the
    // dialog is already inside.
    const host = options.host ?? dialog.parentElement;
    if (host) {
      host.setAttribute('data-modal-container', modalId);
      applyStyle(host, resolved.placement.host);
    } else {
      log.warn('Contained dialog has no host to position against', { id: modalId });
    }
  }

  // ── Registration ────────────────────────────────────────────────────────────

  store.setOnClose((result) => {
    return options.onClose?.(result);
  });

  manager.register(modalId, store, {
    template: resolved.template,
    nonModal: resolved.isNonModal,
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

  // ── Backdrop click ──────────────────────────────────────────────────────────

  const handleDialogClick = (event: MouseEvent) => {
    if (
      shouldDismissOnBackdropClick(event, dialog, {
        store,
        engine,
        isNonModal: resolved.isNonModal,
        dismissOnBackdropClick: resolved.dismissOnBackdropClick,
        dismissWhilePreparing: resolved.dismissWhilePreparing,
      })
    ) {
      store.close(DISMISS_REASON);
    }
  };
  dialog.addEventListener('click', handleDialogClick);

  // ── The driver ──────────────────────────────────────────────────────────────
  //
  // React re-runs effects on a render and Solid re-runs them on a signal; there is neither here,
  // so the store itself is the clock. Attachments are torn down and rebuilt when the two values
  // they depend on change — the phase and whether `prepare` is still running — which is the same
  // dependency list the other two bindings hand their effect systems.

  const focus = createFocusCoordinator({ getDialog }, { engine });

  let appliedStyle: DialogStyle | undefined;
  let detachments: (() => void)[] = [];
  let attachedFor = '';

  const domContext = (phase: ModalSnapshot['phase']): ModalDomContext => {
    return { store, getDialog, modalId, phase, manager };
  };

  const sync = () => {
    const snapshot = store.getSnapshot();

    // Styles first, so the exit/entrance state is on the element before `syncOpenSequence` shows it.
    appliedStyle = applyStyle(
      dialog,
      getDialogAnimationStyles(snapshot.phase, animation, options.style, resolved.placement),
      appliedStyle
    );

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
      };

      detachments = [
        attachDialogKeydown(ctx, keydownOptions),
        attachDialogCancel(ctx, keydownOptions),
        attachWindowDismissKey(ctx, keydownOptions),
        attachClickOutside(ctx, {
          dismissOnClickOutside: resolved.dismissOnClickOutside,
          dismissWhilePreparing: resolved.dismissWhilePreparing,
          engine,
        }),
        syncCloseSequence(ctx, {
          nonModal: resolved.isNonModal,
          primaryProperty,
          exitDuration,
        }),
        focus.sync(snapshot.phase),
      ].filter((detach) => {
        return detach !== undefined;
      });
    }

    // Guarded internally on `phase === 'opening'` and `!dialog.open`, so calling it on every
    // notification is what the other two bindings' dependency-array-free effect does.
    syncOpenSequence(domContext(snapshot.phase), {
      prepare: options.prepare,
      nonModal: resolved.isNonModal,
    });
  };

  const unsubscribe = store.subscribe(sync);
  // Once up front, so a closed dialog carries `display: none` before anything can see it.
  sync();

  // ── Actions ─────────────────────────────────────────────────────────────────

  // The engine's own snapshot, because there is no reactive layer to read it through. The props'
  // live fields are still getters; `syncState` below is what pushes them onto the element, which
  // is the job a renderer does in the other two bindings.
  const action = createActionFactory<TData, TReason>(engine, engine.getSnapshot);

  const bindAction: DialogController<TData, TReason>['bindAction'] = (
    button,
    reason,
    actionOptions
  ) => {
    const props = action(reason, actionOptions);

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
      // Retiring the declaration is the half a render pass would have done: it is what stops the
      // hotkey outliving the button, and what lets `hasActions()` go back to false.
      engine.undeclare(reason);
    };
  };

  // ── Reading state ───────────────────────────────────────────────────────────

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
    teardownModal(store, manager, modalId, dialog);
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
