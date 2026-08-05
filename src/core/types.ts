import type { CSSProperties, ReactNode } from 'react';
import type { ActionFactory, HotkeyDef } from '../actions/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';

// ── Close Results ─────────────────────────────────────────────────────────────

/**
 * Result of a modal close: the reason, plus the payload if the modal declares one.
 *
 * `TData` defaults to `void`, which makes `data` an unusable `void | undefined` — you cannot
 * assign it to anything — so the default surface is effectively `{ reason }` while the type
 * stays a plain object rather than a conditional.
 *
 * That is deliberate. A conditional here is opaque to the checker: nothing can be *assigned*
 * to `CloseResult<TData>` while `TData` is still a type parameter, so every generic boundary
 * the result crosses — the store, the resolver queue, `onClose` — would need an assertion to
 * get past it. A shape the compiler can see through is what lets `TData` flow from
 * `useModal<TData>()` to `handle.close()` and back out of `waitForClose()` with no casts.
 */
export type CloseResult<TData = void, TReason extends string = string> = {
  /**
   * Why it closed: an action's reason, or `'dismiss'` — which the library itself produces on
   * Escape, backdrop click and teardown, so it is always possible regardless of `TReason`.
   *
   * Declare a union on `useModal` and this narrows to it, making a `switch` here exhaustive.
   */
  readonly reason: TReason | 'dismiss';
  /** The payload, when the modal declares one. */
  readonly data?: TData | undefined;
};

/**
 * Go-style `[error, result]` safe-await tuple returned by `waitForClose()`.
 *
 * - `[null, result]` — successful close with reason and optional data
 * - `[Error, null]` — error during close lifecycle
 */
export type WaitForCloseResult<TData = void, TReason extends string = string> =
  | readonly [error: null, result: CloseResult<TData, TReason>]
  | readonly [error: Error, result: null];

// ── Animation ────────────────────────────────────────────────────────────────

/**
 * CSS transition configuration for modal entrance/exit animations.
 *
 * @example
 * const fade: ModalAnimation = {
 *   entrance: { opacity: 1, transform: 'scale(1)' },
 *   exit: { opacity: 0, transform: 'scale(0.95)' },
 *   duration: 200,
 *   transitionProperty: 'opacity, transform',
 * };
 */
export type ModalAnimation = {
  /** CSS properties applied during entrance (after animation starts) */
  readonly entrance: CSSProperties;
  /** CSS properties applied during exit (and before entrance starts) */
  readonly exit: CSSProperties;
  /** Entrance duration in milliseconds (also used for exit if exitDuration is not set). Default: 200 */
  readonly duration?: number | undefined;
  /** Exit duration in milliseconds. Falls back to `duration` if not set. */
  readonly exitDuration?: number | undefined;
  /** CSS transition-property value. Default: 'opacity' */
  readonly transitionProperty?:
    'opacity' | 'transform' | 'opacity, transform' | 'all' | 'none' | (string & {}) | undefined;
};

// ── Modal Handle ───────────────────────────────────────────────────────────────

/**
 * Imperative handle for closing a modal, returned from `useModal` and passed to
 * the `render` callback. Distinct from the modal's *actions* (`useModalActions`), which
 * are its buttons: `handle` closes the modal, `actions` are what the user presses.
 *
 * @typeParam TData - The modal's close payload type. `close` accepts exactly this, so a
 * modal declared `useModal<{ id: string }>` rejects `close('ok', 42)`, and the default
 * (`void`) rejects a payload altogether.
 */
export type ModalHandle<TData = void, TReason extends string = string> = {
  /** Close the modal with a reason and, if the modal declares one, a payload. */
  readonly close: (reason?: TReason | 'dismiss', data?: TData) => void;
};

/**
 * What a modal's `render` callback is given: the slice of live modal state that is available
 * *during* render, without reaching back into the hook's return value (which would be a TDZ
 * error, since `render` is passed to the call that produces it).
 *
 * This is the origin of that slice rather than a copy of it. `UseModalReturn` intersects it,
 * so the hook cannot return a differently-shaped `isPreparing`, and `BaseRenderContext` aliases
 * it, so every template's render context inherits the same two fields with the same meaning.
 * Adding a render-time field here reaches all of them at once.
 *
 * @typeParam TData - The modal's close payload type, carried through to `handle.close`.
 */
export type ModalRenderArgs<TData = void, TReason extends string = string> = {
  /**
   * Whether the `onOpen` callback is still running — the dialog is on screen, its content is
   * not ready yet. Render a loading state on it; use `isOpen` (or `phase`) for presence.
   *
   * A second axis, not a phase. `phase` describes the `<dialog>` itself and reaches `'open'`
   * on the animation frame after it is shown, which is usually well before an async `onOpen`
   * settles — so `phase: 'open'` with `isPreparing: true` is the normal state of a modal
   * that loads something.
   */
  readonly isPreparing: boolean;
  /** Imperative close handle, typed with the modal's close payload. */
  readonly handle: ModalHandle<TData, TReason>;
  /**
   * Declare an action and get the props for its button, in one expression.
   *
   * There is no config to write and nothing to pass into `useModal`: an action exists because
   * it is rendered, and the reason it is given is its identity — the name and the close reason
   * in one. See {@link ActionFactory}.
   */
  readonly action: ActionFactory<TData, TReason>;
  /** True while any action on this modal is running. */
  readonly isRunning: boolean;
  /** The last error thrown by any action on this modal, or `null`. */
  readonly error: Error | null;
};

// ── useModal Options & Return ────────────────────────────────────────────────

// ── Modal Variant ────────────────────────────────────────────────────────────

/**
 * Modal vs non-modal, as a discriminated union — and the single home for the distinction the
 * two branches only summarise.
 *
 * A **modal** dialog (`showModal()`) draws a backdrop, is promoted into the browser's top
 * layer, and locks body scroll. Because it owns the top layer it is positioned against the
 * viewport regardless of its ancestors, and anything that must stay clickable while it is open
 * has to be rendered inside the dialog.
 *
 * A **non-modal** dialog (`show()`) does none of that: no backdrop, no top layer, clicks pass
 * through to what is underneath, scroll stays free. Not being in the top layer is what makes
 * its positioning depend on placement — see `portal` on {@link UseModalBaseOptions}.
 *
 * The dismissal option follows from the variant, which is why they are unioned rather than
 * flags on one object: with no backdrop there is nothing to click, so `dismissOnBackdropClick`
 * is `never` in the non-modal branch and `dismissOnClickOutside` is `never` in the modal one.
 * Passing the wrong one is a type error instead of a silently ignored prop.
 *
 * Used by `UseModalOptions` and `TemplateCommonOptions`.
 */
export type ModalVariant =
  | {
      /**
       * Blocking dialog (`dialog.showModal()`): backdrop, browser top layer, body scroll
       * locked. See {@link ModalVariant} for the non-modal alternative.
       * @default false
       */
      readonly nonModal?: false | undefined;
      /**
       * Whether a backdrop click dismisses the modal.
       * Defaults to `false` when `actions` are provided (a modal with action buttons
       * requires explicit dismissal through them). Pass `true` to opt back in.
       * Defaults to `true` otherwise.
       */
      readonly dismissOnBackdropClick?: boolean | undefined;
      /** Not applicable — modal dialogs use `dismissOnBackdropClick` instead. */
      readonly dismissOnClickOutside?: never;
    }
  | {
      /**
       * Non-blocking dialog (`dialog.show()`): no backdrop, stays out of the top layer so
       * clicks reach elements underneath, body scroll untouched. Stacking is tracked with a
       * `data-modal-z` attribute on the `<dialog>`. See {@link ModalVariant}.
       */
      readonly nonModal: true;
      /** Not applicable — non-modal dialogs have no backdrop. */
      readonly dismissOnBackdropClick?: never;
      /**
       * Whether clicking outside the dialog dismisses it.
       * Respects `dismissWhilePreparing` and `actions.isRunning` guards.
       * Only the topmost non-modal in a stack responds to click-outside.
       * @default false
       */
      readonly dismissOnClickOutside?: boolean | undefined;
    };

/**
 * Variant-independent options for `useModal`. Does not include `nonModal` or
 * `dismissOnBackdropClick` — those live in `ModalVariant`.
 *
 * `UseModalOptions` is `UseModalBaseOptions & ModalVariant`; template hooks
 * also `Pick` from this flat type without intersecting with `ModalVariant`.
 */
export type UseModalBaseOptions<TData = void, TReason extends string = string> = {
  /** Unique modal identifier */
  readonly id: string;
  /** Render function for modal content. Receives modal state as arguments. */
  readonly render: (args: ModalRenderArgs<TData, TReason>) => ReactNode;
  /** CSS transition animation configuration */
  readonly animation?: ModalAnimation | undefined;
  /**
   * Structural styles for the `<dialog>` element itself: how big the box is and where it sits.
   *
   * The library places a dialog but never sizes it — a `<dialog>` keeps the UA's `fit-content`,
   * so a panel that should fill its region says so here (`{ width: '100%', height: '100%' }`).
   * This is the same lever the template hooks pull; `useSlideModal` is a `style` and an
   * animation over `useModal` and nothing else.
   *
   * Styles for what is *inside* the dialog belong in `render`, where they can respond to the
   * state the callback is handed. These are merged after the placement and before the
   * animation, so they can override the former and not the latter.
   */
  readonly style?: CSSProperties | undefined;
  /**
   * Key that dismisses the modal. Accepts any `HotkeyDef` string (e.g. `Key.Escape`,
   * `'Ctrl+3'`) or `false` to disable key-based dismissal entirely.
   * @default Key.Escape ('Escape')
   */
  readonly dismissKey?: HotkeyDef | false | undefined;
  /**
   * Whether the dismiss key and backdrop click can close the modal while `onOpen` is executing.
   * @default true
   */
  readonly dismissWhilePreparing?: boolean | undefined;
  /**
   * Optional keydown handler called on the dialog element.
   * Fires before built-in ESC handling. Call `event.preventDefault()`
   * to suppress the default ESC dismiss behavior.
   */
  readonly onKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  /**
   * Called as the modal opens — after the `<dialog>` is shown and the entrance transition is
   * scheduled, not before it. An async one runs *alongside* the entrance animation, and
   * `isPreparing` stays `true` until it settles; that is the loading window the render
   * callback is given.
   */
  readonly onOpen?: (() => void | Promise<void>) | undefined;
  /** Called when the modal closes with the close result */
  readonly onClose?: ((result: CloseResult<TData, TReason>) => void | Promise<void>) | undefined;
  /**
   * The dialog's accessible name, for the common case where the name is a string you already
   * have. A dialog without one is announced as just "dialog", which is the single most common
   * accessibility defect in a dialog implementation — the library cannot invent it, because
   * only the caller knows what this dialog is.
   *
   * Prefer {@link UseModalBaseOptions.ariaLabelledBy} when the name is already on screen as a
   * heading: naming it twice is how the two drift apart.
   */
  readonly ariaLabel?: string | undefined;
  /**
   * The id of the element that names this dialog — usually its own heading, rendered by
   * `render`. Takes precedence over `ariaLabel` in every screen reader.
   */
  readonly ariaLabelledBy?: string | undefined;
  /** The id of the element that describes this dialog — usually its body text. */
  readonly ariaDescribedBy?: string | undefined;
  /**
   * `'alertdialog'` for a dialog that interrupts to report something the user must act on — a
   * destructive confirm, an error that blocks progress. Screen readers announce its description
   * immediately rather than waiting to be read.
   *
   * Deliberately not the full `role` surface: a `<dialog>` element is a dialog, and a surface
   * that is *not* one (a toast, a popover) wants a live region inside it rather than a role
   * that contradicts its own element.
   *
   * @default 'dialog'
   */
  readonly role?: 'dialog' | 'alertdialog' | undefined;
  /**
   * A label for this modal — see `ModalInfo.modalType`. The built-in templates name themselves
   * (`useMessageModal` reports `'message'`, `useSlideModal` `'slide'`); a template you write
   * should do the same rather than inheriting the default.
   * @default 'modal'
   */
  readonly modalType?: string | undefined;
  /**
   * Clip the contained wrapper (`overflow: clip`) so an off-screen (translated) dialog
   * neither shows nor expands the document's scrollable overflow. Set by template hooks
   * whose entrance/exit slides the dialog past its container edge (e.g. `useSlideModal`);
   * without it, a positive translate (right/bottom) shifts the layout and cancels the slide.
   * Only affects the contained render path (`nonModal` + no `portal`).
   * @internal
   */
  readonly clipContainer?: boolean | undefined;
  /**
   * Render the `<dialog>` via `createPortal(node, document.body)`.
   *
   * When `false` (default), the dialog renders inline in the React tree.
   * Modal dialogs are promoted to the browser's top layer by `showModal()`,
   * so they are viewport-anchored regardless of ancestors.
   *
   * Non-modal dialogs never enter the top layer, so positioning depends on placement:
   * - **`portal: true`** — portaled to `document.body`, anchored to the viewport
   *   (`position: fixed`). Use this for viewport-edge / centered non-modal panels.
   * - **`portal: false`** — "contained": the dialog renders inside a library-owned
   *   `position: relative` wrapper and is positioned `absolute` against it, so it fills
   *   (and slides from) its nearest sized ancestor rather than the viewport. This is
   *   immune to a transformed/`will-change` ancestor hijacking the containing block —
   *   the failure mode a `fixed` inline dialog would hit — but it requires that host
   *   region to be sized. It is an *inline contained panel*, not a viewport overlay.
   *
   * @default false
   */
  readonly portal?: boolean | undefined;
};

/**
 * Options for `useModal`.
 *
 * @typeParam TData - Type of the close data payload. Defaults to void (no data).
 */
export type UseModalOptions<TData = void, TReason extends string = string> = UseModalBaseOptions<
  TData,
  TReason
> &
  ModalVariant;

/**
 * Return type of `useModal`.
 *
 * @typeParam TData - Type of the close data payload.
 *
 * @example
 * function DeleteButton() {
 *   const { open, Modal, waitForClose } = useModal<boolean>({
 *     id: 'confirm-delete',
 *     render: ({ handle, action }) => {
 *       return <button onClick={() => handle.close('confirm', true)}>Yes, delete</button>;
 *     },
 *   });
 *
 *   const ask = async () => {
 *     await open();
 *     const [error, result] = await waitForClose();
 *     return error === null && result.data === true;
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={() => void ask()}>Delete</button>
 *       {Modal}
 *     </>
 *   );
 * }
 */
export type UseModalReturn<TData = void, TReason extends string = string> = ModalRenderArgs<
  TData,
  TReason
> & {
  /**
   * Open the modal. Resolves after `onOpen` completes.
   * Always settles: joins an in-flight open, or resolves immediately when
   * the modal is already open (or closing — no reopen is queued).
   */
  readonly open: () => Promise<void>;
  /** Whether the modal is currently open */
  readonly isOpen: boolean;
  /** React element to render. Place in JSX as {Modal}. Renders null when closed. */
  readonly Modal: ReactNode;
  /**
   * Wait for the modal to close. Returns a 2-element tuple:
   * - `[null, result]` on success
   * - `[Error, null]` on error, e.g. the modal was destroyed before it closed
   */
  readonly waitForClose: () => Promise<WaitForCloseResult<TData, TReason>>;
  /** The dialog manager instance this modal is registered with. */
  readonly dialogManager: DialogManager;
};

// ── Modal Store Types ────────────────────────────────────────────────────────

/**
 * Lifecycle phase of a modal instance.
 *
 * - `'closed'` — not shown; the `<dialog>` is mounted but not open
 * - `'opening'` — an open was requested; the `<dialog>` is shown and the entrance frame is
 *   pending
 * - `'open'` — entrance transition running or finished
 * - `'closing'` — exit transition running; settles to `'closed'` on completion
 *
 * This is the `<dialog>`'s own lifecycle. Whether the modal's *content* is ready is the
 * separate `isPreparing` axis — see {@link ModalRenderArgs}.
 */
export type ModalPhase = 'closed' | 'opening' | 'open' | 'closing';

export type CloseResolver<TData = unknown, TReason extends string = string> = (
  result: WaitForCloseResult<TData, TReason>
) => void;

/**
 * Immutable snapshot of a modal's internal state, consumed via `useSyncExternalStore`.
 * Available for use cases that need low-level access to modal phase and opening state.
 *
 * @typeParam TData - The modal's close payload type. Defaults to `unknown` because a
 * *reader* of the snapshot (the dialog manager, a devtool) is generic over every modal;
 * `useModal<TData>` instantiates it with the payload its own store carries.
 */
export type ModalStoreSnapshot<TData = unknown, TReason extends string = string> = {
  /** Where the `<dialog>` is in its lifecycle. */
  readonly phase: ModalPhase;
  /** Whether `onOpen` is still running — see `ModalRenderArgs`. */
  readonly isPreparing: boolean;
  /**
   * Last close result — the same `CloseResult` the public `onClose` and `waitForClose`
   * hand out, not an internal restatement of it. Retained through `'closed'`; reset on
   * the next open.
   */
  readonly closeResult: CloseResult<TData, TReason> | null;
};

/** Getter function for the dialog DOM element, used by extracted hooks. */
export type GetDialog = () => HTMLDialogElement | null;
