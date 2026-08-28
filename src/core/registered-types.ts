import type { ActionButtonProps, ActionOptions } from '../actions/types.js';
import type { DismissReason } from './dismiss-reason.js';
import type { CloseOf, DataOf, DataOfReason, ReasonOf } from './registry.js';
import type { DialogStyle } from './style.js';
import type {
  DialogRenderArgs,
  DialogVariant,
  UseDialogBaseOptions,
  UseDialogReturn,
} from './types.js';

/**
 * The model as a **declared** id sees it: `reason` and `data` correlated, so a `switch` narrows the
 * payload and a reason that declares one cannot close without it.
 *
 * Everything here is stated in an overload declaration and never implemented against. That is the
 * whole design: a correlated union is opaque at a generic boundary the way a conditional is, so the
 * store, the engine and the resolver queue keep the flat `CloseResult` model and no `as` is needed
 * anywhere to bridge them — the overload/implementation split is the one seam TypeScript sanctions
 * for a signature narrower than its body can prove.
 *
 * Generic over the same two knobs as `core/types.ts` — style and node — so each binding names its
 * own pair at the overload rather than aliasing a third set of types.
 */

/**
 * `close`'s arguments for one reason: required second when that reason declares a payload, absent
 * when it does not, so both mistakes are rejected at the call rather than optional on both.
 */
type CloseArgs<TId, TReason> = TReason extends DismissReason
  ? [reason?: TReason]
  : TReason extends ReasonOf<TId>
    ? DataOfReason<TId, TReason> extends void
      ? [reason?: TReason]
      : [reason: TReason, data: DataOfReason<TId, TReason>]
    : never;

/** {@link DialogHandle} for a declared id — `close` typed per reason rather than per dialog. */
export type RegisteredHandle<TId> = {
  /** Close with a reason and, when that reason declares one, its payload. */
  readonly close: <TReason extends ReasonOf<TId> | DismissReason>(
    ...args: CloseArgs<TId, TReason>
  ) => void;
  /** Move the keyboard inside this dialog — see {@link DialogHandle.moveFocus}. */
  readonly moveFocus: (direction: 'next' | 'previous') => boolean;
};

/**
 * {@link ActionFactory} for a declared id. The handler is **required** for a payload-carrying
 * reason: a bare `action('confirm')` auto-closes, which for such a reason would close with nothing
 * and put back the optional `data` the declaration exists to remove.
 */
export type RegisteredActionFactory<TId> = {
  <TReason extends Exclude<ReasonOf<TId>, DismissReason>>(
    ...args: DataOfReason<TId, TReason> extends void
      ? [
          reason: TReason,
          handlerOrOptions?:
            ((close: (data?: undefined) => void) => void | Promise<void>) | ActionOptions<void>,
        ]
      : [
          reason: TReason,
          handlerOrOptions:
            | ((close: (data: DataOfReason<TId, TReason>) => void) => void | Promise<void>)
            | (Omit<ActionOptions<DataOfReason<TId, TReason>>, 'onAction'> & {
                readonly onAction: (
                  close: (data: DataOfReason<TId, TReason>) => void
                ) => void | Promise<void>;
              }),
        ]
  ): ActionButtonProps;
  /** Whether that action is running — see {@link ActionFactory.isRunning}. */
  readonly isRunning: (reason: Exclude<ReasonOf<TId>, DismissReason>) => boolean;
};

/** {@link DialogRenderArgs} with the two members a declared contract sharpens. */
export type RegisteredRenderArgs<TId> = Omit<
  DialogRenderArgs<DataOf<TId>, ReasonOf<TId>>,
  'action' | 'handle'
> & {
  readonly handle: RegisteredHandle<TId>;
  readonly action: RegisteredActionFactory<TId>;
};

/** What `openAndWait` resolves with for a declared id. */
export type AwaitedCloseOf<TId> =
  readonly [error: null, result: CloseOf<TId>] | readonly [error: Error, result: null];

/**
 * Options for a declared id.
 *
 * `Omit` runs over the **flat** base and `DialogVariant` is intersected back afterwards: over the
 * union directly it would collapse the two branches into one object and lose the mutual exclusion
 * `nonModal` buys — the same reason `TemplateCommonOptions` is built this way.
 */
export type RegisteredOptions<
  TId,
  TStyle extends DialogStyle = DialogStyle,
  TNode = unknown,
> = Omit<
  UseDialogBaseOptions<DataOf<TId>, ReasonOf<TId>, TStyle, TNode>,
  'id' | 'onClose' | 'render'
> &
  DialogVariant & {
    /** Unique dialog identifier — read once, when the dialog is built. */
    readonly id: TId;
    /** Render function for dialog content. Receives dialog state as arguments. */
    readonly render: (args: RegisteredRenderArgs<TId>) => TNode;
    /** Called when the dialog closes, with the reason and the payload that reason declared. */
    readonly onClose?: ((result: CloseOf<TId>) => void | Promise<void>) | undefined;
  };

/** Return type for a declared id. */
export type RegisteredReturn<TId, TNode = unknown> = Omit<
  UseDialogReturn<DataOf<TId>, ReasonOf<TId>, TNode>,
  'action' | 'handle' | 'openAndWait'
> &
  RegisteredRenderArgs<TId> & {
    /** Open the dialog and resolve with how it closed — see {@link UseDialogReturn.openAndWait}. */
    readonly openAndWait: () => Promise<AwaitedCloseOf<TId>>;
  };
