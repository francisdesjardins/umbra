// ── Store module ──────────────────────────────────────────────────────────────
//
// A tiny reactive cell with a stable, framework-agnostic contract (`subscribe`/`getSnapshot`),
// hand-rolled with zero runtime dependencies — the single swap point for the state layer.
// Snapshots are plain POJOs with methods beside the state and never inside it, which keeps
// `getSnapshot()` clone-safe and selector-stable.

/**
 * Minimal read-only contract satisfied by every store — and precisely the surface
 * `useSyncExternalStore` consumes, so reading a store needs no adapter from us.
 */
export type StoreContract<TSnapshot> = {
  /** Register a listener; returns its unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Read the current snapshot. */
  readonly getSnapshot: () => TSnapshot;
};

/** API handed to the `builder` callback of {@link createStore}. */
export type StoreApi<TSnapshot, TContext = never> = {
  /** Current snapshot. */
  readonly get: () => TSnapshot;
  /** Replace the snapshot, or derive it from the previous one. */
  readonly set: (next: TSnapshot | ((prev: TSnapshot) => TSnapshot)) => void;
  /** Restore the baseline, or commit a new one. */
  readonly reset: (next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)) => void;
  /** The dependencies injected at construction via `{ context }`. */
  readonly getContext: () => TContext;
};

type StoreBase<TSnapshot> = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TSnapshot;
};

/**
 * A domain store: the contract plus exactly the methods your builder returns — `set`/`reset` are
 * **not** exposed here, only through the builder's `api`, so `reset` on the instance means defining
 * one (`reset() { api.reset(); }`). Methods merge flat at the root (`store.load()`), zustand-style;
 * namespacing (`{ ui: { … } }` → `store.ui.…`) works too.
 */
export type Store<TSnapshot, TMethods> = StoreBase<TSnapshot> & TMethods;

/** A store with no builder — the built-in generic mutators are exposed directly. */
export type GenericStore<TSnapshot> = StoreBase<TSnapshot> & {
  /** Replace the snapshot, or derive it from the previous one. */
  readonly set: (next: TSnapshot | ((prev: TSnapshot) => TSnapshot)) => void;
  /** Restore the baseline, or commit a new one. */
  readonly reset: (next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)) => void;
};

/**
 * Options accepted by {@link createStore}. `context` is a builder concept, read back through
 * `api.getContext()`, so the builderless overload accepts `equals` alone rather than a dependency
 * nothing could read.
 */
export type CreateStoreOptions<TSnapshot, TContext = never> = {
  /** Skip notifying when the next snapshot is equal. Default `Object.is`. */
  readonly equals?: ((a: TSnapshot, b: TSnapshot) => boolean) | undefined;
  /** Dependencies the builder's methods read via `getContext()`. */
  readonly context?: TContext | undefined;
};

/**
 * The **domain** form's options: the builder, plus everything the generic form takes. `builder` is
 * required, and that is what tells the two forms apart — see the overloads on {@link createStore}.
 */
export type CreateDomainStoreOptions<TSnapshot, TMethods, TContext = never> = CreateStoreOptions<
  TSnapshot,
  TContext
> & {
  /** Returns the store's methods; they merge flat at the root, zustand-style. */
  readonly builder: (api: StoreApi<TSnapshot, TContext>) => TMethods;
};

// ── Reactive cell ─────────────────────────────────────────────────────────────

/** The minimal observable state holder that backs every store. */
type Cell<TSnapshot> = {
  readonly getState: () => TSnapshot;
  readonly setState: (next: TSnapshot) => void;
  readonly subscribe: (listener: () => void) => () => void;
};

function createCell<TSnapshot>(initial: TSnapshot): Cell<TSnapshot> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => {
      return state;
    },
    setState: (next) => {
      state = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a reactive store, in one of two modes told apart by whether the options carry a `builder`:
 * **generic** (`createStore(initial)`) exposes the built-in `set`/`reset` on the instance, for a
 * plain reactive cell; **domain** (`createStore(initial, { builder })`) exposes only the builder's
 * methods, with the mutators reachable through its `api` argument.
 *
 * @example
 * const counter = createStore(
 *   { count: 0 },
 *   {
 *     builder: ({ set }) => ({
 *       increment() {
 *         set((s) => ({ ...s, count: s.count + 1 }));
 *       },
 *     }),
 *   }
 * );
 *
 * counter.increment();
 * counter.getSnapshot(); // { count: 1 }
 */
export function createStore<TSnapshot, TMethods extends Record<string, unknown>, TContext = never>(
  initialSnapshot: TSnapshot,
  options: CreateDomainStoreOptions<TSnapshot, TMethods, TContext>
): Store<TSnapshot, TMethods>;
export function createStore<TSnapshot>(
  initialSnapshot: TSnapshot,
  options?: Omit<CreateStoreOptions<TSnapshot>, 'context'>
): GenericStore<TSnapshot>;
export function createStore<TSnapshot, TContext = never>(
  initialSnapshot: TSnapshot,
  options?:
    | CreateStoreOptions<TSnapshot, TContext>
    | CreateDomainStoreOptions<TSnapshot, Record<string, unknown>, TContext>
): unknown {
  const builder = options !== undefined && 'builder' in options ? options.builder : undefined;
  const equals = options?.equals ?? Object.is;

  const cell = createCell(initialSnapshot);

  let baseline = initialSnapshot;
  const contextCell = { value: options?.context as TContext };

  const commit = (next: TSnapshot): void => {
    if (equals(cell.getState(), next)) {
      return;
    }
    cell.setState(next);
  };

  const get = (): TSnapshot => {
    return cell.getState();
  };

  const set = (next: TSnapshot | ((prev: TSnapshot) => TSnapshot)): void => {
    commit(typeof next === 'function' ? (next as (p: TSnapshot) => TSnapshot)(get()) : next);
  };

  const reset = (next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)): void => {
    if (next === undefined) {
      commit(baseline);
      return;
    }
    baseline = typeof next === 'function' ? (next as (i: TSnapshot) => TSnapshot)(baseline) : next;
    commit(baseline);
  };

  const base = {
    subscribe: (listener: () => void): (() => void) => {
      return cell.subscribe(listener);
    },
    getSnapshot: get,
  };

  if (!builder) {
    return { ...base, set, reset };
  }

  const methods = builder({
    get,
    set,
    reset,
    getContext: () => {
      return contextCell.value;
    },
  });
  // The contract (subscribe/getSnapshot) always wins over a same-named method — no reserved-key
  // list, no runtime throw.
  return { ...methods, ...base };
}
