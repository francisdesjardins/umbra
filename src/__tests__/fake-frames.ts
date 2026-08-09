/**
 * A controllable `requestAnimationFrame`, for the unit project.
 *
 * Node has no rAF at all, so these are *installed* rather than replaced — and that is the first
 * reason this is shared rather than copied: a second copy that forgot the save/restore would
 * leak a fake frame queue into every test that ran after it. The second reason is that frames
 * advance only when a test says so, which is what makes the modal store's open sequence
 * assertable without waiting on a real frame.
 */

export type FrameControl = {
  readonly flush: () => void;
  readonly pending: () => number;
  readonly restore: () => void;
};

export const installFakeFrames = (): FrameControl => {
  // Node has no rAF, so these are installed rather than replaced. `Record` keeps the
  // save/restore assignable under `exactOptionalPropertyTypes`, where writing back an
  // `undefined` original to an optional property is an error.
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
