import type { ActionOptions, ActionReason } from '../actions/types.js';
import type { DialogStyle } from '../core/style.js';
import type {
  AwaitedClose,
  ModalHandle,
  ModalPhase,
  ModalVariant,
  UseModalBaseOptions,
} from '../core/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';

/**
 * `umbra/vanilla`'s half of the type model — and the one place it is *not* the other bindings'.
 *
 * React and Solid instantiate the model's two open knobs, a style type and a **node** type,
 * because they render. This one does not render: the `<dialog>` and everything in it is markup the
 * caller already wrote. So the node knob is `never` and `render` is omitted outright, which is why
 * the options below are an `Omit` rather than an alias.
 *
 * Everything else is the same model, so an option means here exactly what it means there.
 */

/** Options for {@link bindDialog}. */
export type BindDialogOptions<TData = void, TReason extends string = string> = Omit<
  UseModalBaseOptions<TData, TReason, DialogStyle, never>,
  'render'
> &
  ModalVariant & {
    /**
     * The `<dialog>` to drive. It is yours: this binding shows it, hides it, animates it and
     * listens on it, and never touches what is inside.
     *
     * Attributes the options do not name are left alone, so an `aria-labelledby` written in the
     * markup survives. Positioning and animation are applied as **inline styles**, which outrank
     * a stylesheet rule on `dialog` — the same bargain the other two bindings make.
     */
    readonly dialog: HTMLDialogElement;
    /**
     * The element a *contained* non-modal panel is positioned against
     * (`nonModal: true` without `portal`). Defaults to the dialog's parent.
     *
     * It must be sized, because the dialog fills it — see `dialogPlacement`. Ignored for every
     * other variant, which needs no host at all.
     */
    readonly host?: HTMLElement | undefined;
    /**
     * The manager to register with. Defaults to the `dialogManager` singleton.
     *
     * This is the vanilla answer to `DialogManagerProvider`: there is no tree to read a context
     * from, so an isolated instance is passed rather than provided. Test harnesses want it; an
     * application almost never does.
     */
    readonly manager?: DialogManager | undefined;
  };

/** The live state of a bound dialog, read through {@link DialogController.getSnapshot}. */
export type DialogSnapshot = {
  /** Where the `<dialog>` is in its lifecycle. */
  readonly phase: ModalPhase;
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
 * What {@link bindDialog} hands back.
 *
 * The doors are the hook bindings' doors — `open`, `openAndWait`, `handle` — because those are the
 * modal's, not the renderer's. What differs is everything that assumed a render pass:
 * `bindAction` attaches an action to a button you already have, and `subscribe`/`getSnapshot` are
 * how content that has to react to state gets told, since nothing here re-renders it for you.
 */
export type DialogController<TData = void, TReason extends string = string> = {
  /** Open the dialog. Resolves after `prepare` completes. */
  readonly open: () => Promise<void>;
  /** Open it and resolve with how it closed — see the note on the hook bindings' `openAndWait`. */
  readonly openAndWait: () => Promise<AwaitedClose<TData, TReason>>;
  /** Close it imperatively, with a reason and the payload this dialog declares. */
  readonly handle: ModalHandle<TData, TReason>;
  /**
   * Turn a button into one of this dialog's actions, and keep it in step.
   *
   * The vanilla counterpart of spreading `action(reason)` onto a button — and it does the second
   * half a renderer would otherwise do: it attaches the click handler, writes
   * `aria-keyshortcuts` and `data-focus-on-open` once, and then keeps `disabled`, `data-loading`
   * and `aria-busy` synchronised as the action runs.
   *
   * @returns An unbind. Call it when the button goes away — it removes the listener *and* retires
   *   the action's declaration, which is what stops a hotkey outliving its button and what lets
   *   backdrop dismissal go back to its no-actions default.
   */
  readonly bindAction: (
    button: HTMLButtonElement,
    reason: ActionReason<TReason>,
    options?: ActionOptions<TData>
  ) => () => void;
  /**
   * Whether **that** action is running.
   *
   * The hook bindings hang this on their `action` factory, where the argument alone says whose
   * state is being asked for. There is no factory here — actions are bound, not rendered — so
   * the name carries the noun instead.
   *
   * `bindAction` already keeps `disabled`, `data-loading` and `aria-busy` on the button itself;
   * this is the same fact for everything that is *not* that button — a spinner in the header, a
   * form field, a status line. Read it from a {@link DialogController.subscribe} listener, which
   * fires on every action transition.
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
