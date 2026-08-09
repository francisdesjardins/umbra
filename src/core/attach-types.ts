import type { ActionGate } from '../actions/action-engine.js';
import type { HotkeyDef } from '../actions/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';
import type { ModalStore } from './modal-store.js';
import type { GetDialog, ModalPhase } from './types.js';

/**
 * What every `attach*` function needs to know about the modal it is wiring.
 *
 * The same five values the React hooks used to take, with one difference that is the point of
 * the file: nothing here is React's. An `attach*` function is handed this, wires DOM listeners,
 * and returns a teardown — so a binding's job at each of these seams is to call it from whatever
 * it calls an effect, and to call the teardown from whatever it calls a cleanup.
 *
 * `phase` is passed rather than read off the store because a binding re-runs these on *its* view
 * of the phase, which is what keeps the listener set in step with what is rendered.
 *
 * @internal Not part of the public API.
 */
export type ModalDomContext = {
  readonly store: ModalStore;
  readonly getDialog: GetDialog;
  readonly modalId: string;
  readonly phase: ModalPhase;
  readonly manager: DialogManager;
};

/** Options for the opening half of the dialog lifecycle. */
export type OpenSequenceOptions = {
  readonly prepare: ((signal: AbortSignal) => void | Promise<void>) | undefined;
  readonly nonModal: boolean;
};

/** Options for the closing half of the dialog lifecycle. */
export type CloseSequenceOptions = {
  readonly nonModal: boolean;
  /** The transition property whose `transitionend` settles the close. */
  readonly primaryProperty: string;
  /** How long to wait for it before finalizing anyway. */
  readonly exitDuration: number;
};

/** Options for the dialog-level keydown, the native `cancel`, and the non-modal window listener. */
export type DialogKeydownOptions = {
  readonly isPreparing: boolean;
  readonly onKeyDown: ((event: KeyboardEvent) => void) | undefined;
  readonly dismissKey: HotkeyDef | false;
  readonly engine: ActionGate;
  readonly nonModal: boolean;
  readonly dismissWhilePreparing: boolean;
};

/** Options for the non-modal click-outside listener. */
export type ClickOutsideOptions = {
  readonly dismissOnClickOutside: boolean;
  readonly dismissWhilePreparing: boolean;
  readonly engine: ActionGate;
};

/** Options for the focus coordinator. */
export type FocusCoordinatorOptions = {
  readonly engine: ActionGate;
};
