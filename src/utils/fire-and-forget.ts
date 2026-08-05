import { normalizeError } from './normalize-error.js';

/**
 * Fire-and-forget an async callback with error normalization.
 *
 * Replaces the repeated `void (async () => { try { … } catch { normalizeError } })()` pattern.
 * Each call site provides its own `onError` handler for context-specific logging.
 *
 * @param fn - Async (or sync) callback to execute
 * @param onError - Called with the normalized `Error` if `fn` throws
 * @param onSettled - Called in `finally` regardless of success or failure
 *
 * @internal
 */
export function fireAndForget(
  fn: () => void | Promise<void>,
  onError: (error: Error) => void,
  onSettled?: () => void
): void {
  void (async () => {
    try {
      await fn();
    } catch (err: unknown) {
      onError(normalizeError(err));
    } finally {
      onSettled?.();
    }
  })();
}
