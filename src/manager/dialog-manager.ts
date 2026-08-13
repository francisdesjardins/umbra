// The plain barrel: `../store` is framework-free, its React bindings living in
// `../store/react`. This module is the root of an entry point that must resolve without React,
// and that separation is what makes the import structural rather than dependent on Rollup
// tree-shaking unused re-exports back out. Pinned by __tests__/entry-isolation.test.ts.
import type { ModalStoreSnapshot, AwaitedClose } from '../core/types.js';
import { createStore } from '../store/index.js';
import { createLogger } from '../utils/logger.js';
import { ensureDialogStyles } from '../core/dialog-styles.js';
import { raiseDialog, stampZIndex } from '../core/dialog-lifecycle.js';
import { DISMISS_REASON } from '../core/dismiss-reason.js';
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock.js';
import { orderStack, planRaises, type StackPriority } from './stack-order.js';
import type {
  ModalInfo,
  ModalLookup,
  RegisteredModalInfo,
  UnregisteredModalInfo,
} from './types.js';

/**
 * What the manager needs from a modal store — a port, declared as the requirement rather than
 * derived from `ModalStore`. The manager is the framework-agnostic side of the boundary and
 * `createModalStore` is one implementation of it; a second binding supplies its own. Contrast
 * `finalize-close.ts`, which is an internal helper always handed the real store and so takes a
 * `Pick<ModalStore, …>`: that one is a narrowing of a known type, this one is a contract.
 *
 * The *snapshot* is a different matter. It is shared vocabulary, so it is the real
 * `ModalStoreSnapshot` instead of a restatement that could quietly disagree with it — the
 * manager reads `closeResult.reason` off it to emit close events.
 */
type RegisteredStore = {
  /**
   * Start opening, unconditionally — a state transition, not a request. Named apart from
   * {@link DialogManager.requestOpen} on purpose: that one asks an owner who may refuse, this
   * one cannot be refused, and `open(id)` calls it precisely because it cannot.
   */
  readonly beginOpen: () => void;
  // A method, not a property: a modal that narrows its reasons still satisfies the port.
  close(reason: string): boolean;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => ModalStoreSnapshot;
  /**
   * Register a one-shot resolver for the next close, so `requestOpenAndWait` can hand back the
   * close of a dialog it does not own. The port grows because the manager genuinely needs it:
   * `subscribe` reports *that* a close happened, and an awaiting caller needs the result.
   *
   * Erased at `unknown`, not at the modal's `TData`, and for two reasons that agree. A callback
   * in a parameter position is checked contravariantly — the same trap `runOnClose` exists to
   * avoid — so a resolver typed at `TData` would make `ModalStore<TData>` unassignable to this
   * port. And the honest type is `unknown` anyway: the registry is keyed by string, so nothing
   * here knows what a given modal closes with, exactly as with {@link OpenRequest.payload}.
   */
  readonly addCloseResolver: (resolve: (result: AwaitedClose<unknown>) => void) => void;
};

/**
 * What a caller says about itself when asking a dialog it does not own to open.
 *
 * Every field is a **claim**, in the sense an HTTP `Referer` is a claim: it travels with the
 * request, it is useful, and nothing anywhere verified it. A dialog deciding on this is deciding
 * on what the caller chose to say — which is fine for routing and for logs, and is not a security
 * boundary. Treat it the way you would treat the body of a `postMessage`.
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
export type OpenRequest = {
  /**
   * The payload, unvalidated. Parse it against your own schema before acting on it.
   *
   * Called `payload` and not `data` on purpose: `CloseResult.data` is the payload *this* modal
   * declared and the type system checked, and this one is whatever crossed the boundary. Two
   * levels of trust that share a word are two levels of trust that get confused.
   */
  readonly payload?: unknown;
  /** What the caller says about itself. See {@link OpenRequestContext}. */
  readonly context?: OpenRequestContext | undefined;
};

/**
 * Build an {@link OpenRequest} — the envelope handed to {@link DialogManager.requestOpen}.
 *
 * `requestOpen(id, { payload, context })` works and always will; this exists because the call
 * site is a **boundary**, and a boundary is where an object literal is worst. The keys have to be
 * remembered exactly (this one was called `data` until it collided with the payload a modal
 * declares), the two halves mean different things, and the shape is the one place a protocol
 * would grow — a version, a correlation id — without every caller being edited.
 *
 * It validates nothing and it cannot: the payload is `unknown` on the way out, and the dialog
 * that receives it is the only side that knows what a good one looks like.
 *
 * @example
 * // The two halves, named, at the boundary.
 * dialogManager.requestOpen(
 *   'patient:merge',
 *   createOpenRequest({ patientId: '42' }, { source: 'portal:nav' })
 * );
 *
 * // No payload — just say who is asking.
 * dialogManager.requestOpen('help', createOpenRequest(undefined, { source: 'shell:menu' }));
 */
export function createOpenRequest(payload?: unknown, context?: OpenRequestContext): OpenRequest {
  return {
    ...(payload !== undefined && { payload }),
    ...(context !== undefined && { context }),
  };
}

/**
 * Answers a bridged open on the dialog's behalf. Declared through the binding — `useModal({
 * onOpenRequest })` in React.
 *
 * Declaring one is what makes a dialog reachable by {@link DialogManager.requestOpen}; a dialog
 * that declares none refuses every such request. Nothing is opened for you: accept by calling the
 * dialog's own `open()`, refuse by returning.
 *
 * The payload comes first because it is what a handler almost always wants; the whole envelope
 * follows for the ones that also care who is asking.
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
export type OpenRequestDispatch = OpenRequest & {
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
 * What {@link DialogManager.requestOpenAndWait} resolves to — the answer to the ask, and on the
 * accepted branch the close that follows it.
 *
 * Two questions with two lifetimes: the decision settles in milliseconds, the close settles when
 * the user is done. Folding them into one promise would need three branches (refused, closed,
 * abandoned) in a two-branch tuple, so the decision *carries* the close instead. Awaiting the
 * second half is opt-in and costs nothing when skipped.
 */
export type OpenRequestOutcome =
  | {
      readonly accepted: true;
      /** Resolves the way `openAndWait()` does, once the dialog closes. */
      readonly closed: Promise<AwaitedClose<unknown>>;
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

/** What a binding may tell the registry about a dialog beyond its store. */
export type RegisterOptions = {
  /**
   * Which template built this dialog — free-form, carried on the DOM events, never read here.
   * Defaults to `'modal'`. See `ModalInfo.template`.
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
    };

/**
 * Subscriber callback type for dialog manager events.
 */
export type DialogManagerSubscriber = (event: DialogManagerEvent) => void;

/**
 * DOM event name dispatched on document at the start of the opening sequence.
 *
 * **Why this exists next to {@link DialogManager.subscribe}, which reports the same moments.**
 * `subscribe` binds to one manager instance. These events are dispatched on `document`, so a
 * listener hears every dialog on the page — including ones raised by a *different copy of this
 * library*, in another bundle, in another microfrontend. That is the only mechanism here that
 * crosses that line, and it is the observation half of what {@link DialogManager.requestOpen}
 * opens on the way in: a shell can ask a dialog it does not own to open, and watch what came of
 * it, without either side sharing a module instance.
 *
 * Inside one app, `subscribe` is the better tool: same moments, no globals, no string names.
 *
 * @example
 * // `event.detail` is typed: the library augments `DocumentEventMap`, so no cast.
 * document.addEventListener(MODAL_OPEN_EVENT, (event) => {
 *   analytics.track('modal_shown', { id: event.detail.id, template: event.detail.template });
 * });
 */
export const MODAL_OPEN_EVENT = 'modal:open' as const;

/**
 * DOM event name dispatched on document after the closing sequence completes.
 *
 * @example
 * document.addEventListener(MODAL_CLOSE_EVENT, (event) => {
 *   const { id, reason, openedAt } = event.detail;
 *   analytics.track('modal_closed', { id, reason, ms: Date.now() - openedAt });
 * });
 */
export const MODAL_CLOSE_EVENT = 'modal:close' as const;

/** Payload for the `modal:open` CustomEvent detail. */
export type ModalOpenEventDetail = {
  /** The modal's id. */
  readonly id: string;
  /** The label its creator gave it — see `ModalInfo.template`. */
  readonly template: string;
  /** `Date.now()` recorded as the opening sequence started. */
  readonly openedAt: number;
  /**
   * The `<dialog>` element, when the binding that registered it supplies one.
   *
   * Carried rather than left to be looked up, because the obvious lookup does not always work: a
   * `document.querySelector('dialog[data-modal-id="…"]')` finds nothing when the dialog lives in
   * a shadow root, and this library supports one. It is on the open event only — by the close the
   * element may be on its way out of the document, and the id is enough to match the pair.
   */
  readonly element: HTMLElement | null;
};

/** Payload for the `modal:close` CustomEvent detail. */
export type ModalCloseEventDetail = {
  /** The modal's id. */
  readonly id: string;
  /** The label its creator gave it — see `ModalInfo.template`. */
  readonly template: string;
  /** The reason it closed with, if it had one. */
  readonly reason: string | undefined;
  /** `Date.now()` recorded when it opened — subtract for the time it stayed up. */
  readonly openedAt: number;
};

/**
 * Teach `document.addEventListener` about the two events this library dispatches, so a
 * listener's parameter arrives as `CustomEvent<ModalOpenEventDetail>` instead of a bare
 * `Event` the caller has to assert.
 *
 * Without it, every consumer writes `(e as CustomEvent<ModalOpenEventDetail>).detail` — a cast
 * the library is responsible for, since it owns both the event names and the detail shapes.
 * The names are repeated as literals here because an interface key cannot be a computed
 * `typeof MODAL_OPEN_EVENT`; `dialog-manager.test.ts` asserts the map entries resolve through
 * the constants, so a renamed event cannot leave a stale key behind.
 */
declare global {
  interface DocumentEventMap {
    'modal:open': CustomEvent<ModalOpenEventDetail>;
    'modal:close': CustomEvent<ModalCloseEventDetail>;
  }
}

/**
 * Immutable snapshot of the dialog manager's observable state.
 * Returned by `useDialogManager()` for reactive React consumption
 * via `useSyncExternalStore`.
 *
 * Everything else is derivable from `openDialogs`: counts via `.length`,
 * modal vs non-modal via `ModalInfo.nonModal`, and stack position via
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
  readonly openDialogs: readonly RegisteredModalInfo[];
  /**
   * The one in front. `undefined` if none are open.
   *
   * The most recently opened **modal** dialog — or the one a {@link DialogManager.prioritize} policy
   * put there. A non-modal dialog is never the foreground while a modal one is open, however much
   * later it opened, and that is worth knowing beyond paint order: `isForeground` is what decides
   * which dialog answers the dismiss key and which one owns a click outside.
   */
  readonly foreground: RegisteredModalInfo | undefined;
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
  /** Register a modal store. Called internally by useModal. */
  register(id: string, store: RegisteredStore, options?: RegisterOptions): void;

  /** Unregister a modal store. Called internally by useModal. */
  unregister(id: string): void;

  /** Open a modal imperatively by id. Unconditional — see {@link DialogManager.requestOpen}. */
  open(id: string): void;

  /**
   * **Ask** a modal to open, and let it say no.
   *
   * The door for code that does not own the dialog: another microfrontend, a shell, a deep link.
   * `open(id)` is an instruction and this is a request, and the difference matters most for a
   * *controlled* dialog — one whose `open` prop belongs to the component that renders it. Instruct
   * one of those and it opens for a moment and is put back by its own reconciliation, which is a
   * flash on screen, a spurious open/close through {@link DialogManager.subscribe}, and a stack
   * entry that appears and vanishes for anything watching. Ask instead and none of that happens:
   * the dialog's own code decides, and if it says no, nothing moved.
   *
   * **A dialog that declares no handler refuses.** Not "opens anyway" — the request reaches a
   * dialog that never agreed to be opened from outside, and the honest answer to that is no. It is
   * logged, so a caller wondering why nothing happened can find out. `open(id)` is unaffected and
   * still opens anything registered; the two doors are separate on purpose, so adding this one
   * changes the behaviour of no existing call.
   *
   * Returns nothing: this is the fire-and-forget door. When the answer matters — and across an
   * ownership boundary it usually does, since a refusal the asker never hears is a dead end —
   * use {@link DialogManager.requestOpenAndWait}.
   *
   * @param id The dialog to ask.
   * @param request What to hand its handler. Both halves are untrusted — see {@link OpenRequest}.
   *
   * @example
   * // The shell asks; the dialog's owner decides.
   * dialogManager.requestOpen('patient:merge', {
   *   payload: { patientId: '42' },
   *   context: { source: 'portal:nav' },
   * });
   */
  requestOpen(id: string, request?: OpenRequest): void;

  /**
   * The same ask, with the answer — and, if it was a yes, the close that follows.
   *
   * {@link DialogManager.requestOpen} tells the owner and walks away. This waits for the owner's
   * decision, which is what a caller across a boundary needs: a microfrontend that asks for a
   * dialog it does not own and never learns it was refused cannot tell the user why nothing
   * happened. The three refuses the manager produces itself — no such dialog, a dialog that
   * accepts no requests, an explicit `refuse` — all arrive here as a reason instead of only in
   * the console.
   *
   * Acceptance is the default and refusal is explicit — see {@link OpenRequestDispatch}, whose
   * `refuse` says why the manager cannot infer it. The handler may be `async`, and this waits.
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
  requestOpenAndWait(id: string, request?: OpenRequest): Promise<OpenRequestOutcome>;

  /**
   * Close a modal imperatively by id, with a reason.
   *
   * Reason only, no payload: the registry is keyed by string, so nothing here knows a given
   * modal's `TData` and a payload passed through this door could not be checked against it.
   * A typed payload goes through the typed doors — `handle.close(reason, data)` or an
   * action's `close(data)`, both of which know the modal they belong to.
   */
  close(id: string, reason?: string): void;

  /**
   * Query modal state.
   *
   * - `lookup()` — returns a `ModalLookup` with collection-level query methods.
   * - `lookup(id)` — returns `ModalInfo` for a specific modal. Always returns
   *   a valid object (null-object default for unregistered ids).
   */
  /** The collection-level query API. */
  lookup(): ModalLookup;
  /** One modal's state; a null-object default for an id nobody registered. */
  lookup(id: string): ModalInfo;

  /**
   * Decide the stack order yourself, instead of letting whoever opened last win.
   *
   * **The problem it solves.** A dialog's place in the stack is the order its `showModal()` landed
   * in, and that order is a race between parts of an app that do not know about each other: a
   * consent notice raised after a fetch settles, a slide-over opened by a deep link, a session
   * warning on a timer. Lose the race and the notice is *behind* a panel — under its backdrop,
   * inert, unreadable, while the user works on something the app was trying to interrupt. Nothing
   * is broken, and the wrong thing is in front. That is the common shape in an app assembled from
   * independent features, where no single place decides who interrupts whom.
   *
   * **What it does.** One policy, installed once, for the whole manager: a function from a dialog
   * to a number, higher meaning nearer the user, ties keeping open order. So a policy only has to
   * say where it disagrees. It applies to dialogs already on screen — a low-priority dialog that
   * opens over a high-priority one is put back underneath it before the frame is painted, and the
   * snapshot, `foreground`, `isForeground` and `getZIndex` all move with it.
   *
   * **What it costs, and the one thing it cannot do.** Moving a dialog inside the top layer means
   * closing and re-showing it — `z-index` does not apply there — so a reorder fires the element's
   * native `close` event and re-runs CSS keyed on `[open]`. `raiseDialog` in
   * `core/dialog-lifecycle.ts` documents all of it.
   *
   * **A policy orders each family, never across them.** Every non-modal dialog sits under every
   * modal one, and that is settled before the policy is asked — the platform paints top-layer
   * elements above ordinary ones and no `z-index` reaches between them, so an order claiming
   * otherwise would not be an opinion the library is entitled to, it would be false. Returning a
   * huge number for a panel therefore ranks it against the other panels and moves it no nearer the
   * user.
   *
   * Opt-in, and dormant until called: with no policy nothing is ever re-shown or re-stamped, and the
   * order is the modality rule above followed by the order the opens arrived in. Calling it again
   * replaces the policy — it is one project-wide rule, not a stack of them.
   *
   * **Being dormant has a cost on the way in**, and it is the one case where a reorder is not
   * minimal: the top layer is only tracked once a policy exists, so installing one over dialogs that
   * are already open compares the desired order against nothing and re-shows **every** open modal
   * dialog, bottom-first — each of those a native `close` event and a re-run of any CSS keyed on
   * `[open]`. Installing at start-up, before anything opens, costs nothing at all. Seeding the
   * tracking from the snapshot at install time would make this minimal too and is not done yet.
   *
   * @returns A disposer that puts the order back to what it would be with no policy — within each
   *   family, since the modality rule is not the policy's to begin with — and reorders what is on
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
   * Idempotent, and a no-op until a policy exists — the manager calls it itself on every change it
   * observes, so an application normally never does. It is public because the manager's own clock
   * runs one step ahead of the DOM's: a store reaching `'opening'` is not a dialog that has been
   * shown, so the moment that matters is the one right after `showModal()`, which is a binding's to
   * report.
   *
   * @param shownId The dialog whose element was *just* shown, when the call is reporting one.
   *   Recorded rather than inferred: every show in this library goes through the one lifecycle seam
   *   that calls this, so at most one dialog can have entered the top layer between two calls, and
   *   that is what lets the manager know the real order instead of guessing it.
   */
  syncStackOrder(shownId?: string): void;

  /** Base z-index for dialog stacking. */
  readonly Z_INDEX_BASE: number;

  /**
   * The computed z-index for a modal: `Z_INDEX_BASE` + its position in the open stack.
   *
   * A dialog that is not open has no stack position, so it gets the base — the same value the
   * bottom-most open one would get. That is the useful answer, because a closed dialog's stale
   * z-index is never consulted.
   *
   * **Position in the stack, not in the open order**: the bottom of that stack is a non-modal dialog
   * whenever one is open, since the modality rule sorts before everything else. And the stamp
   * outlives the show — `showDialog` writes the value that was current when *that* dialog opened,
   * and `syncStackOrder` rewrites it on every open dialog whenever the order changes, which is the
   * whole of what moving a non-modal dialog means. With no policy installed nothing rewrites it, so
   * a stamp and this number can disagree numerically after a close; nothing reads the stamp back, and
   * the relative order they describe is the same.
   */
  getZIndex(id: string): number;

  /** Subscribe to open/close events. */
  subscribe(callback: DialogManagerSubscriber): () => void;

  /** Subscribe to snapshot changes (for useSyncExternalStore in useDialogManager). */
  subscribeSnapshot: (listener: () => void) => () => void;

  /** Get the current snapshot (for useSyncExternalStore in useDialogManager). */
  getSnapshot: () => DialogManagerSnapshot;
};

// ── CSS injection (shared across instances) ─────────────────────────────────
//
// The sheet itself lives in `core/dialog-styles.ts`, because the document is not the only root
// that needs it: a dialog inside a shadow root has to adopt it too, and `showDialog` is what
// knows which root that is. This is the document's half.

function ensureStyles() {
  if (typeof document === 'undefined') {
    return;
  }
  ensureDialogStyles(document);
}

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
  /** Wall-clock open time. Public (`ModalInfo.openedAt`, DOM event details) — not an order. */
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
  const lockOwner = {};

  /**
   * Where the stack starts, and it decides nothing for a **modal** dialog.
   *
   * `showModal()` puts the element in the top layer, which paints above ordinary content in the
   * order elements were added and ignores `z-index` between the two — so the number stamped on a
   * modal dialog is debugging output (`data-modal-z`) and no more. It is **non-modal** panels this
   * actually orders, because those stay in normal flow.
   *
   * 1300 is the layer most component libraries reserve for a modal — MUI's `zIndex.modal`
   * exactly, with its drawer at 1200 and its app bar at 1100. So a panel lands above the app
   * chrome it is meant to cover and below the snackbars and tooltips meant to cover it, in the
   * scale a consumer is most likely to already be using.
   *
   * **It is stamped inline**, so a consumer moving it needs `!important` on their own rule — the
   * base is not an option today, and making it one is a decision rather than an oversight: the
   * value only ever matters for non-modal dialogs, and no report has needed it.
   */
  const Z_INDEX_BASE = 1300;

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
   * Convert a registry entry to a public ModalInfo.
   * Accepts a pre-computed `topId` to avoid redundant registry iterations
   * when called in a batch (e.g. inside `computeSnapshot`).
   */
  function toModalInfo(
    id: string,
    entry: RegistryEntry,
    topId: string | undefined
  ): RegisteredModalInfo {
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
  function toUnregisteredModalInfo(id: string): UnregisteredModalInfo {
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

  function dispatchModalEvent(
    name: typeof MODAL_OPEN_EVENT | typeof MODAL_CLOSE_EVENT,
    detail: ModalOpenEventDetail | ModalCloseEventDetail
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

    ensureStyles();

    // Non-modal dialogs never lock scrolling — only modal ones do.
    const hasModalOpen = snapshotStore.getSnapshot().openDialogs.some((d) => {
      return !d.nonModal;
    });
    if (hasModalOpen) {
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
      return toModalInfo(id, entry, topId);
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
        stampZIndex(element, Z_INDEX_BASE + index);
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

  function prioritize(next: StackPriority): () => void {
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
   * Register a modal store with the registry. Called by `useModal` on mount.
   * Subscribes to the store's snapshot changes to track open/close transitions
   * and emit events to external listeners.
   */
  function register(id: string, store: RegisteredStore, options: RegisterOptions = {}) {
    const { template = 'modal', nonModal = false, onOpenRequest, getDialog } = options;
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
        dispatchModalEvent(MODAL_OPEN_EVENT, {
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
        dispatchModalEvent(MODAL_CLOSE_EVENT, {
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
      log.warn('Duplicate modal id — the previous registration was released', { id });
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
    notifyChange();
  }

  /**
   * Unregister a modal store. Called by `useModal` on unmount.
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
      dispatchModalEvent(MODAL_CLOSE_EVENT, {
        id,
        template: entry.template,
        reason: DISMISS_REASON,
        openedAt: entry.openedAt,
      });
    }

    notifyChange();
    syncStackOrder();
    syncBodyScrollLock();
  }

  // ── Lookup API ────────────────────────────────────────────────────────────

  // All queries below read from the snapshot, which is recomputed synchronously
  // on every observed store transition — it is never stale relative to the
  // registry. Only registration-level queries (get/exists/getClosed) still
  // touch the registry, since closed modals are not part of the snapshot.
  const lookupObj: ModalLookup = {
    get(id: string): ModalInfo {
      const open = snapshotStore.getSnapshot().openDialogs.find((d) => {
        return d.id === id;
      });
      if (open) {
        return open;
      }
      const entry = registry.get(id);
      // A registered-but-closed modal is never the foreground — topId undefined.
      return entry ? toModalInfo(id, entry, undefined) : toUnregisteredModalInfo(id);
    },

    exists(id: string): boolean {
      return registry.has(id);
    },

    getForeground(): RegisteredModalInfo | undefined {
      return snapshotStore.getSnapshot().foreground;
    },

    getOpen(filter?: 'modal' | 'non-modal'): RegisteredModalInfo[] {
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

    getClosed(): RegisteredModalInfo[] {
      const result: RegisteredModalInfo[] = [];
      for (const [id, entry] of registry) {
        if (entry.store.getSnapshot().phase === 'closed') {
          result.push(toModalInfo(id, entry, undefined));
        }
      }
      return result;
    },

    getRegisteredCount(): number {
      return registry.size;
    },
  };

  function lookup(): ModalLookup;
  function lookup(id: string): ModalInfo;
  function lookup(id?: string): ModalLookup | ModalInfo {
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

  // ── Public API (facade) ───────────────────────────────────────────────────

  return {
    register,
    unregister,

    open(id: string): void {
      const entry = registry.get(id);
      if (!entry) {
        log.warn('Open skipped (not registered)', { id });
        return;
      }
      entry.store.beginOpen();
    },

    requestOpen(id: string, request: OpenRequest = {}): void {
      // The fire-and-forget door. Deliberately not `void dispatchOpenRequest(...)` at the call
      // site of every caller: this one exists so ignoring the answer stays a one-word call.
      void dispatchOpenRequest(id, request);
    },

    requestOpenAndWait(id: string, request: OpenRequest = {}): Promise<OpenRequestOutcome> {
      return dispatchOpenRequest(id, request);
    },

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

    Z_INDEX_BASE,

    getZIndex(id: string): number {
      // openDialogs is already in stack order — the index *is* the stack position.
      const index = snapshotStore.getSnapshot().openDialogs.findIndex((d) => {
        return d.id === id;
      });
      return Z_INDEX_BASE + (index >= 0 ? index : 0);
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
