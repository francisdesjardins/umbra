import { normalizeError } from './normalize-error.js';

/**
 * Fire-and-forget an async callback with error normalization, replacing the repeated
 * `void (async () => { try { … } catch { normalizeError } })()` pattern; each call site brings its
 * own `onError` for context-specific logging.
 *
 * @param fn - Async (or sync) callback to execute
 * @param handlers - What to do when it fails, and what to do either way.
 *
 * @internal
 */
export type FireAndForgetHandlers = {
  /** Called with the normalized `Error` if `fn` throws. */
  readonly onError: (error: Error) => void;
  /** Called in `finally`, regardless of success or failure. */
  readonly onSettled?: (() => void) | undefined;
};

export function fireAndForget(
  fn: () => void | Promise<void>,
  handlers: FireAndForgetHandlers
): void {
  const { onError, onSettled } = handlers;
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
