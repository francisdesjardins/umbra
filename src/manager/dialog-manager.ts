// Deliberately the concrete module, not the `../store` barrel — the documented exception to
// the barrel-only rule (see src/CLAUDE.md). This module is the root of the package's own
// entry point, which must resolve without React, and the `../store` barrel re-exports
// `useStore` and `createStoreContext`, both of which import React. Importing the barrel here
// would leave the React-free property standing on Rollup tree-shaking the unused re-exports
// back out — true of the built artifact, but a build-time accident rather than a guarantee.
// `store/create-store` has no imports at all, so this edge keeps it structural.
// Pinned by __tests__/root-react-free.test.ts.
import { createStore } from '../store/index.js';
import type { ModalStoreSnapshot } from '../core/types.js';
import { createLogger } from '../utils/logger.js';
import { BODY_LOCK_ATTR, lockBodyScroll, unlockBodyScroll } from './scroll-lock.js';
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
  readonly requestOpen: () => void;
  // A method, not a property: a modal that narrows its reasons still satisfies the port.
  close(reason: string): boolean;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => ModalStoreSnapshot;
};

/**
 * Events emitted by the dialog manager.
 */
export type DialogManagerEvent =
  | {
      /** Fires once the modal is open and its `onOpen` has settled. */
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
 * @example
 * // `event.detail` is typed: the library augments `DocumentEventMap`, so no cast.
 * document.addEventListener(MODAL_OPEN_EVENT, (event) => {
 *   analytics.track('modal_shown', { id: event.detail.id, type: event.detail.modalType });
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
  /** The label its creator gave it — see `ModalInfo.modalType`. */
  readonly modalType: string;
  /** `Date.now()` recorded as the opening sequence started. */
  readonly openedAt: number;
};

/** Payload for the `modal:close` CustomEvent detail. */
export type ModalCloseEventDetail = {
  /** The modal's id. */
  readonly id: string;
  /** The label its creator gave it — see `ModalInfo.modalType`. */
  readonly modalType: string;
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
 * blocking vs non-blocking via `ModalInfo.nonModal`, and stack position via
 * array index (the array is ordered bottom to top by open sequence).
 */
export type DialogManagerSnapshot = {
  /** Open modals (modal and nonModal), in open order — index = stack position. */
  readonly openDialogs: readonly RegisteredModalInfo[];
  /** The topmost (most recently opened) modal, or undefined if none open. */
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
  register(id: string, store: RegisteredStore, modalType?: string, nonModal?: boolean): void;

  /** Unregister a modal store. Called internally by useModal. */
  unregister(id: string): void;

  /** Open a modal imperatively by id. */
  open(id: string): void;

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

  /** Base z-index for dialog stacking. */
  readonly Z_INDEX_BASE: number;

  /**
   * The computed z-index for a modal: `Z_INDEX_BASE` + its position in the open stack.
   *
   * A modal that is not open has no stack position, so it gets the base — the same value the
   * bottom-most open modal would get. That is the useful answer for the only caller that
   * matters: the dialog is stamped at `show()` time, when it is already in the stack, and a
   * closed dialog's stale z-index is never consulted.
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

let stylesheet: CSSStyleSheet | null = null;

function ensureStyles() {
  if (typeof document === 'undefined') {
    return;
  }

  if (stylesheet) {
    return;
  }

  stylesheet = new CSSStyleSheet();
  // The scrollbar-width compensation itself is an inline style set by `lockBodyScroll()` —
  // it has to be measured at lock time and added to the page's own padding, which CSS
  // cannot express. Only the overflow rule lives here.
  // The one piece of appearance the library ships, and it is a custom property so overriding
  // it is a declaration rather than a specificity fight: set `--dialog-backdrop` anywhere above
  // the dialog (`:root`, a theme class, the dialog itself) and this rule picks it up.
  stylesheet.replaceSync(`
    body[${BODY_LOCK_ATTR}] {
      overflow: hidden;
    }
    dialog::backdrop {
      background: var(--dialog-backdrop, rgba(0, 0, 0, 0.7));
    }
  `);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, stylesheet];
}

// ── Store registry types ────────────────────────────────────────────────────

type RegistryEntry = {
  readonly store: RegisteredStore;
  readonly unsubscribe: () => void;
  readonly modalType: string;
  readonly nonModal: boolean;
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
  readonly openSeq: number;
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
 * const dm = createDialogManager();
 * const stop = dm.subscribe((event) => analytics.track(event.type, { id: event.id }));
 */
export function createDialogManager(): DialogManager {
  const log = createLogger('manager');

  /** Identity this instance claims the global body scroll lock under — see `scroll-lock.ts`. */
  const lockOwner = {};

  const registry = new Map<string, RegistryEntry>();
  const listeners = new Set<DialogManagerSubscriber>();
  /** Incremented on every open; see `RegistryEntry.openSeq`. */
  let openSequence = 0;
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
    const phase = entry.store.getSnapshot().phase;
    return {
      id,
      exists: true,
      phase,
      isOpen: phase !== 'closed',
      isForeground: id === topId,
      openedAt: entry.openedAt,
      modalType: entry.modalType,
      nonModal: entry.nonModal,
    };
  }

  /** Create a null-object default for an unregistered modal id. */
  function toDefaultModalInfo(id: string): UnregisteredModalInfo {
    return {
      id,
      exists: false,
      phase: 'closed',
      isOpen: false,
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
  function updateBodyOverflow() {
    if (typeof document === 'undefined') {
      return;
    }

    ensureStyles();

    // Non-modal dialogs never lock scrolling — only blocking (modal) ones do.
    const hasBlockingOpen = snapshotStore.getSnapshot().openDialogs.some((d) => {
      return !d.nonModal;
    });
    if (hasBlockingOpen) {
      lockBodyScroll(lockOwner);
    } else {
      unlockBodyScroll(lockOwner);
    }
  }

  // ── Snapshot computation ──────────────────────────────────────────────────

  /**
   * Build an immutable snapshot from the current registry state.
   *
   * `openDialogs` is sorted by `openSeq` (bottom of the stack first), so the array index
   * doubles as the stack position and the last element is the foreground modal. Not by
   * `openedAt` — see `RegistryEntry.openSeq` for why a wall clock cannot order this.
   */
  function computeSnapshot(): DialogManagerSnapshot {
    const openEntries = getOpenEntries().toSorted((a, b) => {
      return a.entry.openSeq - b.entry.openSeq;
    });
    const topId = openEntries.at(-1)?.id;

    const openDialogs = openEntries.map(({ id, entry }) => {
      return toModalInfo(id, entry, topId);
    });

    return {
      openDialogs,
      foreground: openDialogs.at(-1),
    };
  }

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Register a modal store with the registry. Called by `useModal` on mount.
   * Subscribes to the store's snapshot changes to track open/close transitions
   * and emit events to external listeners.
   */
  function register(
    id: string,
    store: RegisteredStore,
    modalType: string = 'modal',
    nonModal: boolean = false
  ) {
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
          registry.set(id, { ...entry, openedAt, openSeq: openSequence });
        }
        dispatchModalEvent(MODAL_OPEN_EVENT, { id, modalType, openedAt });
      }

      // ── Fully opened: phase is 'open' AND onOpen has completed ──
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
          modalType,
          reason,
          openedAt: entry?.openedAt ?? 0,
        });
      }

      prevPhase = phase;
      prevIsPreparing = isPreparing;
      // Recompute after every observed transition (including 'closing') so
      // the snapshot — which lookup() also reads — never lags the registry.
      notifyChange();
      updateBodyOverflow();
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
      modalType,
      nonModal,
      openedAt: 0,
      openSeq: 0,
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

    entry.unsubscribe();
    registry.delete(id);
    log('Unregistered', { id, registeredCount: registry.size });
    notifyChange();
    updateBodyOverflow();
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
      return entry ? toModalInfo(id, entry, undefined) : toDefaultModalInfo(id);
    },

    exists(id: string): boolean {
      return registry.has(id);
    },

    getForeground(): RegisteredModalInfo | undefined {
      return snapshotStore.getSnapshot().foreground;
    },

    getOpen(filter?: 'blocking' | 'non-blocking'): RegisteredModalInfo[] {
      const open = snapshotStore.getSnapshot().openDialogs;
      if (filter === 'blocking') {
        return open.filter((d) => {
          return !d.nonModal;
        });
      }
      if (filter === 'non-blocking') {
        return open.filter((d) => {
          return d.nonModal;
        });
      }
      return [...open];
    },

    // ── Per-modal queries ─────────────────────────────────────────────────

    isOpen(id: string): boolean {
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

  // ── Public API (facade) ───────────────────────────────────────────────────

  const Z_INDEX_BASE = 1300;

  return {
    register,
    unregister,

    open(id: string): void {
      const entry = registry.get(id);
      if (!entry) {
        log.warn('Open skipped (not registered)', { id });
        return;
      }
      entry.store.requestOpen();
    },

    close(id: string, reason: string = 'dismiss'): void {
      const entry = registry.get(id);
      if (!entry) {
        log.warn('Close skipped (not registered)', { id });
        return;
      }
      entry.store.close(reason);
    },

    lookup,

    Z_INDEX_BASE,

    getZIndex(id: string): number {
      // openDialogs is sorted by open order — the index is the stack position.
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
 * if (dialogManager.lookup('unsaved-changes').isOpen) {
 *   dialogManager.close('unsaved-changes', 'navigated-away');
 * }
 */
export const dialogManager = createDialogManager();
