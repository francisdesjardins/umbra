import { normalizeError } from 'umbra';

// ── Async state ───────────────────────────────────────────────────────────────
// The lifecycle of an async value as a tagged union, POJO-safe: no promises or class instances
// live in the state, so a store snapshot can hold it.

/** Nothing has been requested yet. */
export type AsyncIdle = {
  readonly status: 'idle';
};
/** A request is in flight. */
export type AsyncPending = {
  readonly status: 'pending';
};
/** The request settled with a value. */
export type AsyncFulfilled<T> = {
  readonly status: 'fulfilled';
  readonly data: T;
};
/** The request threw; the reason is normalised to an `Error`. */
export type AsyncRejected = {
  readonly status: 'rejected';
  readonly error: Error;
};

/** The lifecycle of an async value, as a tagged union you can hold in a snapshot. */
export type AsyncState<T> = AsyncIdle | AsyncPending | AsyncFulfilled<T> | AsyncRejected;

/** Shared `idle` sentinel — one identity, so `state === asyncIdle` is a valid check. */
export const asyncIdle: AsyncIdle = { status: 'idle' };
/** Shared `pending` sentinel — same deal. */
export const asyncPending: AsyncPending = { status: 'pending' };

/** Wrap a settled value: `store.set((s) => ({ ...s, user: asyncFulfilled(user) }))`. */
export function asyncFulfilled<T>(data: T): AsyncFulfilled<T> {
  return { status: 'fulfilled', data };
}

/** Wrap a failure, normalising anything thrown into an `Error`. */
export function asyncRejected(error: unknown): AsyncRejected {
  return { status: 'rejected', error: normalizeError(error) };
}

/**
 * Run an async task and drive an `AsyncState` machine through `onState`: `pending` →
 * `fulfilled(data)` or `rejected(error)`. Returns the terminal state.
 *
 * @example
 * await runAsync(
 *   () => api.fetchUser(id),
 *   (state) => store.set((s) => ({ ...s, user: state }))
 * );
 */
export async function runAsync<T>(
  task: () => Promise<T>,
  onState: (state: AsyncState<T>) => void
): Promise<AsyncFulfilled<T> | AsyncRejected> {
  onState(asyncPending);
  try {
    const state = asyncFulfilled(await task());
    onState(state);
    return state;
  } catch (err) {
    const state = asyncRejected(err);
    onState(state);
    return state;
  }
}
