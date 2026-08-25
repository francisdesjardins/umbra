import type { ActionGate } from '../actions/action-engine.js';
import type { DismissCause } from './dismiss-reason.js';
import type { DialogId } from './registry.js';
import type { HotkeyDef } from '../actions/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';
import type { DialogStore } from './dialog-store.js';
import type { GetDialog, DialogFailure, DialogPhase } from './types.js';

/**
 * What every `attach*` function needs to know about the dialog it is wiring.
 *
 * Nothing here is any framework's, which is the point of the file. An `attach*` function is handed
 * this, wires DOM listeners, and returns a teardown — so a binding's job at each seam is to call it
 * from whatever it calls an effect, and the teardown from whatever it calls a cleanup.
 *
 * `phase` is passed rather than read off the store because a binding re-runs these on *its* view
 * of the phase, which is what keeps the listener set in step with what is rendered.
 *
 * @internal Not part of the public API.
 */
export type DialogDomContext = {
  readonly store: DialogStore;
  readonly getDialog: GetDialog;
  readonly dialogId: DialogId;
  readonly phase: DialogPhase;
  readonly manager: DialogManager;
};

/** Options for the opening half of the dialog lifecycle. */
export type OpenSequenceOptions = {
  readonly prepare: ((signal: AbortSignal) => void | Promise<void>) | undefined;
  readonly nonModal: boolean;
  /** Where a throwing `prepare` is reported. See the `onError` option. */
  readonly onError: ((failure: DialogFailure) => void) | undefined;
};

/** Options for the closing half of the dialog lifecycle. */
export type CloseSequenceOptions = {
  /** Where a throwing `onClose` is reported. See the `onError` option. */
  readonly onError: ((failure: DialogFailure) => void) | undefined;
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
  /** Controlled surfaces only: report the press instead of closing. See `DialogOptions`. */
  readonly onDismissRequest: ((cause: DismissCause) => boolean | void) | undefined;
};

/** Options for the Tab-wrapping listener a non-modal dialog needs. */
export type FocusContainmentOptions = {
  readonly containFocus: boolean;
};

/** Options for the non-modal click-outside listener. */
export type ClickOutsideOptions = {
  readonly dismissOnClickOutside: boolean;
  readonly dismissWhilePreparing: boolean;
  readonly engine: ActionGate;
  /** Controlled surfaces only: report the click instead of closing. See `DialogOptions`. */
  readonly onDismissRequest: ((cause: DismissCause) => boolean | void) | undefined;
};

/** Options for the focus coordinator. */
export type FocusCoordinatorOptions = {
  readonly engine: ActionGate;
};

/**
 * Options for the labelling diagnostic.
 *
 * `isPreparing` is passed rather than read off `ctx.store`, and that is what makes the check work
 * in a fine-grained renderer: Solid's lifecycle effect tracks whatever its body reads, so a guard
 * hidden inside the function would never re-run it when `prepare` settles.
 */
export type LabellingDiagnosticsOptions = {
  readonly isPreparing: boolean;
};
