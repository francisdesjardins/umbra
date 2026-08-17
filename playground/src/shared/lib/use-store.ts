import { useRef, useSyncExternalStore } from 'react';
import type { StoreContract } from 'umbra/react';

export type UseStoreOptions<TSnapshot, TSlice> = {
  /** Narrow the snapshot to the slice this component needs. */
  readonly select?: ((snapshot: TSnapshot) => TSlice) | undefined;
  /** Decide whether the slice changed. Default `Object.is`. */
  readonly equals?: ((a: TSlice, b: TSlice) => boolean) | undefined;
};

/**
 * Subscribe to a store from React via `useSyncExternalStore`. Three forms: `useStore(store)` for
 * the whole snapshot, `useStore(store, (s) => s.slice)` for a referentially stable slice, and
 * `useStore(store, { select, equals })` for custom equality.
 *
 * Read-only, deliberately: injection belongs at construction (`createStore(initial, builder,
 * { context })`) or to a provider-scoped store (`createStoreContext`), because a render-time
 * mutation is one React may run twice, discard or interleave — last-render-wins with two consumers.
 *
 * @example
 * const view = useStore(cartStore, { select: (s) => s.total, equals: shallowEqual });
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

  // Cache the slice so identical selections keep referential identity — required for
  // `useSyncExternalStore` to avoid infinite loops on object slices. Written only inside the
  // closures below, never in the render body, so React Compiler's ref rules hold.
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
