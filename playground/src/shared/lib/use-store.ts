import { useRef, useSyncExternalStore } from 'react';
import type { StoreContract } from 'umbra/react';

// ── useStore ──────────────────────────────────────────────────────────────────

/** Options for the object form of {@link useStore}. */
export type UseStoreOptions<TSnapshot, TSlice> = {
  /** Narrow the snapshot to the slice this component needs. */
  readonly select?: ((snapshot: TSnapshot) => TSlice) | undefined;
  /** Decide whether the slice changed. Default `Object.is`. */
  readonly equals?: ((a: TSlice, b: TSlice) => boolean) | undefined;
};

/**
 * Subscribe to a store from React via `useSyncExternalStore`.
 *
 * Overloads:
 * - `useStore(store)` — the whole snapshot
 * - `useStore(store, (s) => s.slice)` — a selected slice (referentially stable)
 * - `useStore(store, { select, equals })` — a slice with custom equality
 *
 * Read-only, deliberately: this hook never writes to the store during render. Dependency
 * injection belongs at construction (`createStore(initial, builder, { context })`) or to a
 * provider-scoped store (`createStoreContext`) — both pure. Injecting into a shared store from
 * a render is a mutation React is allowed to run twice, discard, or interleave, and with two
 * consumers it is last-render-wins.
 *
 * @example
 * const snapshot = useStore(cartStore);
 * const count = useStore(cartStore, (s) => s.items.length);
 * const view = useStore(cartStore, {
 *   select: (s) => ({ id: s.id, total: s.total }),
 *   equals: shallowEqual,
 * });
 */
export function useStore<TSnapshot>(store: StoreContract<TSnapshot>): TSnapshot;
export function useStore<TSnapshot, TSlice>(
  store: StoreContract<TSnapshot>,
  selectOrOptions: ((snapshot: TSnapshot) => TSlice) | UseStoreOptions<TSnapshot, TSlice>
): TSlice;
export function useStore<TSnapshot, TSlice>(
  store: StoreContract<TSnapshot>,
  arg2?: ((snapshot: TSnapshot) => TSlice) | UseStoreOptions<TSnapshot, TSlice>
): TSnapshot | TSlice {
  const options = typeof arg2 === 'function' ? undefined : arg2;
  const select = typeof arg2 === 'function' ? arg2 : options?.select;
  const equals = options?.equals ?? Object.is;

  const selector =
    select ??
    ((snapshot: TSnapshot) => {
      return snapshot as unknown as TSlice;
    });

  // Cache the selected slice so identical selections keep referential identity —
  // required for `useSyncExternalStore` to avoid infinite loops on object slices.
  // The ref is only ever written inside the subscribe/getSnapshot closures below
  // (never in the render body), so React Compiler's ref rules are satisfied.
  const cache = useRef<TSlice>(selector(store.getSnapshot()));

  const subscribe = (listener: () => void): (() => void) => {
    return store.subscribe(() => {
      const next = selector(store.getSnapshot());
      if (!equals(cache.current, next)) {
        cache.current = next;
        listener();
      }
    });
  };

  const getSnapshot = (): TSlice => {
    const next = selector(store.getSnapshot());
    if (equals(cache.current, next)) {
      return cache.current;
    }
    cache.current = next;
    return cache.current;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
