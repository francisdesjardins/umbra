// `../store` is the framework-free barrel (React bindings live in `../store/react`); this entry
// must resolve without React — pinned by __tests__/entry-isolation.test.ts.
import type { DialogStoreSnapshot, AwaitedClose } from '../core/types.js';
import type { DismissReason } from '../core/dismiss-reason.js';
import type {
  DialogId,
  PayloadFreeReasonOf,
  PayloadOf,
  RegisteredDialogId,
} from '../core/registry.js';
import type { AwaitedCloseOf } from '../core/registered-types.js';
import { createStore } from '../store/index.js';
import { createLogger } from '../utils/logger.js';
import { ensureDialogStyles } from '../core/dialog-styles.js';
import { raiseDialog, stampZIndex } from '../core/dialog-lifecycle.js';
import { DISMISS_REASON } from '../core/dismiss-reason.js';
import { createLockOwner, lockBodyScroll, unlockBodyScroll } from './scroll-lock.js';
import { orderStack, planRaises, type StackPriority } from './stack-order.js';
import type {
  DialogInfo,
  DialogLookup,
  RegisteredDialogInfo,
  UnregisteredDialogInfo,
} from './types.js';

/**
 * The manager's port onto a modal store — declared as the requirement, not derived from
 * `DialogStore` (contrast `finalize-close.ts`, which narrows the real store). The snapshot stays
 * the shared `DialogStoreSnapshot` so the manager can read `closeResult.reason` off it.
 */
type RegisteredStore = {
  /** Unconditional state transition — unlike {@link DialogManager.requestOpen} it cannot be refused, which is why `open(id)` calls it. */
  readonly beginOpen: () => void;
  // A method, not a property: a modal that narrows its reasons still satisfies the port.
  close(reason: string): boolean;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => DialogStoreSnapshot;
  /**
   * One-shot resolver for the next close, so `requestOpenAndWait` can hand back the close of a
   * dialog it does not own. Erased at `unknown`: a parameter-position callback is checked
   * contravariantly, so a `TData` resolver would make `DialogStore<TData>` unassignable. The
   * narrowing happens at the door instead, off the id — this port is what the registry holds, and
   * it holds every dialog under one type.
   */
  readonly addCloseResolver: (resolve: (result: AwaitedClose<unknown>) => void) => void;
};

/**
 * What a caller says about itself when asking a dialog it does not own to open. Every field is a
 * claim in the HTTP-`Referer` sense — useful for routing and logs, verified by nothing, not a
 * security boundary; treat it like the body of a `postMessage`.
 */
export type OpenRequestContext = {
  /** Who says it is asking — a microfrontend name, a feature, a route. */
  readonly source?: string | undefined;
  /** Whatever else the two sides agreed to send. Unverified, like the rest. */
  readonly [key: string]: unknown;
};

/**
 * An open, asked for rather than performed.
 *
 * `data` is `unknown` on purpose and it is the whole point of the shape. `close(id, reason)` takes
 * no payload because the registry is keyed by string and cannot check one against a modal's
 * `TData` — the same objection applies here, and the answer is different: this payload is not
 * pretending to be typed. It crossed an ownership boundary, so the dialog that receives it
 * validates it before believing it, exactly as it would a message off the wire.
 */
export type OpenRequest<TPayload = unknown> = {
  /**
   * The payload. `unknown` unless the receiving modal declared one in {@link DialogRegistry}, in
   * which case this is that type and the ask is checked against it — see {@link PayloadOf}, and
   * note that a declaration is a contract between two call sites rather than a validation of what
   * arrives. Parse anything that genuinely crossed a boundary before acting on it.
   *
   * Called `payload` and not `data` on purpose: `CloseResult.data` is what *this* modal closes
   * with, and this is what it was opened with. Two directions that share a word are two directions
   * that get confused.
   */
  readonly payload?: TPayload;
  /** What the caller says about itself. See {@link OpenRequestContext}. */
  readonly context?: OpenRequestContext | undefined;
};

/**
 * Build an {@link OpenRequest} — the envelope handed to {@link DialogManager.requestOpen}.
 *
 * `requestOpen(id, { payload, context })` works and always will; this exists because the call site
 * is a boundary, where remembering keys exactly is worst — and because a protocol would grow here
 * (a version, a correlation id) without every caller being edited. It validates nothing and
 * cannot: only the receiving dialog knows what a good payload looks like.
 *
 * **Two overloads, because the payload-free call has to fit a modal that declares one.** Asking
 * with nothing is legal against any contract — {@link PayloadOf} types the payload, it does not
 * require one — but a single generic signature inferred `OpenRequest<undefined>` there, which is
 * not assignable to the `OpenRequest<Declared>` the door takes. `never` is: it is assignable to
 * every payload type, and no caller can put a value in it.
 *
 * @example
 * // The two halves, named, at the boundary.
 * dialogManager.requestOpen(
 *   'patient:merge',
 *   createOpenRequest({ patientId: '42' }, { source: 'portal:nav' })
 * );
 *
 * // No payload — just say who is asking. Fits a declared contract as well as an open one.
 * dialogManager.requestOpen('help', createOpenRequest(undefined, { source: 'shell:menu' }));
 */
export function createOpenRequest(
  payload?: undefined,
  context?: OpenRequestContext
): OpenRequest<never>;
export function createOpenRequest<TPayload>(
  payload: TPayload,
  context?: OpenRequestContext
): OpenRequest<TPayload>;
export function createOpenRequest<TPayload>(
  payload?: TPayload,
  context?: OpenRequestContext
): OpenRequest<TPayload> {
  return {
    ...(payload !== undefined && { payload }),
    ...(context !== undefined && { context }),
  };
}

/**
 * Answers a bridged open on the dialog's behalf. Declared through the binding — `useDialog({
 * onOpenRequest })` in React.
 *
 * Declaring one is what makes a dialog reachable by {@link DialogManager.requestOpen}; a dialog
 * that declares none refuses every such request. Nothing is opened for you: accept by calling the
 * dialog's own `open()`, refuse by returning.
 *
 * The payload comes first because it is what a handler almost always wants; the whole envelope
 * follows for the ones that also care who is asking.
 *
 * **`unknown`, and it stays `unknown` even for a modal the registry declares** — the one place the
 * contract deliberately does not narrow. {@link PayloadOf} types the *asking* side, where both call
 * sites are the project's own and a mismatch is a mistake the checker can catch. This side is where
 * a message from outside the project arrives, and a parameter annotated with a declaration nobody
 * checked at run time would read as a guarantee that had never been made. Parse it — the
 * declaration is there to be the type you parse *to* — `PayloadOf<'patient:merge'>` is what a
 * schema for this door should produce, and checking that it does is one line:
 *
 * ```ts
 * const schema: z.ZodType<PayloadOf<'patient:merge'>> = z.object({ patientId: z.string() });
 * ```
 */
export type OpenRequestHandler = (
  payload: unknown,
  request: OpenRequestDispatch
) => void | Promise<void>;

/**
 * The envelope as the *handler* sees it: what the caller sent, plus the way to say no.
 *
 * Derived rather than restated — {@link OpenRequest} is what a caller builds, and `refuse` is
 * supplied by the manager at dispatch, so the two shapes are genuinely different and neither is
 * a copy of the other.
 */
export type OpenRequestDispatch<TPayload = unknown> = OpenRequest<TPayload> & {
  /**
   * Refuse the request, with a reason the asker can act on.
   *
   * Refusal is explicit and acceptance is the default: a handler that opens the dialog says yes
   * by doing so, and the manager never has to observe the dialog to find out. It cannot — the
   * React binding's open is asynchronous (state, then effect, then `showDialog`), so a phase
   * checked when the handler returns would report a successful accept as a refusal.
   *
   * Calling it twice, or calling it after opening, changes nothing: the first answer stands.
   */
  readonly refuse: (reason: string) => void;
};

/**
 * {@link OpenRequestOutcome} for a declared id: the accepted branch resolves the correlated close,
 * so a caller across a boundary switches on `reason` and reads the payload that reason declared.
 */
export type RegisteredOpenRequestOutcome<TId> =
  | {
      readonly accepted: true;
      /** Resolves the way `openAndWait()` does, once the dialog closes. */
      readonly closed: Promise<AwaitedCloseOf<TId>>;
    }
  | {
      readonly accepted: false;
      /** Why — see {@link OpenRequestOutcome}. */
      readonly reason: string;
    };

/**
 * What {@link DialogManager.requestOpenAndWait} resolves to — the answer to the ask, and on the
 * accepted branch the close that follows it.
 *
 * Two questions with two lifetimes: the decision settles in milliseconds, the close settles when
 * the user is done. Folding them into one promise would need three branches (refused, closed,
 * abandoned) in a two-branch tuple, so the decision *carries* the close instead. Awaiting the
 * second half is opt-in and costs nothing when skipped.
 */
export type OpenRequestOutcome<TData = unknown, TReason extends string = string> =
  | {
      readonly accepted: true;
      /** Resolves the way `openAndWait()` does, once the dialog closes. */
      readonly closed: Promise<AwaitedClose<TData, TReason>>;
    }
  | {
      readonly accepted: false;
      /**
       * Why. Either whatever the handler passed to `refuse`, or one of the manager's own:
       * `'not-registered'` (no such dialog) or `'accepts-none'` (registered, but it declared no
       * `onOpenRequest`, so it never agreed to be opened from outside).
       */
      readonly reason: string;
    };

/** The store a binding registers, and what else it may tell the registry about that dialog. */
export type RegisterOptions = {
  /** The state this dialog is driven by — the one field the registry cannot default. */
  readonly store: RegisteredStore;
  /**
   * Which template built this dialog — free-form, carried on the DOM events, never read here.
   * Defaults to `'modal'`. See `DialogInfo.template`.
   */
  readonly template?: string | undefined;
  /** Non-modal dialogs never lock body scroll and never take the top layer. */
  readonly nonModal?: boolean | undefined;
  /** Makes this dialog reachable by {@link DialogManager.requestOpen}. */
  readonly onOpenRequest?: OpenRequestHandler | undefined;
  /**
   * The `<dialog>` this store drives, so the open event can carry it.
   *
   * A getter rather than the element, because a binding registers before it has one. The manager
   * asks once, as it dispatches, and never holds the answer — which is what keeps it a port
   * rather than a second reference to the DOM.
   */
  readonly getDialog?: (() => HTMLElement | null) | undefined;
};

/**
 * Events emitted by the dialog manager.
 *
 * Two pairs, and they answer different questions. `open` / `close` are about a dialog on screen;
 * `register` / `unregister` are about one existing at all — which is what a caller outside the
 * component tree cannot otherwise know, since {@link DialogLookup.exists} answers "now" and nothing
 * answered "tell me when". A dialog behind a code-split route is registered when its component
 * mounts, so an imperative `open` before that lands on nothing.
 */
export type DialogManagerEvent =
  | {
      /** Fires once the modal is open and its `prepare` has settled. */
      readonly type: 'open';
      /** The modal's id. */
      readonly id: string;
    }
  | {
      /** Fires after the closing sequence completes. */
      readonly type: 'close';
      /** The modal's id. */
      readonly id: string;
      /** The reason the modal closed with, if it had one. */
      readonly reason?: string | undefined;
    }
  | {
      /**
       * Fires when a dialog joins the registry — its component mounted, or `bindDialog` ran.
       *
       * **The dialog is openable by the time this arrives**, which is what makes it useful rather
       * than merely informative: a caller holding an ask nobody could answer yet opens here.
       * A duplicate id emits this again, the displaced registration having been released.
       */
      readonly type: 'register';
      /** The modal's id. */
      readonly id: string;
    }
  | {
      /**
       * Fires when a dialog leaves the registry — its component unmounted, or the controller was
       * destroyed. After the `close` that an unmount-while-open also emits: the dialog leaves the
       * screen before it leaves the registry, and both are worth hearing separately.
       */
      readonly type: 'unregister';
      /** The modal's id. */
      readonly id: string;
    };

/**
 * Subscriber callback type for dialog manager events.
 */
export type DialogManagerSubscriber = (event: DialogManagerEvent) => void;

/**
 * DOM event name dispatched on document at the start of the opening sequence.
 *
 * Reports the same moments as {@link DialogManager.subscribe}, but dispatched on `document`, so a
 * listener hears every dialog on the page — including ones raised by a different copy of this
 * library in another bundle. That crossing is the only reason to prefer it; inside one app
 * `subscribe` is better (no globals, no string names).
 *
 * @example
 * // `event.detail` is typed: the library augments `DocumentEventMap`, so no cast.
 * document.addEventListener(DIALOG_OPEN_EVENT, (event) => {
 *   analytics.track('dialog_shown', { id: event.detail.id, template: event.detail.template });
 * });
 */
export const DIALOG_OPEN_EVENT = 'dialog:open' as const;

/**
 * DOM event name dispatched on document after the closing sequence completes.
 *
 * @example
 * document.addEventListener(DIALOG_CLOSE_EVENT, (event) => {
 *   const { id, reason, openedAt } = event.detail;
 *   analytics.track('dialog_closed', { id, reason, ms: Date.now() - openedAt });
 * });
 */
export const DIALOG_CLOSE_EVENT = 'dialog:close' as const;

/** Payload for the `dialog:open` CustomEvent detail. */
export type DialogOpenEventDetail = {
  /** The modal's id. */
  readonly id: string;
  /** The label its creator gave it — see `DialogInfo.template`. */
  readonly template: string;
  /** `Date.now()` recorded as the opening sequence started. */
  readonly openedAt: number;
  /**
   * The `<dialog>` element, when the binding that registered it supplies one.
   *
   * Carried rather than left to be looked up, because the obvious lookup does not always work: a
   * `document.querySelector('dialog[data-dialog-id="…"]')` finds nothing when the dialog lives in
   * a shadow root, and this library supports one. It is on the open event only — by the close the
   * element may be on its way out of the document, and the id is enough to match the pair.
   */
  readonly element: HTMLElement | null;
};

/** Payload for the `dialog:close` CustomEvent detail. */
export type DialogCloseEventDetail = {
  /** The modal's id. */
  readonly id: string;
  /** The label its creator gave it — see `DialogInfo.template`. */
  readonly template: string;
  /** The reason it closed with, if it had one. */
  readonly reason: string | undefined;
  /** `Date.now()` recorded when it opened — subtract for the time it stayed up. */
  readonly openedAt: number;
};

/**
 * Teach `document.addEventListener` about the two events this library dispatches, so a
 * listener's parameter arrives as `CustomEvent<DialogOpenEventDetail>` instead of a bare
 * `Event` the caller has to assert.
 *
 * Without it, every consumer writes `(e as CustomEvent<DialogOpenEventDetail>).detail` — a cast
 * the library is responsible for, since it owns both the event names and the detail shapes.
 * The names are repeated as literals here because an interface key cannot be a computed
 * `typeof DIALOG_OPEN_EVENT`; `dialog-manager.test.ts` asserts the map entries resolve through
 * the constants, so a renamed event cannot leave a stale key behind.
 */
declare global {
  interface DocumentEventMap {
    'dialog:open': CustomEvent<DialogOpenEventDetail>;
    'dialog:close': CustomEvent<DialogCloseEventDetail>;
  }
}

/**
 * Immutable snapshot of the dialog manager's observable state.
 * Returned by `useDialogManager()` for reactive React consumption
 * via `useSyncExternalStore`.
 *
 * Everything else is derivable from `openDialogs`: counts via `.length`,
 * modal vs non-modal via `DialogInfo.nonModal`, and stack position via
 * array index (the array is ordered bottom to top).
 */
export type DialogManagerSnapshot = {
  /**
   * Open modals (modal and nonModal), bottom of the stack first — index = stack position.
   *
   * Two keys, in this order, and only the second is a preference: **every non-modal dialog sits
   * under every modal one**, because the platform paints top-layer elements above ordinary ones and
   * no `z-index` reaches between them; then whatever {@link DialogManager.prioritize} installed, if
   * anything; then the order the opens arrived in.
   */
  readonly openDialogs: readonly RegisteredDialogInfo[];
  /**
   * The one in front. `undefined` if none are open.
   *
   * The most recently opened **modal** dialog — or the one a {@link DialogManager.prioritize} policy
   * put there. A non-modal dialog is never the foreground while a modal one is open, however much
   * later it opened, and that is worth knowing beyond paint order: `isForeground` is what decides
   * which dialog answers the dismiss key and which one owns a click outside.
   */
  readonly foreground: RegisteredDialogInfo | undefined;
};

const emptySnapshot: DialogManagerSnapshot = {
  openDialogs: [],
  foreground: undefined,
};

/**
 * Public interface for a dialog manager instance.
 *
 * In production, the static `dialogManager` singleton is used automatically.
 * For test isolation, use `createDialogManager()` with `DialogManagerProvider`
 * to give each test its own instance.
 */
export type DialogManager = {
  /** Register a modal store. Called internally by useDialog. */
  register(id: DialogId, options: RegisterOptions): void;

  /** Unregister a modal store. Called internally by useDialog. */
  unregister(id: DialogId): void;

  /**
   * Open a modal imperatively by id. Unconditional — see {@link DialogManager.requestOpen}.
   *
   * @returns Whether a dialog was there to open. **`false` is the only report this door makes**,
   * and it is the answer to the one way an instruct fails: the id names no *registered* dialog, so
   * nothing happened. That is not a rare mistake to guard against — a modal behind a code-split
   * route is registered when its component mounts, and a service, router guard or deep link firing
   * before that is the ordinary case. Every other door already answered (`openAndWait` resolves
   * `[Error, null]`, `requestOpenAndWait` refuses with `'not-registered'`); this one only warned,
   * and warnings are silent until `setLogLevel`.
   *
   * To open one that has not arrived yet, listen for it — `subscribe` reports `register`, and the
   * dialog is openable by the time that lands.
   */
  open(id: DialogId): boolean;

  /**
   * **Ask** a modal to open, and let it say no.
   *
   * The door for code that does not own the dialog: another microfrontend, a shell, a deep link.
   * `open(id)` instructs; this asks, which matters most for a *controlled* dialog — instruct one
   * of those and it opens for a moment before its own reconciliation puts it back, flashing on
   * screen and emitting a spurious open/close pair.
   *
   * **A dialog that declares no handler refuses**, logged, rather than opening anyway: the request
   * reached a dialog that never agreed to be opened from outside. `open(id)` is unaffected.
   *
   * Fire-and-forget; when the answer matters use {@link DialogManager.requestOpenAndWait}.
   *
   * **The payload is checked against the id** when the registry names one for it
   * ({@link PayloadOf}) — one generic signature rather than an overload pair, for the reason
   * {@link DialogManager.close} carries: a failing first overload falls through to the permissive
   * one instead of erroring, so the check a declared modal is paying for would evaporate exactly
   * when it is wrong.
   *
   * @param id The dialog to ask.
   * @param request What to hand its handler. `context` is untrusted and so is a payload that
   * genuinely crossed a boundary — see {@link OpenRequest}.
   *
   * @example
   * // The shell asks; the dialog's owner decides.
   * dialogManager.requestOpen('patient:merge', {
   *   payload: { patientId: '42' },
   *   context: { source: 'portal:nav' },
   * });
   */
  requestOpen<TId extends DialogId>(id: TId, request?: OpenRequest<PayloadOf<NoInfer<TId>>>): void;

  /**
   * The same ask, with the answer — and, if it was a yes, the close that follows.
   *
   * {@link DialogManager.requestOpen} tells the owner and walks away; this waits for the decision,
   * which is what a caller across a boundary needs — a refusal it never hears is a dead end. All
   * three refusals (no such dialog, no handler, an explicit `refuse`) arrive here as a reason
   * rather than only in the console. Acceptance is the default; the handler may be `async`.
   *
   * **Two signatures, and both constrain the payload identically** — the pair exists for the
   * *return*, which is `DataOf`/`ReasonOf` for a declared id and open for any other. Constraining
   * the argument in only the first is what would make it decorative: a wrong payload would fail
   * that overload and land on this one.
   *
   * @example
   * const outcome = await dialogManager.requestOpenAndWait(
   *   'billing:confirm',
   *   createOpenRequest({ amount: 240 }, { source: 'checkout' })
   * );
   * if (!outcome.accepted) {
   *   report(`billing refused: ${outcome.reason}`);
   * } else {
   *   const [error, result] = await outcome.closed;
   * }
   */
  requestOpenAndWait<TId extends RegisteredDialogId>(
    id: TId,
    request?: OpenRequest<PayloadOf<NoInfer<TId>>>
  ): Promise<RegisteredOpenRequestOutcome<TId>>;
  requestOpenAndWait<TId extends DialogId>(
    id: TId,
    request?: OpenRequest<PayloadOf<NoInfer<TId>>>
  ): Promise<OpenRequestOutcome>;

  /**
   * Open a modal and wait for it to close — the imperative twin of a hook's `openAndWait()`, for
   * code with no component to hold one: a service, a router guard, a worker.
   *
   * **Instructs, like {@link DialogManager.open}**, where {@link DialogManager.requestOpenAndWait}
   * asks and may be refused. Reach for that one across an ownership boundary and this one inside it.
   *
   * Resolves the same `[error, result]` tuple a hook does, typed by the registry — so a project
   * that declared the modal gets its reasons and its payload back without annotating anything.
   * Two situations take the `[Error, null]` branch rather than hanging or lying: an id nobody
   * registered, and a dialog still leaving, whose exit is not this caller's to hear.
   *
   * @example
   * const [unavailable, closed] = await dialogManager.openAndWait('confirm-delete');
   * if (unavailable) {
   *   return report(unavailable.message); // nobody registered that id — an answer, not a hang
   * }
   * if (closed.reason === 'confirm') {
   *   await api.deleteAccount();
   * }
   */
  openAndWait<TId extends RegisteredDialogId>(id: TId): Promise<AwaitedCloseOf<TId>>;
  openAndWait(id: DialogId): Promise<AwaitedClose<unknown>>;

  /**
   * Close a modal imperatively by id, with a reason.
   *
   * **Reason only, and only the reasons that carry nothing.** The registry is keyed by string, so
   * nothing here knows a modal's `TData` — a reason whose contract declares a payload is refused
   * rather than closed without one, which would hand `onClose` a result its own type says cannot
   * exist. Those go through the typed doors: `handle.close(reason, data)`, or an action's `close`.
   */
  close<TId extends DialogId>(
    id: TId,
    reason?: PayloadFreeReasonOf<NoInfer<TId>> | DismissReason
  ): void;

  /**
   * Query modal state.
   *
   * - `lookup()` — returns a `DialogLookup` with collection-level query methods.
   * - `lookup(id)` — returns `DialogInfo` for a specific modal. Always returns
   *   a valid object (null-object default for unregistered ids).
   */
  /** The collection-level query API. */
  lookup(): DialogLookup;
  /** One modal's state; a null-object default for an id nobody registered. */
  lookup(id: DialogId): DialogInfo;

  /**
   * Decide the stack order yourself, instead of letting whoever opened last win.
   *
   * Without one, a dialog's place is the order its `showModal()` landed in — a race between
   * features that do not know about each other, and losing it puts a session warning *behind* a
   * panel, inert under its backdrop.
   *
   * One policy for the whole manager: a dialog to a number, higher meaning nearer the user, ties
   * keeping open order, so a policy only says where it disagrees. It applies to dialogs already on
   * screen, before the frame is painted, and the snapshot, `foreground`, `isForeground` and
   * `getZIndex` move with it. What a reorder costs is `raiseDialog`'s subject: `close()` +
   * `showModal()`, so the native `close` fires and CSS keyed on `[open]` re-runs.
   *
   * **A policy orders each family, never across them** — modality is settled before it is asked,
   * so a big number on a panel moves it no nearer the user. Opt-in, dormant until called, and
   * replaced rather than stacked by a second call. Installing it over dialogs already
   * open is minimal too: the tracking is seeded from the stack as it stands, so the first plan
   * lifts what the order needs rather than everything. Both facts are in the compatibility matrix.
   *
   * @returns A disposer restoring the no-policy order within each family, reordering what is on
   *   screen to match. It does nothing if a later `prioritize` already replaced the policy.
   *
   * @example
   * // Once, at start-up. The warning outranks anything a route or a panel raises.
   * dialogManager.prioritize((modal) => {
   *   if (modal.id === 'session-expiring') {
   *     return 100;
   *   }
   *   return modal.template === 'slide' ? -10 : 0;
   * });
   */
  prioritize(priority: StackPriority): () => void;

  /**
   * Put the open dialogs where the policy from {@link DialogManager.prioritize} says they belong.
   *
   * Idempotent, a no-op until a policy exists, and called by the manager on every change it
   * observes — public only because its clock runs a step ahead of the DOM's: a store reaching
   * `'opening'` is not a dialog that has been shown, so the moment that matters is a binding's
   * to report.
   *
   * @param shownId The dialog whose element was *just* shown. Recorded rather than inferred:
   *   every show goes through the one seam that calls this, so at most one dialog can have
   *   entered the top layer between two calls.
   */
  syncStackOrder(shownId?: string): void;

  /** Base z-index for dialog stacking. */
  readonly zIndexBase: number;

  /**
   * The computed z-index for a modal: `zIndexBase` + its position in the open stack.
   *
   * A dialog that is not open has no stack position, so it gets the base — the same value the
   * bottom-most open one would get. That is the useful answer, because a closed dialog's stale
   * z-index is never consulted.
   *
   * **Position in the stack, not in the open order** — modality sorts first, so the bottom is a
   * non-modal dialog whenever one is open. The stamp on the element is written at its own show and
   * rewritten by `syncStackOrder`, which is what moving a non-modal dialog means; with no policy
   * nothing rewrites it, so a stamp and this number can disagree after a close. Nothing reads the
   * stamp back, and the order they describe is the same.
   */
  getZIndex(id: DialogId): number;

  /** Subscribe to open/close events. */
  subscribe(callback: DialogManagerSubscriber): () => void;

  /** Subscribe to snapshot changes (for useSyncExternalStore in useDialogManager). */
  subscribeSnapshot: (listener: () => void) => () => void;

  /** Get the current snapshot (for useSyncExternalStore in useDialogManager). */
  getSnapshot: () => DialogManagerSnapshot;
};

// ── Store registry types ────────────────────────────────────────────────────

type RegistryEntry = {
  readonly store: RegisteredStore;
  readonly unsubscribe: () => void;
  readonly template: string;
  readonly nonModal: boolean;
  /**
   * Set when the dialog agreed to answer bridged opens. Absent means it refuses them — the
   * registry does not open a dialog on behalf of a caller it never heard of.
   */
  readonly onOpenRequest?: OpenRequestHandler | undefined;
  /**
   * The `<dialog>` this store drives, when the binding supplies one — see
   * {@link RegisterOptions.getDialog}. Kept rather than only read at dispatch, because a stack
   * policy has to reach the element long after the open that announced it.
   */
  readonly getDialog?: (() => HTMLElement | null) | undefined;
  /** Wall-clock open time. Public (`DialogInfo.openedAt`, DOM event details) — not an order. */
  readonly openedAt: number;
  /**
   * Monotonic open counter, and the actual sort key for the stack.
   *
   * `openedAt` cannot order the stack: opening two modals in one synchronous block — a
   * confirm raised from inside another modal — puts both on the same millisecond, and a
   * stable sort then falls back to registry insertion order, which is mount order and has
   * nothing to do with which modal opened last. This never ties.
   */
  readonly openSequence: number;
};

type OpenEntry = { readonly id: string; readonly entry: RegistryEntry };

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates an isolated dialog manager instance.
 *
 * Each instance owns its own modal registry, event listeners, and snapshot
 * state. The static `dialogManager` singleton is created by calling this
 * factory at module level.
 *
 * **Test isolation**: wrap a test harness with `DialogManagerProvider` to
 * give it a fresh instance that does not leak state between tests.
 *
 * @example
 * // Its own manager, outside React — `DialogManagerProvider` builds one for a subtree itself.
 * const manager = createDialogManager();
 * const stop = manager.subscribe((event) => analytics.track(event.type, { id: event.id }));
 */
export function createDialogManager(): DialogManager {
  const log = createLogger('manager');

  /** Identity this instance claims the global body scroll lock under — see `scroll-lock.ts`. */
  const lockOwner = createLockOwner();

  /**
   * Where the stack starts, and it decides nothing for a **modal** dialog.
   *
   * The top layer ignores `z-index`, so the number on a modal dialog is debugging output
   * (`data-dialog-z`). It is **non-modal** panels this orders, since those stay in normal flow.
   *
   * 1300 is MUI's `zIndex.modal` exactly — drawer 1200, app bar 1100 — so a panel lands above the
   * chrome it covers and below the snackbars meant to cover it, on the scale a consumer most
   * likely already has.
   *
   * **Stamped inline**, so moving it needs `!important`. Not an option, deliberately: it matters
   * only for non-modal dialogs and nothing has needed it.
   */
  const zIndexBase = 1300;

  const registry = new Map<string, RegistryEntry>();
  const listeners = new Set<DialogManagerSubscriber>();
  /** Incremented on every open; see `RegistryEntry.openSequence`. */
  let openSequence = 0;
  /** The stack policy, when one was installed — see `prioritize`. Absent means open order. */
  let priority: StackPriority | undefined;
  /**
   * The top layer as this manager last left it, front-most last — the modal dialogs whose elements
   * are open, in paint order.
   *
   * Tracked rather than derived, because the platform does not expose the top layer's order and
   * nothing else can answer *what has to move*. Only `syncStackOrder` writes it, so with no policy
   * ever installed it stays empty and the whole feature is inert.
   */
  let topLayerOrder: string[] = [];
  // Observable snapshot cell (consumed by `useDialogManager` via useSyncExternalStore).
  const snapshotStore = createStore(emptySnapshot);

  // ── Registry query helpers ──────────────────────────────────────────────

  /** Single iteration source of truth for all non-closed entries. */
  function getOpenEntries(): OpenEntry[] {
    const result: OpenEntry[] = [];
    for (const [id, entry] of registry) {
      if (entry.store.getSnapshot().phase !== 'closed') {
        result.push({ id, entry });
      }
    }
    return result;
  }

  /**
   * Convert a registry entry to a public DialogInfo.
   * Accepts a pre-computed `topId` to avoid redundant registry iterations
   * when called in a batch (e.g. inside `computeSnapshot`); omitting it says
   * "this one cannot be the foreground", which is what every single-entry read means.
   */
  function toDialogInfo(
    id: string,
    source: { readonly entry: RegistryEntry; readonly topId?: string | undefined }
  ): RegisteredDialogInfo {
    const { entry, topId } = source;
    const { phase, isPreparing } = entry.store.getSnapshot();
    return {
      id,
      exists: true,
      phase,
      isVisible: phase !== 'closed',
      isPreparing,
      isForeground: id === topId,
      openedAt: entry.openedAt,
      template: entry.template,
      nonModal: entry.nonModal,
    };
  }

  /** Create a null-object default for an unregistered modal id. */
  function toUnregisteredDialogInfo(id: string): UnregisteredDialogInfo {
    return {
      id,
      exists: false,
      phase: 'closed',
      isVisible: false,
      isPreparing: false,
      isForeground: false,
      openedAt: 0,
    };
  }

  // ── Event emission ────────────────────────────────────────────────────────

  function emit(event: DialogManagerEvent) {
    // The copy is load-bearing, not ceremony: a `Set` iterator picks up entries added during
    // iteration, so a listener that subscribes another one — lazily attaching per-modal
    // tracking on the first event it sees, say — would deliver that same event to the
    // newcomer, which reads as a duplicate. Copying also makes self-unsubscription during
    // dispatch unambiguous. Pinned by dialog-manager-registry.test.ts.
    // oxlint-disable-next-line no-useless-spread -- snapshot before dispatch, see above
    for (const listener of [...listeners]) {
      listener(event);
    }
  }

  function dispatchDialogEvent(
    name: typeof DIALOG_OPEN_EVENT | typeof DIALOG_CLOSE_EVENT,
    detail: DialogOpenEventDetail | DialogCloseEventDetail
  ): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // ── Change notification ───────────────────────────────────────────────────

  function notifyChange() {
    // Publish a freshly computed snapshot. Every call produces a new object,
    // so subscribers are always notified — dedup happens upstream via the
    // per-store transition guard in the register() subscriber.
    snapshotStore.set(computeSnapshot());
  }

  /** Reads the snapshot — call only after `notifyChange()` for the same transition. */
  function syncBodyScrollLock() {
    if (typeof document === 'undefined') {
      return;
    }

    // The document's half of the sheet — `core/dialog-styles.ts` owns it because a dialog in a
    // shadow root has to adopt it too, and `showDialog` is what knows which root that is. Reached
    // only past the guard above, so it needs no document check of its own.
    ensureDialogStyles(document);

    // Non-modal dialogs never lock scrolling — only modal ones do.
    const hasDialogOpen = snapshotStore.getSnapshot().openDialogs.some((d) => {
      return !d.nonModal;
    });
    if (hasDialogOpen) {
      lockBodyScroll(lockOwner);
    } else {
      unlockBodyScroll(lockOwner);
    }
  }

  // ── Snapshot computation ──────────────────────────────────────────────────

  /**
   * Build an immutable snapshot from the current registry state.
   *
   * `openDialogs` is sorted bottom of the stack first, so the array index doubles as the stack
   * position and the last element is the dialog in front. `orderStack` owns the three keys —
   * modality, then the policy if one is installed, then `openSequence`. Not `openedAt`: see
   * `RegistryEntry.openSequence` for why a wall clock cannot order this.
   *
   * `topId` is read off the ordered list rather than computed first: with a policy the foreground is
   * whatever the policy put in front, so asking "which is topmost" before ordering would answer with
   * the open order the policy exists to overrule.
   */
  function computeSnapshot(): DialogManagerSnapshot {
    const openEntries = orderStack(
      getOpenEntries().map(({ id, entry }) => {
        return {
          id,
          entry,
          template: entry.template,
          nonModal: entry.nonModal,
          openSequence: entry.openSequence,
        };
      }),
      priority
    );
    const topId = openEntries.at(-1)?.id;

    const openDialogs = openEntries.map(({ id, entry }) => {
      return toDialogInfo(id, { entry, topId });
    });

    return {
      openDialogs,
      foreground: openDialogs.at(-1),
    };
  }

  // ── Stack order ───────────────────────────────────────────────────────────

  /**
   * Make the DOM agree with the snapshot's order. See {@link DialogManager.syncStackOrder}.
   *
   * Two mechanisms, because the platform has two stacks. A **non-modal** dialog sits in the normal
   * flow and is ordered by `z-index`, so restamping it is the whole move — `showDialog` only ever
   * wrote the value that was current when that dialog itself opened. A **modal** dialog is in the
   * top layer, where `z-index` does not apply at all, and the only way to move one is to close and
   * re-show it; `planRaises` is what keeps that to the minimum, since each one is a real round-trip.
   */
  function syncStackOrder(shownId?: string): void {
    // Dormant until a policy exists — and for one sync after it is removed, which is what restores
    // plain open order to a stack the policy had already rearranged.
    if (!priority && topLayerOrder.length === 0) {
      return;
    }
    if (typeof document === 'undefined') {
      return;
    }

    const open = snapshotStore.getSnapshot().openDialogs;

    open.forEach((info, index) => {
      const element = registry.get(info.id)?.getDialog?.();
      if (element) {
        stampZIndex(element, zIndexBase + index);
      }
    });

    // Only dialogs whose element is really open are in the top layer. A dialog at phase `'opening'`
    // has not been shown yet — its own show is what calls back here with `shownId`.
    const inTopLayer = new Map<string, HTMLDialogElement>();
    for (const info of open) {
      if (info.nonModal) {
        continue;
      }
      const element = registry.get(info.id)?.getDialog?.();
      if (element instanceof HTMLDialogElement && element.open) {
        inTopLayer.set(info.id, element);
      }
    }

    if (shownId !== undefined && inTopLayer.has(shownId)) {
      topLayerOrder = [
        ...topLayerOrder.filter((id) => {
          return id !== shownId;
        }),
        shownId,
      ];
    }

    // An id the tracking never saw is simply absent from `current`, which makes the plan lift it —
    // costing a round-trip it may not have needed, never leaving the order wrong.
    const current = topLayerOrder.filter((id) => {
      return inTopLayer.has(id);
    });
    const desired = [...inTopLayer.keys()];

    for (const id of planRaises(desired, current)) {
      const dialog = inTopLayer.get(id);
      if (dialog) {
        log('Raising dialog', { id, stack: desired });
        raiseDialog(dialog);
      }
    }

    topLayerOrder = desired;
  }

  /**
   * Seed the top-layer tracking from the stack as it already stands, so the first plan is a plan
   * rather than a rebuild.
   *
   * **Sound only before the first policy, which is exactly when it runs.** `syncStackOrder` is
   * dormant until one exists, so nothing has raised anything, so the top layer is the open order of
   * the modal dialogs currently open — and that is what the snapshot carries right now, ranked by
   * `openSequence` because no policy has ranked it yet. Reading the DOM instead would be a second
   * source for a fact the manager already holds.
   *
   * Without it the first plan compares against an empty `current`, which by `planRaises`' own
   * arithmetic returns **every** open modal dialog. Measured on three dialogs in an order a policy
   * actually changes: three round-trips without this, two with — and the earlier reading of zero
   * either way was a synchronous read of a queued event, since `close()` fires its `close` on a
   * later turn. The saving is one whole close-and-re-show, and it is the stack the user is looking
   * at.
   */
  function seedTopLayerOrder(): void {
    if (topLayerOrder.length > 0 || typeof document === 'undefined') {
      return;
    }

    topLayerOrder = snapshotStore
      .getSnapshot()
      .openDialogs.filter((info) => {
        if (info.nonModal) {
          return false;
        }
        // The same test `syncStackOrder` makes: a dialog at phase `'opening'` is not in the top
        // layer yet, and seeding it would claim a position the platform has not given it.
        const element = registry.get(info.id)?.getDialog?.();
        return element instanceof HTMLDialogElement && element.open;
      })
      .map((info) => {
        return info.id;
      });
  }

  function prioritize(next: StackPriority): () => void {
    // Before `priority` is set, while the snapshot still reads in plain open order.
    seedTopLayerOrder();
    priority = next;
    log('Stack policy installed');
    notifyChange();
    syncStackOrder();

    return () => {
      if (priority !== next) {
        // A later `prioritize` owns the policy now, and this disposer must not put the manager back
        // to open order behind its back.
        return;
      }
      priority = undefined;
      log('Stack policy removed');
      notifyChange();
      syncStackOrder();
    };
  }

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Register a modal store with the registry. Called by `useDialog` on mount.
   * Subscribes to the store's snapshot changes to track open/close transitions
   * and emit events to external listeners.
   */
  function register(id: string, options: RegisterOptions) {
    const { store, template = 'modal', nonModal = false, onOpenRequest, getDialog } = options;
    const initial = store.getSnapshot();
    let prevPhase = initial.phase;
    let prevIsPreparing = initial.isPreparing;
    let openEmitted = false;

    const unsubscribe = store.subscribe(() => {
      const { phase, isPreparing } = store.getSnapshot();
      if (phase === prevPhase && isPreparing === prevIsPreparing) {
        return;
      }

      const entry = registry.get(id);

      // ── Opening started ──
      if (phase === 'opening' && prevPhase === 'closed') {
        openEmitted = false;
        const openedAt = Date.now();
        if (entry) {
          openSequence += 1;
          registry.set(id, { ...entry, openedAt, openSequence });
        }
        dispatchDialogEvent(DIALOG_OPEN_EVENT, {
          id,
          template,
          openedAt,
          element: getDialog?.() ?? null,
        });
      }

      // ── Fully opened: phase is 'open' AND prepare has completed ──
      if (!openEmitted && phase === 'open' && !isPreparing) {
        openEmitted = true;
        log('Opened', { id, openCount: getOpenEntries().length });
        emit({ type: 'open', id });
      }

      // ── Closed ──
      if (phase === 'closed' && prevPhase !== 'closed') {
        openEmitted = false;
        // The store retains its close result through 'closed' (until the next
        // open), so the reason is read straight from it — no side bookkeeping.
        const reason = entry?.store.getSnapshot().closeResult?.reason;
        log('Closed', { id, reason, openCount: getOpenEntries().length });
        emit({ type: 'close', id, reason });
        dispatchDialogEvent(DIALOG_CLOSE_EVENT, {
          id,
          template,
          reason,
          openedAt: entry?.openedAt ?? 0,
        });
      }

      prevPhase = phase;
      prevIsPreparing = isPreparing;
      // Recompute after every observed transition (including 'closing') so
      // the snapshot — which lookup() also reads — never lags the registry.
      notifyChange();
      // Reads the snapshot just published, so it must follow. This is the clock that catches a
      // *close*: the dialogs left behind keep their relative order, but their z-index no longer
      // matches their position. The opens are caught by the lifecycle's own call, which is a step
      // later than this one — a store at `'opening'` has not been shown yet.
      syncStackOrder();
      syncBodyScrollLock();
    });

    // Two live registrations cannot share an id: `registry` holds one entry per id, so the
    // displaced store's subscription would never be reachable by `unregister(id)` again and
    // would keep driving snapshot recomputation from outside the registry for the lifetime of
    // this manager. Release it here, and say so — a duplicate id is a user-land mistake whose
    // other symptoms (one modal's actions closing the other) are much harder to trace back.
    const displaced = registry.get(id);
    if (displaced) {
      displaced.unsubscribe();
      registry.delete(id);
      log.warn('Duplicate modal id — the previous registration was released', { id });
      // Emitted, and before the `register` below, because a listener keeping membership from this
      // pair is the reason the pair exists: two arrivals against one departure leaves it holding a
      // waiter for an id that has gone. The entry is out of the map first, so the event is true
      // when it fires — the same rule the `register` emission follows.
      emit({ type: 'unregister', id });
    }

    registry.set(id, {
      store,
      unsubscribe,
      template,
      nonModal,
      // Spread rather than always-present: `exactOptionalPropertyTypes` distinguishes "absent"
      // from "explicitly undefined", and absent is what "this dialog refuses" is spelled as.
      ...(onOpenRequest !== undefined && { onOpenRequest }),
      ...(getDialog !== undefined && { getDialog }),
      openedAt: 0,
      openSequence: 0,
    });
    log('Registered', { id, registeredCount: registry.size });
    // After the entry is in the map, never before: a listener's whole reason to be here is to open
    // the dialog that just arrived, and one told about it too early would find nothing to open.
    emit({ type: 'register', id });
    notifyChange();
  }

  /**
   * Unregister a modal store. Called by `useDialog` on unmount.
   */
  function unregister(id: string) {
    const entry = registry.get(id);
    if (!entry) {
      return;
    }

    // A dialog torn down while open is a close nobody else would hear about: `close()` is never
    // called, so the phase never reaches `'closed'` and the subscription that emits on that
    // transition is about to be removed. Anything counting opens from outside — a bridge pushing
    // onto a shared stack, a shell disabling its shortcuts while a modal is up — would be left one
    // open ahead for the life of the page, with nothing on screen to explain it.
    //
    // Reported as `'dismiss'`, which is what the store tells an awaiting caller in the same
    // situation: nobody answered.
    const wasOpen = entry.store.getSnapshot().phase !== 'closed';

    entry.unsubscribe();
    registry.delete(id);
    log('Unregistered', { id, registeredCount: registry.size });

    if (wasOpen) {
      emit({ type: 'close', id, reason: DISMISS_REASON });
      dispatchDialogEvent(DIALOG_CLOSE_EVENT, {
        id,
        template: entry.template,
        reason: DISMISS_REASON,
        openedAt: entry.openedAt,
      });
    }

    // After the close, which is the order the two facts happen in: the dialog left the screen and
    // then left the registry. There is no DOM twin of this pair — `dialog:open` / `dialog:close`
    // exist so a *different bundle* can hear a dialog on screen, and a registry is one manager's.
    emit({ type: 'unregister', id });

    notifyChange();
    syncStackOrder();
    syncBodyScrollLock();
  }

  // ── Lookup API ────────────────────────────────────────────────────────────

  // All queries below read from the snapshot, which is recomputed synchronously
  // on every observed store transition — it is never stale relative to the
  // registry. Only registration-level queries (get/exists/getClosed) still
  // touch the registry, since closed modals are not part of the snapshot.
  const lookupObj: DialogLookup = {
    get(id: string): DialogInfo {
      const open = snapshotStore.getSnapshot().openDialogs.find((d) => {
        return d.id === id;
      });
      if (open) {
        return open;
      }
      const entry = registry.get(id);
      // A registered-but-closed modal is never the foreground — no `topId`.
      return entry ? toDialogInfo(id, { entry }) : toUnregisteredDialogInfo(id);
    },

    exists(id: string): boolean {
      return registry.has(id);
    },

    getForeground(): RegisteredDialogInfo | undefined {
      return snapshotStore.getSnapshot().foreground;
    },

    getOpen(filter?: 'modal' | 'non-modal'): RegisteredDialogInfo[] {
      const open = snapshotStore.getSnapshot().openDialogs;
      if (filter === 'modal') {
        return open.filter((d) => {
          return !d.nonModal;
        });
      }
      if (filter === 'non-modal') {
        return open.filter((d) => {
          return d.nonModal;
        });
      }
      return [...open];
    },

    // ── Per-modal queries ─────────────────────────────────────────────────

    isVisible(id: string): boolean {
      return snapshotStore.getSnapshot().openDialogs.some((d) => {
        return d.id === id;
      });
    },

    isForeground(id: string): boolean {
      return snapshotStore.getSnapshot().foreground?.id === id;
    },

    // ── Registration queries ──────────────────────────────────────────────

    getClosed(): RegisteredDialogInfo[] {
      const result: RegisteredDialogInfo[] = [];
      for (const [id, entry] of registry) {
        if (entry.store.getSnapshot().phase === 'closed') {
          result.push(toDialogInfo(id, { entry }));
        }
      }
      return result;
    },

    getRegisteredCount(): number {
      return registry.size;
    },
  };

  function lookup(): DialogLookup;
  function lookup(id: string): DialogInfo;
  function lookup(id?: string): DialogLookup | DialogInfo {
    if (id !== undefined) {
      return lookupObj.get(id);
    }
    return lookupObj;
  }

  /**
   * One ask, one answer — shared by both doors so the fire-and-forget one cannot drift from the
   * one that reports.
   *
   * The close resolver is registered **before** the handler runs, for the same reason
   * `openAndWait` registers before opening: a resolver added afterwards waits for the *next*
   * close, and a dialog that opens and closes inside an `async` handler would already have had
   * its only one. A refusal simply never returns that promise; the resolver drains at the
   * dialog's next close or at its teardown, which is where every unclaimed one goes anyway.
   *
   * It inherits the store's other rule too: asked while the dialog is `'closing'`, an accepted
   * outcome's `closed` is the `[Error, null]` branch — the owner said yes, but the exit already
   * running is not the answer to this ask.
   */
  async function dispatchOpenRequest(
    id: string,
    request: OpenRequest
  ): Promise<OpenRequestOutcome> {
    const source = request.context?.source;
    const entry = registry.get(id);
    if (!entry) {
      log.warn('Open request refused (not registered)', { id, source });
      return { accepted: false, reason: 'not-registered' };
    }
    if (!entry.onOpenRequest) {
      // Refused, and said out loud. A caller that asked a dialog which never opted in has a
      // wrong assumption, and silence is what makes that assumption survive to production.
      log.warn('Open request refused (dialog accepts none)', { id, source });
      return { accepted: false, reason: 'accepts-none' };
    }

    const closed = new Promise<AwaitedClose<unknown>>((resolve) => {
      entry.store.addCloseResolver(resolve);
    });

    // Held on an object rather than in a `let`: the assignment happens inside `refuse`, which the
    // checker cannot see into, so a `let` stays narrowed to `null` at the test below and the
    // whole branch reads as dead code. Property narrowing resets across the call, which is
    // exactly the truth here.
    const answer: { reason: string | null } = { reason: null };
    const dispatch: OpenRequestDispatch = {
      ...request,
      refuse: (reason: string) => {
        // First answer wins: a handler that refuses twice, or refuses after opening, has already
        // told us what it decided and a later word should not overwrite it.
        answer.reason ??= reason;
      },
    };

    log('Open requested from outside', { id, source });
    await entry.onOpenRequest(request.payload, dispatch);

    if (answer.reason !== null) {
      log('Open request refused by the dialog', { id, source, reason: answer.reason });
      return { accepted: false, reason: answer.reason };
    }
    return { accepted: true, closed };
  }

  // The two doors whose *return* narrows on a declared id. Written as declarations rather than as
  // members of the object below, because only a declaration carries overloads — and the correlated
  // signature is one the body cannot prove, `CloseOf` being a union the store never builds.
  function openAndWait<TId extends RegisteredDialogId>(id: TId): Promise<AwaitedCloseOf<TId>>;
  function openAndWait(id: DialogId): Promise<AwaitedClose<unknown>>;
  function openAndWait(id: string): Promise<AwaitedClose<unknown>> {
    const entry = registry.get(id);
    if (!entry) {
      log.warn('Open skipped (not registered)', { id });
      return Promise.resolve([new Error(`No modal registered with id "${id}"`), null]);
    }
    // The resolver is registered before the open, so a modal that closes inside `beginOpen` —
    // a `prepare` that throws, a reconciliation putting it straight back — is still heard.
    const closed = new Promise<AwaitedClose<unknown>>((resolve) => {
      entry.store.addCloseResolver(resolve);
    });
    entry.store.beginOpen();
    return closed;
  }

  function requestOpenAndWait<TId extends RegisteredDialogId>(
    id: TId,
    request?: OpenRequest<PayloadOf<NoInfer<TId>>>
  ): Promise<RegisteredOpenRequestOutcome<TId>>;
  function requestOpenAndWait<TId extends DialogId>(
    id: TId,
    request?: OpenRequest<PayloadOf<NoInfer<TId>>>
  ): Promise<OpenRequestOutcome>;
  function requestOpenAndWait(id: string, request: OpenRequest = {}): Promise<OpenRequestOutcome> {
    return dispatchOpenRequest(id, request);
  }

  // ── Public API (facade) ───────────────────────────────────────────────────

  return {
    register,
    unregister,

    open(id: string): boolean {
      const entry = registry.get(id);
      if (!entry) {
        log.warn('Open skipped (not registered)', { id });
        return false;
      }
      entry.store.beginOpen();
      return true;
    },

    openAndWait,

    requestOpen(id: string, request: OpenRequest = {}): void {
      // The fire-and-forget door. Deliberately not `void dispatchOpenRequest(...)` at the call
      // site of every caller: this one exists so ignoring the answer stays a one-word call.
      void dispatchOpenRequest(id, request);
    },

    requestOpenAndWait,

    close(id: string, reason: string = DISMISS_REASON): void {
      const entry = registry.get(id);
      if (!entry) {
        log.warn('Close skipped (not registered)', { id });
        return;
      }
      entry.store.close(reason);
    },

    lookup,

    prioritize,
    syncStackOrder,

    zIndexBase,

    getZIndex(id: string): number {
      // openDialogs is already in stack order — the index *is* the stack position.
      const index = snapshotStore.getSnapshot().openDialogs.findIndex((d) => {
        return d.id === id;
      });
      return zIndexBase + (index >= 0 ? index : 0);
    },

    subscribe(callback: DialogManagerSubscriber): () => void {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    subscribeSnapshot: snapshotStore.subscribe,
    getSnapshot: snapshotStore.getSnapshot,
  };
}

// ── Static singleton ────────────────────────────────────────────────────────

/**
 * The default dialog manager singleton.
 *
 * Used automatically when no `DialogManagerProvider` wraps the component tree.
 * For test isolation, use `DialogManagerProvider` with a fresh instance from
 * `createDialogManager()`.
 *
 * @example
 * // Imperative control from anywhere — a router guard, a service, a keyboard shortcut.
 * dialogManager.open('unsaved-changes');
 * if (dialogManager.lookup('unsaved-changes').isVisible) {
 *   dialogManager.close('unsaved-changes', 'navigated-away');
 * }
 */
export const dialogManager = createDialogManager();
