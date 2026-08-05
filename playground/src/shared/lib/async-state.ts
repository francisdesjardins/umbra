import { normalizeError } from 'umbra';

// ── Async state ───────────────────────────────────────────────────────────────
// A tagged-union sentinel for representing the lifecycle of an async value in a
// store snapshot. POJO-safe: no promises or class instances live in the state.

/** Nothing has been requested yet. */
export type AsyncIdle = {
  /** Discriminant. */
  readonly status: 'idle';
};
/** A request is in flight. */
export type AsyncPending = {
  /** Discriminant. */
  readonly status: 'pending';
};
/** The request settled with a value. */
export type AsyncFulfilled<T> = {
  /** Discriminant. */
  readonly status: 'fulfilled';
  /** The settled value. */
  readonly data: T;
};
/** The request threw; the reason is normalised to an `Error`. */
export type AsyncRejected = {
  /** Discriminant. */
  readonly status: 'rejected';
  /** Normalised from whatever was thrown. */
  readonly error: Error;
};

/** The lifecycle of an async value, as a tagged union you can hold in a snapshot. */
export type AsyncState<T> = AsyncIdle | AsyncPending | AsyncFulfilled<T> | AsyncRejected;

/** Shared `idle` sentinel — one identity, so `state === asyncIdle` is a valid check. */
export const asyncIdle: AsyncIdle = { status: 'idle' };
/** Shared `pending` sentinel — same deal. */
export const asyncPending: AsyncPending = { status: 'pending' };

/**
 * Wrap a settled value.
 *
 * @example
 * store.set((s) => ({ ...s, user: asyncFulfilled(user) }));
 */
export function asyncFulfilled<T>(data: T): AsyncFulfilled<T> {
  return { status: 'fulfilled', data };
}

/**
 * Wrap a failure, normalising anything thrown into an `Error`.
 *
 * @example
 * store.set((s) => ({ ...s, user: asyncRejected(new Error('offline')) }));
 */
export function asyncRejected(error: unknown): AsyncRejected {
  return { status: 'rejected', error: normalizeError(error) };
}

/**
 * Run an async task and drive an `AsyncState` machine through `onState`:
 * `pending` → `fulfilled(data)` or `rejected(error)`. Returns the terminal state.
 *
 * @example
 * // Drive a store field through the whole lifecycle in one call.
 * await runAsync(
 *   () => api.fetchUser(id),
 *   (state) => store.set((s) => ({ ...s, user: state }))
 * );
 * // store.getSnapshot().user is now `fulfilled` or `rejected`
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
