// ── Single-flight ─────────────────────────────────────────────────────────────

/** Which call wins when a second arrives mid-flight. */
export type SingleFlightMode = 'first' | 'last';

/** Options for {@link createSingleFlight}. */
export type SingleFlightOptions = {
  /** `'first'` shares the in-flight call; `'last'` cancels and supersedes it. */
  readonly mode?: SingleFlightMode | undefined;
};

/** Deduplicates concurrent calls; see {@link createSingleFlight}. */
export type SingleFlight = <T>(task: (signal: AbortSignal) => Promise<T>) => Promise<T>;

/**
 * Deduplicates concurrent async calls.
 *
 * - `'first'` (default): while a call is in flight, later callers share its result.
 * - `'last'`: each new call aborts the previous one; all callers resolve to the
 *   latest call's result.
 *
 * @example
 * const flight = createSingleFlight();
 * // Three callers at once; one request goes out and all three get its result.
 * const [a, b, c] = await Promise.all([flight(load), flight(load), flight(load)]);
 *
 * @example
 * // `'last'` suits a search box: each keystroke aborts the request before it.
 * const search = createSingleFlight({ mode: 'last' });
 * const hits = await search((signal) => fetch(url, { signal }).then((r) => r.json()));
 */
export function createSingleFlight(options?: SingleFlightOptions): SingleFlight {
  const mode = options?.mode ?? 'first';

  if (mode === 'first') {
    let inflight: Promise<unknown> | null = null;
    return <T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      if (inflight === null) {
        inflight = task(new AbortController().signal).finally(() => {
          inflight = null;
        });
      }
      return inflight as Promise<T>;
    };
  }

  let controller: AbortController | null = null;
  let resolve: ((value: unknown) => void) | null = null;
  let reject: ((reason: unknown) => void) | null = null;
  let deferred: Promise<unknown> | null = null;
  let generation = 0;

  return <T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    controller?.abort();
    controller = new AbortController();
    if (deferred === null) {
      deferred = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
    }
    const myGen = ++generation;
    task(controller.signal).then(
      (value) => {
        if (myGen !== generation) {
          return;
        }
        deferred = null;
        controller = null;
        resolve?.(value);
        resolve = null;
        reject = null;
      },
      (err: unknown) => {
        if (myGen !== generation) {
          return;
        }
        deferred = null;
        controller = null;
        reject?.(err);
        resolve = null;
        reject = null;
      }
    );
    return deferred as Promise<T>;
  };
}
