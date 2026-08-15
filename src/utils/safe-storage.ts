/**
 * Web Storage that answers instead of throwing, and is asked for at most once.
 *
 * Every way of reaching `localStorage` can fail, and each one fails differently — which is why
 * this is a decision rather than three `try` blocks at the call sites:
 *
 * - **There is no storage.** A server render, a worker, a Node process. Asking `globalThis` for it
 *   is the caller's job, because *how* to ask without waking a warning is environment-specific.
 * - **Reaching it throws.** A sandboxed `<iframe>` without `allow-same-origin`, or a browser with
 *   storage blocked outright, raises a `SecurityError` on the property access itself.
 * - **It exists and refuses anyway.** A quota exceeded on write, a permission revoked between two
 *   reads. The probe already succeeded, so nothing earlier can catch this.
 *
 * A dialog manager has no business crashing in any of them, and a debug logger has no business
 * printing a warning in any of them either. So the whole surface is three methods that cannot
 * fail: a read answers `null`, a write and a remove are no-ops.
 *
 * **The probe runs once, and once means once — including when it answers nothing.** Re-asking is
 * not free: Node exposes `localStorage` as a getter that emits a process warning unless the
 * process was started with `--localstorage-file`, and nothing throws, so no `try` can quiet it —
 * only not looking again can. Remembering *absence* is therefore the case that matters most, and
 * it is the one a `undefined`-means-unasked sentinel gets wrong: a `window` shim with no storage
 * on it answers `undefined`, which reads as "not asked yet" and re-probes forever. The flag below
 * is separate from the value for exactly that reason.
 */

/** What this needs of a storage — the three methods it calls, so a fake is three functions. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Storage access with every failure already answered. */
export type SafeStorage = {
  /** The stored value, or `null` — for an absent key, an absent storage, or a refused read. */
  readonly read: (key: string) => string | null;
  /** Store a value, or do nothing at all if the storage will not take it. */
  readonly write: (key: string, value: string) => void;
  /** Drop a key, or do nothing at all. */
  readonly remove: (key: string) => void;
};

/**
 * Wrap a way of reaching storage in one that cannot fail.
 *
 * @param probe - How to obtain the storage. Called at most once, allowed to throw, and allowed to
 *   answer `null` or `undefined` — all three mean the same thing to everything downstream, and all
 *   three are remembered. Keep it to the environment question; the failure handling is here.
 *
 * @example
 * const storage = createSafeStorage(() => {
 *   return typeof globalThis.window === 'undefined' ? null : globalThis.localStorage;
 * });
 * storage.write('key', 'value');
 */
export function createSafeStorage(probe: () => StorageLike | null | undefined): SafeStorage {
  let resolved: StorageLike | null = null;
  let probed = false;

  function target(): StorageLike | null {
    if (!probed) {
      // Set before the call, not after, so a probe that throws is still a probe that happened.
      probed = true;
      try {
        resolved = probe() ?? null;
      } catch {
        resolved = null;
      }
    }
    return resolved;
  }

  return {
    read(key) {
      try {
        return target()?.getItem(key) ?? null;
      } catch {
        // Reading can fail after the probe succeeded — a permission that changed under us.
        return null;
      }
    },
    write(key, value) {
      try {
        target()?.setItem(key, value);
      } catch {
        // A full quota, or private mode. The setting is still live for this session; only its
        // survival across a reload is lost, and that is not worth an exception to the caller.
      }
    },
    remove(key) {
      try {
        target()?.removeItem(key);
      } catch {
        // Storage present but refusing the write.
      }
    },
  };
}
