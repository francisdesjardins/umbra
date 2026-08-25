import { isOwnEventTarget, queryOwn } from '../utils/dialog-scope.js';
import { answerDismiss, canDismiss } from '../utils/dismiss-gate.js';
import { formatAriaKeyshortcuts, matchesHotkey } from '../utils/hotkey-utils.js';
import { Key } from '../utils/keys.js';
import { createLogger } from '../utils/logger.js';
import type { ActionGate } from '../actions/action-engine.js';
import type { HotkeyDef } from '../actions/types.js';
import type { DialogKeydownOptions, ModalDomContext } from './attach-types.js';

const log = createLogger('modal:keydown');

/**
 * Find the button a hotkey is wired to — by its `aria-keyshortcuts` value — then focus and click
 * it, so the key dispatches through the same path a real click does.
 *
 * The attribute and this selector are the same function's output on purpose: they are two halves
 * of one lookup, and a spelling that drifted between them would leave every hotkey silently dead.
 *
 * It lives here rather than beside `formatAriaKeyshortcuts`, its only other collaborator: this is
 * the one DOM function in that pair's file, and hosting it kept an otherwise pure module out of
 * reach of the unit project. `queryOwn` scopes it to `dialog`'s own content — a modal opened from
 * inside this one lives in this subtree, and clicking its button from here would fire the action
 * of a modal that is not even in front.
 */
function clickHotkeyButton(dialog: HTMLElement, def: HotkeyDef): void {
  const button = queryOwn(
    dialog,
    `[aria-keyshortcuts="${CSS.escape(formatAriaKeyshortcuts(def))}"]`
  );
  button?.focus();
  button?.click();
}

/**
 * Roles a transient overlay announces itself with. Focus inside one of these means the press is
 * already spoken for — a listbox, a menu or a picker closes on the dismiss key, and that is what
 * the user asked of it.
 */
const POPUP_ROLES = ['listbox', 'menu', 'tree', 'grid', 'dialog']
  .map((role) => {
    return `[role="${role}"]`;
  })
  .join(',');

/**
 * Whether an open popup has already claimed this press.
 *
 * Public because a dialog is not the only thing that answers a key over a page: a controlled
 * surface driving its own Escape — one where the key is a *request* to its owner rather than a
 * dismissal — needs the same question answered, and a second copy of the rule is a second copy
 * that drifts.
 *
 * **The problem this exists for.** The window-level listener below captures, so it runs ahead of
 * every other handler in the page — including whatever the user is actually looking at. A combobox
 * or a date picker opened from inside a non-modal dialog answers the dismiss key with "close me",
 * and capturing first turns one Escape into "close the whole panel" with the list still on screen.
 *
 * Two declarative signals and nothing cleverer, because a guess here fails silently both ways:
 *
 * - **The control says it is expanded.** `aria-expanded="true"` on the press's target or above it
 *   is how a combobox reports an open list while keeping focus on itself.
 * - **Focus is inside the overlay.** A picker portals its popup elsewhere in the document and puts
 *   focus in it, so the target carries no `aria-expanded` at all — what it does carry is one of
 *   the roles an overlay announces itself with.
 *
 * The dialog is excluded from the second test, and so is anything containing it: this dialog is a
 * `role="dialog"` and every press inside it would otherwise be read as spoken for.
 */
export function isKeyClaimedByPopup(dialog: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (target.closest('[aria-expanded="true"]') !== null) {
    return true;
  }
  const popup = target.closest(POPUP_ROLES);
  return popup !== null && popup !== dialog && !popup.contains(dialog);
}

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
const dispatchActionHotkey = (
  engine: ActionGate,
  press: { readonly event: KeyboardEvent; readonly dialog: HTMLElement }
) => {
  const { event, dialog } = press;
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
  const { isPreparing, onKeyDown, dismissKey, engine, dismissWhilePreparing, onDismissRequest } =
    options;

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

    // A control inside the dialog with an open popup answers this press itself, and neither a
    // hotkey nor dismissal may take it: Escape at an open list means "close the list", and Enter
    // there means "take the highlighted option" rather than "confirm". Left un-prevented too, so
    // the control still gets it.
    if (isKeyClaimedByPopup(dialog, event.target)) {
      return;
    }

    // An action's hotkey beats dismissal, and runs through the button so the click path and
    // the key path stay the same path.
    if (dispatchActionHotkey(engine, { event, dialog })) {
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
      answerDismiss(store, { request: onDismissRequest, cause: 'dismiss-key' });
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
  const { isPreparing, dismissKey, engine, dismissWhilePreparing, onDismissRequest } = options;

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
    answerDismiss(store, { request: onDismissRequest, cause: 'dismiss-key' });
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
  const { store, getDialog, modalId, phase, manager } = ctx;
  const { isPreparing, dismissKey, engine, nonModal, dismissWhilePreparing, onDismissRequest } =
    options;

  if (!nonModal || phase === 'closed' || dismissKey === false) {
    return undefined;
  }

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (!matchesHotkey(event, dismissKey)) {
      return;
    }
    // Only the topmost dialog intercepts the dismiss key — stand down if another dialog is above us.
    if (!manager.lookup().isForeground(modalId)) {
      return;
    }

    // Nor over a popup that answers this key itself. Capturing at the window means running before
    // every other handler in the page, so without this a single Escape at an open combobox or
    // picker closes the panel around it instead of the list the user was looking at.
    const openDialog = getDialog();
    if (openDialog !== null && isKeyClaimedByPopup(openDialog, event.target)) {
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

    if (actionOwnsDismissKey(engine, dismissKey)) {
      // An action declared this key as its hotkey. The panel acts, so the key is ours — no
      // underlying listener should react a second time to the press that fired it. And because
      // stopping propagation here also stops the dialog-level keydown, the action has to be
      // dispatched by clicking its button directly.
      event.preventDefault();
      event.stopPropagation();
      const dialog = getDialog();
      if (dialog) {
        clickHotkeyButton(dialog, dismissKey);
      }
      return;
    }

    log('Dismiss key (window capture)', { id: modalId, key: dismissKey });
    if (!answerDismiss(store, { request: onDismissRequest, cause: 'dismiss-key' })) {
      // The owner declined, so nothing happened and the press is not ours to swallow — the same
      // rule as the gate above, for a condition only the caller could have known.
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  window.addEventListener('keydown', handleWindowKeyDown, { capture: true });
  return () => {
    window.removeEventListener('keydown', handleWindowKeyDown, { capture: true });
  };
}
