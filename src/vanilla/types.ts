import type { ActionOptions, ActionReason } from '../actions/types.js';
import type { DismissReason } from '../core/dismiss-reason.js';
import type { AwaitedCloseOf, RegisteredHandle } from '../core/registered-types.js';
import type { CloseOf, DataOf, DataOfReason, ReasonOf } from '../core/registry.js';
import type { DialogStyle } from '../core/style.js';
import type {
  AwaitedClose,
  DialogHandle,
  DialogPhase,
  DialogVariant,
  UseDialogBaseOptions,
} from '../core/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';

/**
 * `umbra/vanilla`'s half of the type model. Nothing renders here, so the node knob is `never` and
 * `render` is omitted (hence an `Omit`, not an alias); the rest is the hook bindings' model.
 */

/** Options for {@link bindDialog}. */
export type BindDialogOptions<TData = void, TReason extends string = string> = Omit<
  UseDialogBaseOptions<TData, TReason, DialogStyle, never>,
  'render'
> &
  DialogVariant &
  BindDialogOwnOptions;

/**
 * The four this binding adds to the shared option surface, named so the registered door can rebuild
 * that surface rather than `Omit` over it — `DialogVariant` is a union, and omitting across one
 * collapses the two branches into a single object whose mutual exclusion is gone.
 *
 * @internal Not exported from index.ts.
 */
export type BindDialogOwnOptions = {
  /**
   * The `<dialog>` to drive: shown, hidden, animated and listened on, never touched inside.
   * Attributes the options do not name are left alone (an `aria-labelledby` in the markup
   * survives); positioning and animation are **inline styles**, outranking a stylesheet rule.
   */
  readonly dialog: HTMLDialogElement;
  /**
   * Which **placement** a non-modal panel gets, and nothing else: `true` viewport-anchored
   * (`position: fixed; inset: 0`), `false` contained (`absolute` against the `host` below). It
   * does not *move* the element as the hook bindings do — reparenting the caller's markup would
   * take its ids, stylesheet scope and listeners with it — so `fixed` means the viewport only
   * where no transformed or `will-change` ancestor supplies the containing block: put it at top
   * level, or use the contained variant. Pinned by *portal places without relocating* in
   * `__tests__/bind-dialog.ct.tsx`.
   *
   * **A `boolean` here where the hook bindings take a `PortalTarget`**, and the narrowing is the
   * point: their second form names the element to mount into, and this binding mounts nothing.
   * Accepting a host getter it could only ignore is the silently-dropped option the type is
   * there to prevent — the `<dialog>` is already wherever the caller put it, which is the whole
   * bargain of the controller binding.
   */
  readonly portal?: boolean | undefined;
  /**
   * What a *contained* panel (`nonModal: true` without `portal`) is positioned against,
   * defaulting to the dialog's parent. Must be sized, because the dialog fills it — see
   * `dialogPlacement`. Ignored for every other variant.
   */
  readonly host?: HTMLElement | undefined;
  /**
   * The manager to register with; defaults to the singleton. The vanilla answer to
   * `DialogManagerProvider`, there being no tree to read a context from — harnesses want it.
   */
  readonly manager?: DialogManager | undefined;
};

/**
 * The live state of a bound dialog, read through {@link DialogController.getSnapshot}. `Modal`, not
 * `Dialog`: it holds no element — it is what `DialogStoreSnapshot` describes for the hook bindings.
 */
export type DialogSnapshot = {
  /** Where the `<dialog>` is in its lifecycle. */
  readonly phase: DialogPhase;
  /** `phase !== 'closed'` — still true through the exit animation. */
  readonly isVisible: boolean;
  /** Whether `prepare` is still running. */
  readonly isPreparing: boolean;
  /** True while any bound action is running. */
  readonly hasRunningAction: boolean;
  /** The last error thrown by any bound action, or `null`. */
  readonly error: Error | null;
};

/**
 * What {@link bindDialog} hands back. `open`, `openAndWait` and `handle` are the hook bindings',
 * belonging to the modal rather than the renderer; what differs assumed a render pass —
 * `bindAction`, and `subscribe`/`getSnapshot` for content that reacts to state.
 */
export type DialogController<TData = void, TReason extends string = string> = {
  /** Open the dialog. Resolves after `prepare` completes. */
  readonly open: () => Promise<void>;
  /** Open it and resolve with how it closed — see the note on the hook bindings' `openAndWait`. */
  readonly openAndWait: () => Promise<AwaitedClose<TData, TReason>>;
  /** Close it imperatively, with a reason and the payload this dialog declares. */
  readonly handle: DialogHandle<TData, TReason>;
  /**
   * Turn a button into one of this dialog's actions and keep it in step: `action(reason)`'s props,
   * plus the half a renderer does elsewhere — the click handler, `aria-keyshortcuts` and
   * `data-focus-on-open` once, then `disabled`, `data-loading` and `aria-busy` as it runs.
   *
   * @returns An unbind. It removes the listener *and* retires the declaration, which stops a
   *   hotkey outliving its button and lets backdrop dismissal go back to its no-actions default.
   */
  readonly bindAction: (
    button: HTMLButtonElement,
    action: ActionOptions<TData> & { readonly reason: ActionReason<TReason> }
  ) => () => void;
  /**
   * Whether **that** action is running — the hook bindings hang this on their `action` factory,
   * and there is none here, so the name carries the noun. `bindAction` already keeps the button's
   * own attributes in step, so this is for everything that is *not* it; read it from a
   * {@link DialogController.subscribe} listener.
   */
  readonly isActionRunning: (reason: ActionReason<TReason>) => boolean;
  /** Subscribe to every state change — the dialog's phases and its actions alike. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Read the current state. */
  readonly getSnapshot: () => DialogSnapshot;
  /** Unregister, close if open, settle every waiter, and detach every listener. */
  readonly destroy: () => void;
  /** The manager this dialog is registered with. */
  readonly dialogManager: DialogManager;
};

/**
 * `bindAction`'s options for one reason — {@link RegisteredActionFactory}'s bargain on this binding,
 * which declares an action by binding a button rather than by rendering one. `onAction` is required
 * where the reason declares a payload, an omitted one closing with nothing.
 */
type RegisteredActionOptions<TId, TReason> =
  DataOfReason<TId, TReason> extends void
    ? ActionOptions<void> & { readonly reason: TReason }
    : Omit<ActionOptions<DataOfReason<TId, TReason>>, 'onAction'> & {
        readonly reason: TReason;
        readonly onAction: (
          close: (data: DataOfReason<TId, TReason>) => void
        ) => void | Promise<void>;
      };

/** {@link DialogController} for a declared id: the four members a contract sharpens. */
export type RegisteredController<TId> = Omit<
  DialogController<DataOf<TId>, ReasonOf<TId>>,
  'bindAction' | 'handle' | 'isActionRunning' | 'openAndWait'
> & {
  readonly openAndWait: () => Promise<AwaitedCloseOf<TId>>;
  readonly handle: RegisteredHandle<TId>;
  readonly bindAction: <TReason extends Exclude<ReasonOf<TId>, DismissReason>>(
    button: HTMLButtonElement,
    action: RegisteredActionOptions<TId, TReason>
  ) => () => void;
  readonly isActionRunning: (reason: Exclude<ReasonOf<TId>, DismissReason>) => boolean;
};

/**
 * {@link BindDialogOptions} for a declared id. Rebuilt from the flat base rather than `Omit`ted out
 * of the assembled type, `DialogVariant` being a union that omitting across would flatten.
 */
export type RegisteredBindOptions<TId> = Omit<
  UseDialogBaseOptions<DataOf<TId>, ReasonOf<TId>, DialogStyle, never>,
  'id' | 'onClose' | 'render'
> &
  DialogVariant &
  BindDialogOwnOptions & {
    /** Unique modal identifier — read once, when the dialog is bound. */
    readonly id: TId;
    /** Called when the dialog closes, with the payload that reason declared. */
    readonly onClose?: ((result: CloseOf<TId>) => void | Promise<void>) | undefined;
  };
