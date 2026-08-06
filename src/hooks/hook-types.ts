import type { ActionGate } from '../actions/action-engine.js';
import type { HotkeyDef } from '../actions/types.js';
import type { GetDialog, ModalAnimation, ModalPhase } from '../core/types.js';
import type { ModalStore } from '../core/modal-store.js';
import type { DialogManager } from '../manager/dialog-manager.js';

/**
 * Shared context passed to all internal modal hooks.
 *
 * Bundles the common state that every hook needs from `useModal`.
 * Constructed once per render in `useModal` and passed to all four hooks.
 *
 * @internal Not part of the public API.
 */
export type ModalHookContext = {
  readonly store: ModalStore;
  readonly getDialog: GetDialog;
  readonly modalId: string;
  readonly phase: ModalPhase;
  readonly dm: DialogManager;
};

/** Options for `useDialogLifecycle`. */
export type DialogLifecycleOptions = {
  readonly onOpen: ((signal: AbortSignal) => void | Promise<void>) | undefined;
  readonly animation: ModalAnimation;
  readonly nonModal: boolean;
};

/** Options for `useDialogKeydown`. */
export type DialogKeydownOptions = {
  readonly isPreparing: boolean;
  readonly onKeyDown: ((event: KeyboardEvent) => void) | undefined;
  readonly dismissKey: HotkeyDef | false;
  readonly engine: ActionGate;
  readonly nonModal: boolean;
  readonly dismissWhilePreparing: boolean;
};

/** Options for `useClickOutside`. */
export type ClickOutsideOptions = {
  readonly dismissOnClickOutside: boolean;
  readonly dismissWhilePreparing: boolean;
  readonly engine: ActionGate;
};

/** Options for `useFocusManagement`. */
export type FocusManagementOptions = {
  readonly engine: ActionGate;
};
