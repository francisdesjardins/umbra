import { isOwnEventTarget } from '../utils/dialog-scope.js';
import { canDismiss } from '../utils/dismiss-gate.js';
import { clickHotkeyButton, matchesHotkey } from '../utils/hotkey-utils.js';
import { Key } from '../utils/keys.js';
import { createLogger } from '../utils/logger.js';
import type { ActionGate } from '../actions/action-engine.js';
import type { HotkeyDef } from '../actions/types.js';
import type { DialogKeydownOptions, ModalDomContext } from './attach-types.js';

const log = createLogger('modal:keydown');

/**
 * Three listeners answer the dismiss key, and all three are plain DOM.
 *
 * Which key dismisses, whether an action has claimed it, and whether the modal is in a state to
 * be dismissed at all are questions about a `<dialog>` and a store — no framework has an opinion.
 * A binding decides *when* to attach and detach; each function here returns the teardown for
 * exactly what it attached.
 */

/**
 * Whether an action has claimed the dismiss key, in which case dismissal defers to it.
 *
 * Asked at keydown rather than captured during render: actions are declared *by* rendering, so
 * on the first pass this runs before any of them exist.
 */
const actionOwnsDismissKey = (engine: ActionGate, dismissKey: HotkeyDef | false) => {
  return dismissKey !== false && engine.ownsHotkey(dismissKey);
};

/**
 * Fire the action whose hotkey this is by clicking its button, so a hotkey runs exactly the
 * path a real click does — loading state, `disabled` and any `onClick` veto all included.
 */
const dispatchActionHotkey = (engine: ActionGate, event: KeyboardEvent, dialog: HTMLElement) => {
  if (engine.aggregated().hasRunningAction) {
    return false;
  }
  const match = engine.matchHotkey(event);
  if (!match) {
    return false;
  }
  event.preventDefault();
  clickHotkeyButton(dialog, match.hotkey);
  return true;
};

/**
 * Dismiss-key handling on the dialog element, ahead of the browser's own `cancel`.
 *
 * Intercepting at keydown is what prevents the native cancel cascade with stacked `showModal()`
 * dialogs. Native Escape is always `preventDefault()`ed regardless of the configured
 * `dismissKey`, so the browser can never close a dialog behind its store.
 */
export function attachDialogKeydown(
  ctx: ModalDomContext,
  options: DialogKeydownOptions
): (() => void) | undefined {
  const { store, getDialog, modalId, phase } = ctx;
  const { isPreparing, onKeyDown, dismissKey, engine, dismissWhilePreparing } = options;

  const dialog = getDialog();
  if (!dialog || phase === 'closed') {
    return undefined;
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    // A modal opened from inside this one renders its `<dialog>` in this subtree, so its
    // keydowns bubble through here. They are not ours: without this, one Escape unwinds the
    // whole stack at once and a key both modals declare fires at every level it passes.
    if (!isOwnEventTarget(dialog, event.target)) {
      return;
    }

    // Not gated on `isPreparing`: action buttons render from the moment the phase leaves
    // `'closed'` and stay clickable, and a hotkey is the same trigger as its button.
    // `dismissWhilePreparing` governs dismissal, below — a separate question.
    if (onKeyDown) {
      onKeyDown(event);
      if (event.defaultPrevented) {
        return;
      }
    }

    // An action's hotkey beats dismissal, and runs through the button so the click path and
    // the key path stay the same path.
    if (dispatchActionHotkey(engine, event, dialog)) {
      return;
    }

    // Always suppress native Escape cancel to prevent cascade on stacked dialogs,
    // regardless of the configured dismissKey.
    if (event.key === 'Escape') {
      event.preventDefault();
    }

    if (dismissKey !== false && matchesHotkey(event, dismissKey)) {
      if (
        actionOwnsDismissKey(engine, dismissKey) ||
        !canDismiss({
          phase,
          isPreparing,
          dismissWhilePreparing,
          hasRunningAction: engine.aggregated().hasRunningAction,
        })
      ) {
        return;
      }

      log('Dismiss key', { id: modalId, key: dismissKey });
      store.close('dismiss');
    }
  };

  dialog.addEventListener('keydown', handleKeyDown);
  return () => {
    dialog.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * The native `cancel` event, which fires for Escape regardless of where focus is.
 *
 * The keydown listener above only hears keys raised inside the dialog, and focus outside an open
 * modal is ordinary: `showModal()` has nowhere to put it when nothing in the content is
 * focusable, and content that swaps after opening drops whatever held it. Always prevented — the
 * browser must never close the dialog behind the store. Whether ESC then dismisses is decided by
 * the usual gate. Non-modal dialogs never fire it.
 */
export function attachDialogCancel(
  ctx: ModalDomContext,
  options: DialogKeydownOptions
): (() => void) | undefined {
  const { store, getDialog, modalId, phase } = ctx;
  const { isPreparing, dismissKey, engine, dismissWhilePreparing } = options;

  const dialog = getDialog();
  if (!dialog || phase === 'closed') {
    return undefined;
  }

  const handleCancel = (event: Event) => {
    event.preventDefault();

    // `cancel` means the Escape key specifically, so it can only stand in for a dismiss key
    // that *is* Escape. Any other `dismissKey` (or `false`) leaves ESC inert — but still
    // prevented, which is the point of the cascade guard.
    if (dismissKey !== Key.Escape) {
      return;
    }

    if (actionOwnsDismissKey(engine, dismissKey)) {
      clickHotkeyButton(dialog, dismissKey);
      return;
    }

    if (
      !canDismiss({
        phase,
        isPreparing,
        dismissWhilePreparing,
        hasRunningAction: engine.aggregated().hasRunningAction,
      })
    ) {
      return;
    }

    log('Dismiss key (native cancel)', { id: modalId });
    store.close('dismiss');
  };

  dialog.addEventListener('cancel', handleCancel);
  return () => {
    dialog.removeEventListener('cancel', handleCancel);
  };
}

/**
 * The non-modal case: a window-level capture listener so the dismiss key works wherever focus is.
 *
 * It claims the key only once it has decided to act — a panel sits over a live page, and taking a
 * key to do nothing with it is not a trade that page agreed to.
 */
export function attachWindowDismissKey(
  ctx: ModalDomContext,
  options: DialogKeydownOptions
): (() => void) | undefined {
  const { store, getDialog, modalId, phase, dm } = ctx;
  const { isPreparing, dismissKey, engine, nonModal, dismissWhilePreparing } = options;

  if (!nonModal || phase === 'closed' || dismissKey === false) {
    return undefined;
  }

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (!matchesHotkey(event, dismissKey)) {
      return;
    }
    // Only the topmost dialog intercepts the dismiss key — stand down if another dialog is above us.
    if (!dm.lookup().isForeground(modalId)) {
      return;
    }

    if (
      !canDismiss({
        phase,
        isPreparing,
        dismissWhilePreparing,
        hasRunningAction: engine.aggregated().hasRunningAction,
      })
    ) {
      // No claim on a press it refuses: swallowing it here is a dead keyboard for whatever
      // else the page listens with.
      return;
    }

    // From here the panel acts, so the key is ours — no underlying listener should react a
    // second time to the press that dismissed it.
    event.preventDefault();
    event.stopPropagation();

    if (actionOwnsDismissKey(engine, dismissKey)) {
      // An action declared this key as its hotkey.
      // The window listener's stopPropagation() prevents the dialog-level keydown
      // from firing, so we must dispatch the action by clicking the button directly.
      const dialog = getDialog();
      if (dialog) {
        clickHotkeyButton(dialog, dismissKey);
      }
      return;
    }

    log('Dismiss key (window capture)', { id: modalId, key: dismissKey });
    store.close('dismiss');
  };

  window.addEventListener('keydown', handleWindowKeyDown, { capture: true });
  return () => {
    window.removeEventListener('keydown', handleWindowKeyDown, { capture: true });
  };
}
