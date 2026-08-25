import type { ActionFactory, HotkeyDef } from '../actions/types.js';
import type { DialogId } from './registry.js';
import type { DismissCause, DismissReason } from './dismiss-reason.js';
import type { DialogManager, OpenRequestHandler } from '../manager/dialog-manager.js';
import type { DialogStyle } from './style.js';

// The model a binding instantiates. Only the style-object and rendered-node types vary per
// framework, so they are type parameters with framework-free defaults that each binding pins once
// (`src/react/types.ts`, `src/solid/types.ts`); a third binding is two aliases and a renderer.

// ── Close Results ─────────────────────────────────────────────────────────────

/**
 * Result of a modal close: the reason, plus the payload if the modal declares one.
 *
 * A plain object, not a conditional: the `void` default makes `data` unusable anyway, and a
 * conditional is opaque at every generic boundary the result crosses (store, resolver queue,
 * `onClose`) — this shape lets `TData` flow from `useDialog` to `openAndWait` with no casts.
 */
export type CloseResult<TData = void, TReason extends string = string> = {
  /**
   * Why it closed: an action's reason, or `'dismiss'` (Escape, backdrop click, teardown — always
   * possible regardless of `TReason`). No action may be *named* `'dismiss'`, so this carrying it
   * means nobody acted; declare a union on `useDialog` to narrow it and make a `switch` exhaustive
   * (at the `string` default the engine can only warn at declaration). See {@link DismissReason}.
   */
  readonly reason: TReason | DismissReason;
  /** The payload, when the modal declares one. */
  readonly data?: TData | undefined;
};

/**
 * Go-style `[error, result]` safe-await tuple returned by `openAndWait()`.
 *
 * - `[null, result]` — successful close with reason and optional data
 * - `[Error, null]` — error during close lifecycle
 */
export type AwaitedClose<TData = void, TReason extends string = string> =
  | readonly [error: null, result: CloseResult<TData, TReason>]
  | readonly [error: Error, result: null];

// ── Animation ────────────────────────────────────────────────────────────────

/**
 * CSS transition configuration for modal entrance/exit animations.
 *
 * @typeParam TStyle - The style object type this binding speaks. Defaults to the framework-free
 * {@link DialogStyle}; the React binding pins it to React's `CSSProperties`.
 *
 * @example
 * const fade: DialogAnimation = {
 *   entrance: { opacity: 1, transform: 'scale(1)' },
 *   exit: { opacity: 0, transform: 'scale(0.95)' },
 *   duration: 200,
 *   transitionProperty: 'opacity, transform',
 * };
 */
export type DialogAnimation<TStyle extends DialogStyle = DialogStyle> = {
  /** CSS properties applied during entrance (after animation starts) */
  readonly entrance: TStyle;
  /** CSS properties applied during exit (and before entrance starts) */
  readonly exit: TStyle;
  /** Entrance duration in milliseconds (also used for exit if exitDuration is not set). Default: 200 */
  readonly duration?: number | undefined;
  /** Exit duration in milliseconds. Falls back to `duration` if not set. */
  readonly exitDuration?: number | undefined;
  /** CSS transition-property value. Default: 'opacity' */
  readonly transitionProperty?:
    'opacity' | 'transform' | 'opacity, transform' | 'all' | 'none' | (string & {}) | undefined;
};

// ── Dialog Handle ───────────────────────────────────────────────────────────────

/**
 * Imperative handle for closing a modal, returned from `useDialog` and passed to
 * the `render` callback. Distinct from the modal's *actions*, which are its buttons: `handle`
 * closes the modal, an action is what the user presses to get there.
 *
 * @typeParam TData - The modal's close payload type. `close` accepts exactly this, so a
 * modal declared `useDialog<{ id: string }>` rejects `close('ok', 42)`, and the default
 * (`void`) rejects a payload altogether.
 */
export type DialogHandle<TData = void, TReason extends string = string> = {
  /** Close the modal with a reason and, if the modal declares one, a payload. */
  readonly close: (reason?: TReason | DismissReason, data?: TData) => void;
};

/**
 * What a modal's `render` callback is given: the slice of live modal state that is available
 * *during* render, without reaching back into the hook's return value (which would be a TDZ
 * error, since `render` is passed to the call that produces it).
 *
 * This is the origin of that slice rather than a copy of it. `UseDialogReturn` intersects it,
 * so the hook cannot return a differently-shaped `isPreparing`, and `BaseRenderContext` aliases
 * it, so every template's render context inherits the same two fields with the same meaning.
 * Adding a render-time field here reaches all of them at once.
 *
 * @typeParam TData - The modal's close payload type, carried through to `handle.close`.
 */
export type DialogRenderArgs<TData = void, TReason extends string = string> = {
  /**
   * Whether the `prepare` callback is still running — the dialog is on screen, its content is
   * not ready yet. Render a loading state on it; use `isVisible` (or `phase`) for presence.
   *
   * A second axis, not a phase. `phase` describes the `<dialog>` itself and reaches `'open'`
   * on the animation frame after it is shown, which is usually well before an async `prepare`
   * settles — so `phase: 'open'` with `isPreparing: true` is the normal state of a modal
   * that loads something.
   */
  readonly isPreparing: boolean;
  /**
   * The dialog's own phase — the same value {@link DialogInfo} carries.
   *
   * The render callback decides what is on screen, so it needs to know whether it still *is*.
   * An action stops running the moment its handler resolves — before the exit animation — so a
   * label read from `hasRunningAction` alone reverts to its resting text with the panel still
   * painted; `phase === 'closing'` holds the leaving state until it is gone.
   *
   * `isVisible` on the hook's return answers the other question, "is there a dialog", which is
   * the one the page outside it asks.
   */
  readonly phase: DialogPhase;
  /** Imperative close handle, typed with the modal's close payload. */
  readonly handle: DialogHandle<TData, TReason>;
  /**
   * Declare an action and get the props for its button, in one expression.
   *
   * There is no config to write and nothing to pass into `useDialog`: an action exists because
   * it is rendered, and the reason it is given is its identity — the name and the close reason
   * in one. See {@link ActionFactory}.
   */
  readonly action: ActionFactory<TData, TReason>;
  /**
   * True while **any** action on this modal is running.
   *
   * Named for its scope, because there are three of these and the word alone never said which:
   * an action's own `loading` is that button, `hasRunningAction` is the whole modal, and
   * `isPreparing` is the `prepare` that has nothing to do with actions at all.
   */
  readonly hasRunningAction: boolean;
  /** The last error thrown by any action on this modal, or `null`. */
  readonly error: Error | null;
};

// ── useDialog Options & Return ────────────────────────────────────────────────

// ── Dialog Variant ────────────────────────────────────────────────────────────

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
 * its positioning depend on placement — see `portal` on {@link UseDialogBaseOptions}.
 *
 * The dismissal option follows from the variant, which is why they are unioned rather than
 * flags on one object: with no backdrop there is nothing to click, so `dismissOnBackdropClick`
 * is `never` in the non-modal branch and `dismissOnClickOutside` is `never` in the modal one.
 * Passing the wrong one is a type error instead of a silently ignored prop.
 *
 * Used by `UseDialogOptions` and `TemplateCommonOptions`.
 */
export type DialogVariant =
  | {
      /**
       * Modal dialog (`dialog.showModal()`): backdrop, browser top layer, body scroll
       * locked. See {@link DialogVariant} for the non-modal alternative.
       * @default false
       */
      readonly nonModal?: false | undefined;
      /**
       * Whether a backdrop click dismisses the modal.
       * Defaults to `false` once the render pass has drawn any action (a modal offering
       * buttons wants to be dismissed through one) — pass `true` to opt back in — and to
       * `true` for a modal that draws none.
       */
      readonly dismissOnBackdropClick?: boolean | undefined;
      /** Not applicable — modal dialogs use `dismissOnBackdropClick` instead. */
      readonly dismissOnClickOutside?: never;
      /**
       * `'alertdialog'` for a dialog that interrupts to report something the user must act on — a
       * destructive confirm, an error that blocks progress. Screen readers announce its
       * description immediately rather than waiting to be read.
       *
       * Deliberately not the full `role` surface: a `<dialog>` element is a dialog, and a surface
       * that is *not* one (a toast, a popover) wants a live region inside it rather than a role
       * that contradicts its own element.
       *
       * On the variant rather than the flat surface, because the union is what carries the other
       * half of that reasoning: an alertdialog is modal by definition, so the non-modal branch
       * does not offer it.
       *
       * @default 'dialog'
       */
      readonly role?: 'dialog' | 'alertdialog' | undefined;
    }
  | {
      /**
       * Non-modal dialog (`dialog.show()`): no backdrop, stays out of the top layer so
       * clicks reach elements underneath, body scroll untouched. Stacking is tracked with a
       * `data-dialog-z` attribute on the `<dialog>`. See {@link DialogVariant}.
       */
      readonly nonModal: true;
      /** Not applicable — non-modal dialogs have no backdrop. */
      readonly dismissOnBackdropClick?: never;
      /**
       * `'dialog'` only: an alertdialog is modal by definition (the APG requires `aria-modal`),
       * so announcing one over content the user can still reach would be a contradiction for
       * assistive technology. A non-modal surface that has something urgent to say wants a live
       * region inside its content instead.
       */
      readonly role?: 'dialog' | undefined;
      /**
       * Whether clicking outside the dialog dismisses it.
       * Suppressed while an action is running, and — unless `dismissWhilePreparing` — while
       * `prepare` is still preparing.
       * Only the dialog in front responds — and no non-modal dialog is in front while a modal one
       * is open.
       * @default false
       */
      readonly dismissOnClickOutside?: boolean | undefined;
    };

/**
 * Variant-independent options for `useDialog`. Does not include `nonModal` or
 * `dismissOnBackdropClick` — those live in `DialogVariant`.
 *
 * `UseDialogOptions` is `UseDialogBaseOptions & DialogVariant`; template hooks
 * also `Pick` from this flat type without intersecting with `DialogVariant`.
 *
 * @typeParam TStyle - The style object type this binding speaks.
 * @typeParam TNode - What this binding's `render` returns and what it renders.
 */
export type UseDialogBaseOptions<
  TData = void,
  TReason extends string = string,
  TStyle extends DialogStyle = DialogStyle,
  TNode = unknown,
> = {
  /**
   * Unique modal identifier — **read once, when the modal is built**.
   *
   * The store, the action engine and the lifecycle director all take it at construction and never
   * look again, so changing it is not a rename: the modal re-registers with the manager under the
   * new name and keeps answering to the old one everywhere else. Give a modal one id for its
   * lifetime, and mount a different modal if you need a different name.
   */
  readonly id: DialogId;
  /** Render function for modal content. Receives modal state as arguments. */
  readonly render: (args: DialogRenderArgs<TData, TReason>) => TNode;
  /** CSS transition animation configuration */
  readonly animation?: DialogAnimation<TStyle> | undefined;
  /**
   * Structural styles for the `<dialog>` element itself: how big the box is and where it sits.
   *
   * The library places a dialog but never sizes it — a `<dialog>` keeps the UA's `fit-content`,
   * so a panel that should fill its region says so here (`{ width: '100%', height: '100%' }`).
   * This is the same lever the template hooks pull; `useSlideDialog` is a `style` and an
   * animation over `useDialog` and nothing else.
   *
   * Styles for what is *inside* the dialog belong in `render`, where they can respond to the
   * state the callback is handed. These are merged after the placement and before the
   * animation, so they can override the former and not the latter.
   *
   * **Size against the dialog, not the viewport.** A `dialog:modal` is capped by the UA at
   * `calc(100% - 6px - 2em)` — 337px on a 375px phone. So `width: min(600px, 92vw)`, which is
   * the obvious way to write "600 or the screen, whichever is smaller", asks for 345 and is cut
   * by eight pixels on the right, rounded corner and all. Above roughly 475px the two agree and
   * nothing shows, which is what makes it look deliberate on every desktop. `100%` resolves
   * against the dialog's own box and cannot disagree with it.
   *
   * **A modal dialog is a scroll container**, because the same UA rule gives it `overflow: auto`
   * alongside that cap. It therefore clips whatever a control inside it draws *outside* its own
   * box: a focus ring at `outline-offset`, a glow, a shadow. Leave room for the ring in the
   * padding of whichever box clips — and reach for `scroll-padding` rather than padding when
   * the box scrolls, since scrolling a control into view parks it flush against the edge.
   *
   * **Both rules are `:modal` only.** A non-modal dialog gets neither the cap nor the scrolling,
   * so `nonModal: true` silently changes what your own sizing means. Worth knowing before
   * porting a panel from one to the other.
   *
   * **A hairline flush to the edge is worth avoiding.** At `fit-content` a dialog's box lands on a
   * fraction of a pixel and `margin: auto` puts both edges off-pixel, so a 1px border on content
   * reaching the edge occupies that fractional pixel and how much survives is the compositor's
   * business. Measured: three dialogs at 154.844px, 243.094px and 252.266px kept 16%, 91% and 73%
   * of their right border, and the first read as missing — and a translucent one loses twice,
   * each half of the split carrying half the alpha. Inset the border, give the dialog a
   * whole-pixel `width`, or put the border on an inner element.
   */
  readonly style?: TStyle | undefined;
  /**
   * Key that dismisses the modal. Accepts any `HotkeyDef` string (e.g. `Key.Escape`,
   * `'Ctrl+3'`) or `false` to disable key-based dismissal entirely.
   * @default Key.Escape ('Escape')
   */
  readonly dismissKey?: HotkeyDef | false | undefined;
  /**
   * Hand every user-initiated dismissal to the owner instead of closing on it.
   *
   * **The dialog stops dismissing itself and starts reporting.** Every gate above this point is
   * unchanged and still the library's: which key, whether an action claimed it, whether a popup
   * inside the dialog answers it first, where the pointer landed, whether a `prepare` or a running
   * action forbids it, and — for a non-modal panel — which dialog is actually in front. All of
   * that is decided the same way it is without this option. What changes is the last step:
   * `store.close(DISMISS_REASON)` becomes this call, and the modal leaves the screen when the
   * owner says so.
   *
   * **What it is for.** A surface whose `open` is a prop cannot let its dialog close itself — the
   * boolean upstream is still `true` and the next render puts it back — so its only correct answer
   * to a dismissal is to tell the owner. This is the listener every controlled wrapper writes.
   *
   * **All three doors, which is why the handler is told which one.** The dismiss key, a backdrop
   * click and a click outside a non-modal panel are one decision reached three ways
   * ({@link DismissCause}), and an option that covered only the key would leave a controlled modal
   * answering Escape correctly and reopening itself on a backdrop click. Ignore the argument and
   * the three are one rule; read it to keep them apart — "Escape asks, the backdrop does not".
   *
   * **Return `false` to decline**, for a condition only the caller can know, such as another
   * framework's modal being on top. Only the dismiss key has a second reader: its non-modal window
   * listener captures, so a press it takes is one nobody else sees, and declining leaves it
   * un-prevented and still travelling. Nothing is prevented on the pointer paths, so a declined
   * click is simply a dialog left open. Anything else, `undefined` included, means the request was
   * taken.
   *
   * **It reaches `useMessageDialog` and `useSlideDialog` unchanged**, on all three bindings — which
   * matters because a controlled surface is usually a panel, so a template hook is where this is
   * most often passed.
   *
   * @example
   * ```ts
   * useDialog({
   *   id: 'filters',
   *   nonModal: true,
   *   dismissOnClickOutside: true,
   *   onDismissRequest: (cause) => {
   *     // One owner, every door — the argument is there for the wrapper that wants them apart.
   *     onClose(cause);
   *   },
   *   render: () => {
   *     return <Filters />;
   *   },
   * });
   * ```
   */
  readonly onDismissRequest?: ((cause: DismissCause) => boolean | void) | undefined;
  /**
   * Whether the dismiss key and backdrop click can close the modal while `prepare` is executing.
   * @default true
   */
  readonly dismissWhilePreparing?: boolean | undefined;
  /**
   * Wrap Tab from the last focusable back to the first, so the keyboard stays inside the dialog.
   *
   * **What it is for.** `showModal()` makes the rest of the document inert, so a modal dialog is
   * contained by the browser. `show()` does not, and a non-modal dialog is an ordinary part of the
   * page: a few tab presses walk out of it into whatever is behind. That is correct for a toast or
   * a popover and wrong for a panel that behaves like a modal in everything but its stacking, so
   * it is asked for rather than assumed.
   *
   * **Nothing to set on a modal dialog**, which is worth saying because the neighbouring behaviour
   * looks like a reason to. Clicking a panel's empty space focuses the `<dialog>` element itself,
   * and from there **WebKit does not move Tab into the content** — it swallows the press and the
   * keyboard is stuck on the element until the mouse rescues it (Chromium and Firefox descend;
   * measured on all three). That recovery is **unconditional** — see `attach-focus-containment.ts`,
   * which attaches it before reading this flag — so a modal dialog already has it. Turning this on
   * there adds two inert markers inside content the top layer is already containing, and buys
   * nothing.
   *
   * **It answers Tab; it does not trap focus.** The listener sits on the dialog and fires only
   * when focus is already inside it and already at one of the two ends. Focus moved by a click,
   * or by another dialog opening, is left alone — which is what makes this safe in a page where
   * dialogs outside the top layer coexist with it, and is why neither `inert` nor a `focusin`
   * enforcer is used. Neither can it bring focus back once it has left by some other route.
   *
   * A control inside a shadow root or an `<iframe>` is not a stop: the focusables are found with
   * a selector, which crosses neither boundary.
   *
   * @default false
   */
  readonly containFocus?: boolean | undefined;
  /**
   * Answer an open asked for by code that does not own this dialog — another microfrontend, a
   * shell, a deep link — and decide for yourself.
   *
   * Declaring one is what makes the dialog reachable by `dialogManager.requestOpen(id, request)`;
   * without it, every such request is refused. `dialogManager.open(id)` is a different door and
   * is unaffected either way.
   *
   * **Nothing opens by itself here.** Accept by calling this modal's own `open()`; refuse with
   * `request.refuse(reason)`, so a caller using `requestOpenAndWait` learns why instead of
   * watching nothing happen. Returning without either also refuses — silently, which is the
   * right default for a request nobody agreed to and the wrong one across a boundary.
   *
   * The payload is `unknown` because it crossed that boundary: validate it before believing it.
   * It arrives first because it is what a handler almost always wants; the envelope follows, for
   * the ones that also care who is asking — and what it says about itself is a claim, not
   * something anyone verified.
   *
   * @example
   * const { open, Dialog } = useDialog<void, 'confirm'>({
   *   id: 'patient:merge',
   *   onOpenRequest: (payload, request) => {
   *     const parsed = mergeRequestSchema.safeParse(payload);
   *     if (!parsed.success) {
   *       return request.refuse('invalid-payload');
   *     }
   *     setPatientId(parsed.data.patientId);
   *     void open();
   *   },
   *   render: () => {
   *     return <p>Fusionner ce dossier?</p>;
   *   },
   * });
   */
  // The manager's own handler type, not a restatement of it: the shape gained `refuse` and an
  // async return, and a copy here is a copy that would have silently kept the old one.
  readonly onOpenRequest?: OpenRequestHandler | undefined;

  /**
   * Keydown handler on the dialog element, running ahead of everything the library does with a
   * press.
   *
   * **`preventDefault()` takes the whole press, not just the dismissal.** A prevented event stops
   * the pipeline where it is, so for that key the popup-claim check, the **action hotkey dispatch**
   * and the dismiss key are all skipped. Preventing Escape to hold a modal open is the common case
   * and does what it looks like; preventing a key some action declared as its hotkey stops that
   * action from firing, which does not.
   *
   * The same protocol an action's `onClick` uses, and the same reach: first in, and able to cancel
   * what would have followed.
   */
  readonly onKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  /**
   * Make the content usable — the work that has to happen before the dialog is worth reading.
   *
   * Called as the modal opens, after the `<dialog>` is shown and the entrance transition is
   * scheduled, not before it. An async one runs *alongside* the entrance animation, and
   * `isPreparing` stays `true` until it settles; that is the loading window the render callback
   * is given, and `open()` resolves only once this has.
   *
   * **A gate, not a notification**, which is why it is not called `onOpen`: it holds the modal's
   * `isPreparing` and the promise `open()` returns. To be *told* a dialog opened — without
   * gating anything — use `dialogManager.subscribe` or the `dialog:open` DOM event, which fires
   * at the start of the sequence and is the one that genuinely means "on open".
   *
   * Handed an `AbortSignal` that fires when the modal closes, so work started here can be
   * dropped when nobody is waiting for it any more. A dialog dismissed while it is still loading
   * is the ordinary case, not an edge one, and without this the request outlives the thing that
   * asked for it — it lands on a closed modal, and a slow one can still be in flight when the
   * next open starts its own.
   *
   * Ignoring the parameter is fine and stays the common case: a `() => …` callback is assignable
   * unchanged, so this costs nothing until a call site wants it.
   *
   * ```ts
   * prepare: async (signal) => {
   *   const response = await fetch(url, { signal });
   *   setRows(await response.json());
   * };
   * ```
   *
   * Work the *caller* started elsewhere — a query fired from the click that opened the modal —
   * is not this signal's to cancel: the dialog never knew about it. Cancel that where it began.
   */
  readonly prepare?: ((signal: AbortSignal) => void | Promise<void>) | undefined;
  /** Called when the modal closes with the close result */
  readonly onClose?: ((result: CloseResult<TData, TReason>) => void | Promise<void>) | undefined;
  /**
   * One of **your** callbacks threw, and the library caught it rather than let it escape.
   *
   * **Userland only, deliberately.** Nothing the library does to itself arrives here: an internal
   * failure is a bug, and routing it into a consumer callback would turn a crash into silent
   * misbehaviour that nobody can report. Only the callbacks you supplied are reported, because
   * they are the only ones you can do anything about.
   *
   * **Two of them cannot reach you any other way**, which is the whole reason this exists:
   *
   * - `prepare` throws. The dialog is already on screen — it is shown before `prepare` starts —
   *   and `isPreparing` settles either way, so `aria-busy` flips to `false` and the modal
   *   announces itself ready. Without this, a modal whose content failed to load is
   *   indistinguishable from one that loaded fine.
   * - `onClose` throws. It runs as the modal finalizes, detached, with nothing left rendering,
   *   so there is no render pass to surface it in and no promise for it to reject.
   *
   * The ones that are **not** here are not oversights. An action's throw is already the `error`
   * in the render args; a throw from `render` reaches your framework's error boundary; a throw
   * from `onKeyDown` or an action's `onClick` escapes to the DOM listener that called it, which
   * is where a handler's own exception belongs.
   *
   * Called after the library has finished reacting — the close still completes, `isPreparing`
   * still settles — so this is a report, not a veto. Throwing from it is not caught.
   *
   * @example
   * useDialog({
   *   id: 'invoice',
   *   prepare: loadInvoice,
   *   onError: ({ error, source }) => {
   *     reportToSentry(error, { modal: 'invoice', source });
   *     if (source === 'prepare') {
   *       setLoadFailed(true);
   *     }
   *   },
   *   render: () => {
   *     return loadFailed ? <RetryPanel /> : <Invoice />;
   *   },
   * });
   */
  readonly onError?: ((failure: DialogFailure) => void) | undefined;
  /**
   * The dialog's accessible name, for the common case where the name is a string you already
   * have. A dialog without one is announced as just "dialog", which is the single most common
   * accessibility defect in a dialog implementation — the library cannot invent it, because
   * only the caller knows what this dialog is.
   *
   * Prefer {@link UseDialogBaseOptions.ariaLabelledBy} when the name is already on screen as a
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
   * Which template built this dialog — a free-form label the library carries and never interprets.
   * See `DialogInfo.template`.
   *
   * One library path *reads* it, without deciding anything: it is on the `StackDialog` handed to a
   * {@link DialogManager.prioritize} policy, which is the point — "every drawer under every
   * alert" is a rule about kinds of dialog, and `template` is the only thing that names a kind.
   *
   * The shipped templates name themselves (`useMessageDialog` reports `'message'`, `useSlideDialog`
   * `'slide'`) and one you write should too, rather than inheriting the default. It exists so a
   * cross-cutting listener — analytics, a handler that only cares about drawers — can tell one
   * kind of dialog from another without keeping its own id-to-kind table.
   *
   * **Not the modal/non-modal distinction**, which is `nonModal` and reaches the DOM as
   * `data-dialog-type`. That one is the library's and has two values; this one is yours and has
   * as many as you like.
   *
   * @default 'modal'
   */
  readonly template?: string | undefined;
  /**
   * Clip the contained wrapper (`overflow: clip`) so an off-screen (translated) dialog
   * neither shows nor expands the document's scrollable overflow. Set by template hooks
   * whose entrance/exit slides the dialog past its container edge (e.g. `useSlideDialog`);
   * without it, a positive translate (right/bottom) shifts the layout and cancels the slide.
   * Only affects the contained render path (`nonModal` + no `portal`).
   * @internal
   */
  readonly clipContainer?: boolean | undefined;
  /**
   * Render the `<dialog>` somewhere other than where it was declared — `document.body` by
   * default, or a host of your own.
   *
   * When `false` (default), the dialog renders inline in the tree.
   * Modal dialogs are promoted to the browser's top layer by `showModal()`,
   * so they are viewport-anchored regardless of ancestors.
   *
   * **`true` means `document.body`; a function names the host instead** — see
   * {@link PortalTarget}, which is where the reason for the second form lives. `false` and the
   * contained arrangement are unaffected by either.
   *
   * Non-modal dialogs never enter the top layer, so positioning depends on placement:
   * - **`portal: true`** — portaled to `document.body`, anchored to the viewport
   *   (`position: fixed`). Use this for viewport-edge / centered non-modal panels.
   * - **`portal: false`** — "contained": the dialog renders inside a library-owned wrapper
   *   that is itself `position: absolute; inset: 0` over your nearest sized, positioned
   *   ancestor, and is positioned `absolute` against that wrapper — so it fills
   *   (and slides from) that region rather than the viewport. This is
   *   immune to a transformed/`will-change` ancestor hijacking the containing block —
   *   the failure mode a `fixed` inline dialog would hit — but it requires that host
   *   region to be sized. It is an *inline contained panel*, not a viewport overlay.
   *
   * @default false
   */
  readonly portal?: PortalTarget | undefined;
};

/**
 * Options for `useDialog`.
 *
 * @typeParam TData - Type of the close data payload. Defaults to void (no data).
 * @typeParam TStyle - The style object type this binding speaks.
 * @typeParam TNode - What this binding's `render` returns.
 */
export type UseDialogOptions<
  TData = void,
  TReason extends string = string,
  TStyle extends DialogStyle = DialogStyle,
  TNode = unknown,
> = UseDialogBaseOptions<TData, TReason, TStyle, TNode> & DialogVariant;

/**
 * Return type of `useDialog`.
 *
 * @typeParam TData - Type of the close data payload.
 * @typeParam TNode - What this binding renders. `Dialog` is one of these.
 */
export type UseDialogReturn<
  TData = void,
  TReason extends string = string,
  TNode = unknown,
> = DialogRenderArgs<TData, TReason> & {
  /**
   * Open the modal. Resolves after `prepare` completes.
   * Always settles: joins an in-flight open, or resolves immediately when
   * the modal is already open (or closing — no reopen is queued).
   */
  readonly open: () => Promise<void>;
  /**
   * Whether the dialog is on screen — `phase !== 'closed'`, so it stays true through the exit
   * animation.
   *
   * That is what a trigger wants (`{!isVisible && <button/>}` must not flash back while the
   * panel is still sliding away) and it is why this is not called `isOpen`: a modal in
   * `'closing'` is visible and is no longer open, and one name cannot honestly be both. When the
   * distinction matters — measuring, focusing, deciding a dialog has settled — read `phase`.
   */
  readonly isVisible: boolean;
  /**
   * The node to render — place it in your markup. `null` when a `DialogOutlet` above this modal
   * has taken it, since the outlet renders it instead.
   */
  readonly Dialog: TNode;
  /**
   * Open the modal and resolve with how it closed — the two halves in one call, in the only
   * order that is safe.
   *
   * **The only door that awaits a close, and deliberately.** A close resolver answers the
   * *next* close — replaying a previous one would be a wrong answer rather than a late one — so
   * it has to be registered before anything can close. `prepare` opens exactly that window: a
   * modal dismissed while it runs closes *inside* an open that resolves after `prepare` has
   * returned, and a resolver added on the line afterwards would wait forever, with no error and
   * no timeout. This registers first, which is why the store's `addCloseResolver` is internal
   * and the surface never lets a caller choose the order.
   *
   * The other end of that window is refused rather than answered: called while the modal is
   * `'closing'`, this resolves `[Error, null]`. No reopen is queued (see `open`), so the exit in
   * flight belongs to whoever asked for it — handing back its reason would report a decision this
   * caller never caused, for a dialog it never saw.
   *
   * To observe a close you are not the one causing, use `onClose` — it is a callback rather than
   * a promise and carries no ordering question at all. To await a dialog you do not own, see
   * `dialogManager.requestOpenAndWait`, whose accepted branch carries the close.
   *
   * @example
   * const [error, result] = await openAndWait();
   * if (error === null && result.reason === 'confirm') {
   *   await api.delete();
   * }
   */
  readonly openAndWait: () => Promise<AwaitedClose<TData, TReason>>;
  /** The dialog manager instance this modal is registered with. */
  readonly dialogManager: DialogManager;
};

// ── Dialog Store Types ────────────────────────────────────────────────────────

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
 * separate `isPreparing` axis — see {@link DialogRenderArgs}.
 */
export type DialogPhase = 'closed' | 'opening' | 'open' | 'closing';

/**
 * Where a portaled dialog is mounted: `document.body`, or a host the caller names.
 *
 * `true` is `document.body`, which is the right answer for a page whose styling is global, and the
 * wrong one everywhere the tree the dialog left was doing something. A dialog portaled out of a
 * themed container, a design-system root or a microfrontend's mount point loses whatever that
 * ancestor was providing — CSS custom properties, a scoping class, a cascade layer — and the loss
 * is silent, because the dialog still renders and only looks wrong.
 *
 * So the second form names the host, and is a **getter rather than an element** for the reason
 * `getDialog` is: the option is read where the dialog is placed rather than where it is written, so
 * a caller keeps naming the host and the binding decides when to ask.
 *
 * **The host has to exist by the time the modal is placed**, which is the modal's first render on
 * `umbra/react` and its mount on `umbra/solid`. A design-system root, a themed shell, a
 * microfrontend's mount point: all of those are already in the document when a feature component
 * renders. A node in the modal's *own* subtree is not — the getter answers `null` there, and the
 * fallback below is what the caller gets.
 *
 * **It is read once per portal era, not per render.** A container that changed identity under an
 * open dialog would make React unmount the portal subtree and mount a fresh, closed `<dialog>` that
 * nothing shows again — the modal would vanish with its store still reporting `'open'`. So the
 * answer is held for as long as the modal stays portaled, and re-read only when `portal` flips
 * between portaled and not, which is the structural change the binding already tears down for.
 *
 * Answering `null` is not a way to un-portal — the arrangement is already chosen by then, and the
 * placement CSS with it. It falls back to `document.body` and warns, which is the failure a host
 * that never mounted should make: visible under `setLogLevel`, and not an invisible dialog.
 */
export type PortalTarget = boolean | (() => Element | null);

/**
 * Which callback of yours threw.
 *
 * A closed union rather than a string, so an `onError` that only cares about one of them narrows
 * instead of comparing spellings — and so adding a third source is a change a consumer's
 * exhaustive `switch` is told about.
 */
export type DialogErrorSource = 'prepare' | 'onClose';

/**
 * A callback of yours that threw, and which one it was.
 *
 * One object rather than two parameters, for the reason every option surface here takes one: a
 * third field is then an addition rather than a signature change at every call site.
 */
export type DialogFailure = {
  /** Normalized — a non-`Error` throw arrives here wrapped, never raw. */
  readonly error: Error;
  /** Which callback it came out of. */
  readonly source: DialogErrorSource;
};

export type CloseResolver<TData = unknown, TReason extends string = string> = (
  result: AwaitedClose<TData, TReason>
) => void;

/**
 * Immutable snapshot of a modal's internal state, consumed via `useSyncExternalStore`.
 * Available for use cases that need low-level access to modal phase and opening state.
 *
 * @typeParam TData - The modal's close payload type. Defaults to `unknown` because a
 * *reader* of the snapshot (the dialog manager, a devtool) is generic over every modal;
 * `useDialog<TData>` instantiates it with the payload its own store carries.
 */
export type DialogStoreSnapshot<TData = unknown, TReason extends string = string> = {
  /** Where the `<dialog>` is in its lifecycle. */
  readonly phase: DialogPhase;
  /** Whether `prepare` is still running — see `DialogRenderArgs`. */
  readonly isPreparing: boolean;
  /**
   * Last close result — the same `CloseResult` the public `onClose` and `openAndWait`
   * hand out, not an internal restatement of it. Retained through `'closed'`; reset on
   * the next open.
   */
  readonly closeResult: CloseResult<TData, TReason> | null;
};

/** Getter function for the dialog DOM element, used by extracted hooks. */
export type GetDialog = () => HTMLDialogElement | null;
