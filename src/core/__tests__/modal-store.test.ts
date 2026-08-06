import { expect, test } from '@playwright/test';
import { createModalStore } from '../modal-store.js';
import type { WaitForCloseResult } from '../types.js';

/**
 * Unit coverage for the modal state machine.
 *
 * The store is the whole of `useModal`'s logic with React removed, so every transition here
 * is assertable without a browser, a component, or a `<dialog>`. Component tests exercise
 * these paths too, but only in combination — a broken edge shows up there as a mysterious
 * UI symptom, and here as one failing line.
 *
 * The store schedules its own animation frame, so these tests install a controllable
 * `requestAnimationFrame` rather than a real one: frames advance only when the test says so,
 * which is what makes the "close cancels a pending open frame" assertions deterministic.
 */

type FrameControl = {
  readonly flush: () => void;
  readonly pending: () => number;
  readonly restore: () => void;
};

const installFakeFrames = (): FrameControl => {
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

let frames: FrameControl;

test.beforeEach(() => {
  frames = installFakeFrames();
});

test.afterEach(() => {
  frames.restore();
});

// ── Opening ──────────────────────────────────────────────────────────────────

test.describe('createModalStore — opening', () => {
  test('starts closed and idle', () => {
    const store = createModalStore('t');
    expect(store.getSnapshot()).toEqual({ phase: 'closed', isPreparing: false, closeResult: null });
  });

  test('requestOpen from closed enters the opening phase', () => {
    const store = createModalStore('t');
    store.requestOpen();
    expect(store.getSnapshot().phase).toBe('opening');
    expect(store.getSnapshot().isPreparing).toBe(true);
  });

  test('requestOpen clears the previous closeResult', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.close('confirm');
    store.finalize();
    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm' });

    store.requestOpen();
    expect(store.getSnapshot().closeResult).toBeNull();
  });

  test('a second requestOpen joins the in-flight open rather than restarting it', () => {
    const store = createModalStore('t');
    let settled = 0;

    store.requestOpen(() => {
      settled++;
    });
    store.requestOpen(() => {
      settled++;
    });

    expect(settled).toBe(0);
    store.resolveOpen();
    // Both callers settle together when onOpen completes — neither hangs, neither double-fires.
    expect(settled).toBe(2);
  });

  test('requestOpen on an already-open modal settles immediately', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.scheduleOpenTransition();
    store.resolveOpen();
    frames.flush();
    expect(store.getSnapshot().phase).toBe('open');

    let settled = false;
    store.requestOpen(() => {
      settled = true;
    });
    // Regression: this used to hang, because no further transition was coming to release it.
    expect(settled).toBe(true);
  });

  test('requestOpen while closing settles immediately and queues no reopen', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.resolveOpen();
    store.close('dismiss');

    let settled = false;
    store.requestOpen(() => {
      settled = true;
    });
    expect(settled).toBe(true);
    expect(store.getSnapshot().phase).toBe('closing');
  });

  test('scheduleOpenTransition reaches open only on the next frame', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.scheduleOpenTransition();

    // Still 'opening' — the browser must paint the entrance start state first.
    expect(store.getSnapshot().phase).toBe('opening');
    frames.flush();
    expect(store.getSnapshot().phase).toBe('open');
  });

  test('scheduleOpenTransition twice leaves only one pending frame', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.scheduleOpenTransition();
    store.scheduleOpenTransition();
    expect(frames.pending()).toBe(1);
  });

  test('resolveOpen clears isPreparing without touching the phase', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.resolveOpen();
    expect(store.getSnapshot().isPreparing).toBe(false);
    expect(store.getSnapshot().phase).toBe('opening');
  });
});

// ── Closing ──────────────────────────────────────────────────────────────────

test.describe('createModalStore — closing', () => {
  test('close records the reason and enters the closing phase', () => {
    const store = createModalStore('t');
    store.requestOpen();
    expect(store.close('confirm')).toBe(true);
    expect(store.getSnapshot().phase).toBe('closing');
    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm' });
  });

  test('close carries a data payload only when one is given', () => {
    const withData = createModalStore('a');
    withData.requestOpen();
    withData.close('confirm', { id: 7 });
    expect(withData.getSnapshot().closeResult).toEqual({ reason: 'confirm', data: { id: 7 } });

    const withoutData = createModalStore('b');
    withoutData.requestOpen();
    withoutData.close('confirm');
    // No `data` key at all, rather than `data: undefined` — consumers destructure this.
    expect(Object.hasOwn(withoutData.getSnapshot().closeResult ?? {}, 'data')).toBe(false);
  });

  test('close is a no-op while already closing or closed', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.close('confirm');

    // Every dismissal path calls close() blindly; the second must not overwrite the reason.
    expect(store.close('dismiss')).toBe(false);
    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm' });

    store.finalize();
    expect(store.close('dismiss')).toBe(false);
  });

  test('close cancels a pending open frame', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.scheduleOpenTransition();
    expect(frames.pending()).toBe(1);

    store.close('dismiss');
    expect(frames.pending()).toBe(0);

    // The cancelled frame must not resurrect the modal into 'open' after it closed.
    frames.flush();
    expect(store.getSnapshot().phase).toBe('closing');
  });

  test('finalize resolves waitForClose with the close result', () => {
    const store = createModalStore('t');
    const settled: WaitForCloseResult<unknown>[] = [];
    store.addCloseResolver((result) => {
      settled.push(result);
    });

    store.requestOpen();
    store.close('confirm', 42);
    store.finalize();

    expect(settled).toEqual([[null, { reason: 'confirm', data: 42 }]]);
    expect(store.getSnapshot().phase).toBe('closed');
  });

  test('closeResult survives into the closed phase', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.close('confirm');
    store.finalize();

    // The dialog manager reads the reason after the transition to emit its close event.
    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm' });
  });

  test('abandon settles a waitForClose that will never happen', () => {
    const store = createModalStore('t');
    const settled: WaitForCloseResult<unknown>[] = [];
    store.addCloseResolver((result) => {
      settled.push(result);
    });

    // The modal is torn down having never opened. Without this, the promise returned by
    // `waitForClose()` stays pending for the life of the process: the awaiting code never
    // resumes and the resolver keeps its closure alive.
    store.abandon();

    expect(settled).toHaveLength(1);
    const [error, result] = settled[0] ?? [];
    expect(error).toBeInstanceOf(Error);
    expect(result).toBeNull();
  });

  test('abandon does not hand back a stale result from an earlier close', () => {
    const store = createModalStore('t');
    store.requestOpen();
    store.close('confirm');
    store.finalize();

    // `waitForClose()` called after a close waits for the *next* one. When that never comes,
    // it must report abandonment rather than replay the retained 'confirm' result.
    const settled: WaitForCloseResult<unknown>[] = [];
    store.addCloseResolver((result) => {
      settled.push(result);
    });
    store.abandon();

    expect(settled[0]?.[0]).toBeInstanceOf(Error);
    expect(settled[0]?.[1]).toBeNull();
  });

  test('abandon is harmless after a normal close settled the waiters', () => {
    const store = createModalStore('t');
    const settled: WaitForCloseResult<unknown>[] = [];
    store.addCloseResolver((result) => {
      settled.push(result);
    });

    store.requestOpen();
    store.close('confirm');
    store.finalize();
    store.abandon();

    // Teardown runs abandon() unconditionally, so it must not double-settle a resolved waiter.
    expect(settled).toEqual([[null, { reason: 'confirm' }]]);
  });

  test('finalize releases open() callers that never got their frame', () => {
    const store = createModalStore('t');
    let settled = false;
    store.requestOpen(() => {
      settled = true;
    });

    // Teardown while opening: the open() promise must not outlive the modal.
    store.close('dismiss');
    store.finalize();
    expect(settled).toBe(true);
  });
});

test.describe('openSignal', () => {
  test('the close is the abort, and it fires as the exit begins', () => {
    const store = createModalStore('signal');
    store.requestOpen();
    const signal = store.openSignal();
    expect(signal.aborted).toBe(false);

    store.close('dismiss');

    // Not at `finalize()`: nobody is waiting for that request the moment the dialog starts
    // leaving, so holding the abort until the exit animation ends would keep it in flight for
    // the whole 200ms for no one.
    expect(signal.aborted).toBe(true);
  });

  test('a reopen gets a fresh signal rather than the previous aborted one', () => {
    const store = createModalStore('signal-reopen');
    store.requestOpen();
    const first = store.openSignal();
    store.close('dismiss');
    store.finalize();

    store.requestOpen();
    const second = store.openSignal();

    // Inheriting the old controller would cancel the new load before it began — the failure this
    // separation exists to make impossible.
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    expect(second).not.toBe(first);
  });

  test('a teardown while open aborts too — a close nobody reported is still a close', () => {
    const store = createModalStore('signal-abandon');
    store.requestOpen();
    const signal = store.openSignal();

    store.abandon();

    expect(signal.aborted).toBe(true);
  });

  test('reading it before the first open gives a live signal, not null', () => {
    const store = createModalStore('signal-early');
    expect(store.openSignal().aborted).toBe(false);
  });
});
