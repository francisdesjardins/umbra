import { createStore, useStore } from 'umbra/react';
import { asyncIdle, runAsync, type AsyncState } from './async-state';
import { createSingleFlight } from './single-flight';

// ── A useQuery stand-in ──────────────────────────────────────────────────────
//
// Same shape as the real thing (`{ data, isFetching, refetch }`) so an example can show how one
// marries the modal lifecycle, without the playground taking a dependency for it. Built from
// primitives the library already ships, so swapping in React Query changes the import and
// nothing about the pattern at the call site.

/** Declared at module scope so nothing is created during a render. */
export type Query<T> = {
  readonly store: { subscribe: (l: () => void) => () => void; getSnapshot: () => AsyncState<T> };
  /** Concurrent callers share one in-flight request. */
  readonly refetch: () => Promise<AsyncState<T>>;
  readonly invalidate: () => void;
  /** The cheap check an `onOpen` makes before awaiting. */
  readonly isCached: () => boolean;
};

export function createQuery<T>(fetcher: () => Promise<T>): Query<T> {
  const store = createStore<AsyncState<T>>(asyncIdle);
  const flight = createSingleFlight();

  return {
    store,
    refetch: () => {
      return flight(() => {
        return runAsync(fetcher, (state) => {
          store.set(state);
        });
      });
    },
    invalidate: () => {
      store.reset();
    },
    isCached: () => {
      return store.getSnapshot().status === 'fulfilled';
    },
  };
}

/** Subscribes; never starts a fetch. */
export function useQuery<T>(query: Query<T>) {
  const state = useStore(query.store);

  return {
    data: state.status === 'fulfilled' ? state.data : undefined,
    error: state.status === 'rejected' ? state.error : undefined,
    /** True for a background refetch too, not just the first load. */
    isFetching: state.status === 'pending',
    isSuccess: state.status === 'fulfilled',
    refetch: query.refetch,
    invalidate: query.invalidate,
  };
}
