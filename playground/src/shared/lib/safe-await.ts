import { normalizeError } from 'umbra';

// ── safeAwait ─────────────────────────────────────────────────────────────────

/** Go-style `[error, value]` tuple: exactly one side is non-null. */
export type SafeAwaitResult<T> =
  readonly [error: null, value: T] | readonly [error: Error, value: null];

/**
 * Await a promise without `try/catch`, returning a Go-style `[error, value]`
 * tuple. Exactly one element is non-null.
 *
 * @example
 * const [error, user] = await safeAwait(fetchUser(id));
 * if (error) {
 *   return showError(error.message);
 * }
 * render(user); // narrowed — `user` is not null here
 */
export async function safeAwait<T>(promise: Promise<T>): Promise<SafeAwaitResult<T>> {
  try {
    return [null, await promise];
  } catch (err) {
    return [normalizeError(err), null];
  }
}
