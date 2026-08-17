// ── Mutex ─────────────────────────────────────────────────────────────────────

/** Runs one task at a time; see {@link createMutex}. */
export type Mutex = <T>(task: (() => Promise<T>) | Promise<T>) => Promise<T>;

/**
 * Serializes async tasks: each runs only after the previous settles, and a rejection does not break
 * the chain.
 *
 * @example
 * const lock = createMutex();
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
