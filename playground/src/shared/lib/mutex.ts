// ── Mutex ─────────────────────────────────────────────────────────────────────

/** Runs one task at a time; see {@link createMutex}. */
export type Mutex = <T>(task: (() => Promise<T>) | Promise<T>) => Promise<T>;

/**
 * Creates a mutex that serializes async tasks: each task runs only after the
 * previous one settles. Rejections don't break the chain.
 *
 * @example
 * const lock = createMutex();
 * // Two clicks, one save at a time — the second waits for the first to settle.
 * await Promise.all([lock(() => save(a)), lock(() => save(b))]);
 */
export function createMutex(): Mutex {
  let gate: Promise<unknown> = Promise.resolve();
  return <T>(task: (() => Promise<T>) | Promise<T>): Promise<T> => {
    const execution = gate.then(() => {
      return typeof task === 'function' ? task() : task;
    });
    gate = execution.then(
      () => {},
      () => {}
    );
    return execution;
  };
}
