/**
 * Coerces an unknown thrown value to an `Error` instance.
 * Pass-through for real `Error` objects; wraps anything else in `new Error(String(err))`.
 *
 * @example
 * try {
 *   await risky();
 * } catch (thrown) {
 *   // `thrown` is `unknown`, and a string or a number is a legal throw.
 *   log(normalizeError(thrown).message);
 * }
 */
export function normalizeError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
