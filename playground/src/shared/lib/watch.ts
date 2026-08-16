import type { StoreContract } from 'umbra';

// ── watch ─────────────────────────────────────────────────────────────────────

/** What {@link watch} observes, and what it does about it. */
export type WatchOptions<TSnapshot, TSlice> = {
  /** The slice of the snapshot to watch. */
  readonly select: (snapshot: TSnapshot) => TSlice;
  /** Called with the new slice and the one it replaced, whenever they differ. */
  readonly onChange: (next: TSlice, prev: TSlice) => void;
  /** Decide whether the slice changed. Default `Object.is`. */
  readonly equals?: ((a: TSlice, b: TSlice) => boolean) | undefined;
};

/**
 * Observe a store outside React: fires `onChange(next, prev)` whenever the
 * selected slice changes. Returns an unsubscribe function. Zero React imports.
 *
 * @example
 * // Outside React: react to one slice, ignore the rest of the snapshot.
 * const stop = watch(cartStore, {
 *   select: (s) => s.items.length,
 *   onChange: (count, previous) => analytics.track('cart_size', { count, previous }),
 * });
 * stop();
 */
export function watch<TSnapshot, TSlice>(
  store: StoreContract<TSnapshot>,
  options: WatchOptions<TSnapshot, TSlice>
): () => void {
  const { select, onChange } = options;
  const equals = options.equals ?? Object.is;
  let prev = select(store.getSnapshot());
  return store.subscribe(() => {
    const next = select(store.getSnapshot());
    if (!equals(prev, next)) {
      const old = prev;
      prev = next;
      onChange(next, old);
    }
  });
}
