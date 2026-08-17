/**
 * A controllable `requestAnimationFrame` for the unit project, shared so no copy forgets the
 * save/restore and leaks a fake queue into later tests. Frames advance only when a test says so.
 */

export type FrameControl = {
  readonly flush: () => void;
  readonly pending: () => number;
  readonly restore: () => void;
};

export const installFakeFrames = (): FrameControl => {
  // Node has no rAF, so these are installed rather than replaced. `Record` keeps save/restore
  // assignable under `exactOptionalPropertyTypes`, which rejects writing an `undefined` back.
  const globals = globalThis as unknown as Record<string, unknown>;
  const originalRequest = globals['requestAnimationFrame'];
  const originalCancel = globals['cancelAnimationFrame'];

  let nextHandle = 1;
  const queue = new Map<number, FrameRequestCallback>();

  globals['requestAnimationFrame'] = (cb: FrameRequestCallback): number => {
    const handle = nextHandle++;
    queue.set(handle, cb);
    return handle;
  };
  globals['cancelAnimationFrame'] = (handle: number): void => {
    queue.delete(handle);
  };

  return {
    flush: () => {
      const callbacks = [...queue.values()];
      queue.clear();
      for (const cb of callbacks) {
        cb(0);
      }
    },
    pending: () => {
      return queue.size;
    },
    restore: () => {
      globals['requestAnimationFrame'] = originalRequest;
      globals['cancelAnimationFrame'] = originalCancel;
    },
  };
};
