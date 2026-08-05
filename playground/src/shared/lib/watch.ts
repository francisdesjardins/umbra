import type { StoreContract } from 'umbra';

// ── watch ─────────────────────────────────────────────────────────────────────

/** Options for {@link watch}. */
export type WatchOptions<TSlice> = {
  /** Decide whether the slice changed. Default `Object.is`. */
  readonly equals?: ((a: TSlice, b: TSlice) => boolean) | undefined;
};

/**
 * Observe a store outside React: fires `callback(next, prev)` whenever the
 * selected slice changes. Returns an unsubscribe function. Zero React imports.
 *
 * @example
 * // Outside React: react to one slice, ignore the rest of the snapshot.
 * const stop = watch(
 *   cartStore,
 *   (s) => s.items.length,
 *   (count, previous) => analytics.track('cart_size', { count, previous })
 * );
 * stop();
 */
export function watch<TSnapshot, TSlice>(
  store: StoreContract<TSnapshot>,
  select: (snapshot: TSnapshot) => TSlice,
  callback: (next: TSlice, prev: TSlice) => void,
  options?: WatchOptions<TSlice>
): () => void {
  const equals = options?.equals ?? Object.is;
  let prev = select(store.getSnapshot());
  return store.subscribe(() => {
    const next = select(store.getSnapshot());
    if (!equals(prev, next)) {
      const old = prev;
      prev = next;
      callback(next, old);
    }
  });
}
