import { expect, test } from '@playwright/test';
import { installFakeFrames, type FrameControl } from '../../__tests__/fake-frames.js';
import { createDialogStore } from '../dialog-store.js';
import type { AwaitedClose } from '../types.js';

// The dialog state machine — `useDialog`'s logic with React removed, so every transition is
// assertable without a browser. The store schedules its own animation frame, so these tests install
// a controllable `requestAnimationFrame`: that is what makes the "close cancels a pending open
// frame" assertions deterministic.

let frames: FrameControl;

test.beforeEach(() => {
  frames = installFakeFrames();
});

test.afterEach(() => {
  frames.restore();
});

test.describe('createDialogStore — opening', () => {
  test('starts closed and idle', () => {
    const store = createDialogStore('t');
    expect(store.getSnapshot()).toEqual({ phase: 'closed', isPreparing: false, closeResult: null });
  });

  test('beginOpen from closed enters the opening phase', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    expect(store.getSnapshot().phase).toBe('opening');
    expect(store.getSnapshot().isPreparing).toBe(true);
  });

  test('beginOpen clears the previous closeResult', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.close('confirm');
    store.finalize();
    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm' });

    store.beginOpen();
    expect(store.getSnapshot().closeResult).toBeNull();
  });

  test('a second beginOpen joins the in-flight open rather than restarting it', () => {
    const store = createDialogStore('t');
    let settled = 0;

    store.beginOpen(() => {
      settled++;
    });
    store.beginOpen(() => {
      settled++;
    });

    expect(settled).toBe(0);
    store.finishPreparing();
    // Both callers settle together when prepare completes — neither hangs, neither double-fires.
    expect(settled).toBe(2);
  });

  test('beginOpen on an already-open dialog settles immediately', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.scheduleOpenTransition();
    store.finishPreparing();
    frames.flush();
    expect(store.getSnapshot().phase).toBe('open');

    let settled = false;
    store.beginOpen(() => {
      settled = true;
    });
    // No further transition is coming to release it, so it settles here rather than hanging.
    expect(settled).toBe(true);
  });

  test('requestOpen while closing settles immediately and queues no reopen', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.finishPreparing();
    store.close('dismiss');

    let settled = false;
    store.beginOpen(() => {
      settled = true;
    });
    expect(settled).toBe(true);
    expect(store.getSnapshot().phase).toBe('closing');
  });

  test('scheduleOpenTransition reaches open only on the next frame', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.scheduleOpenTransition();

    // Still 'opening' — the browser must paint the entrance start state first.
    expect(store.getSnapshot().phase).toBe('opening');
    frames.flush();
    expect(store.getSnapshot().phase).toBe('open');
  });

  test('scheduleOpenTransition twice leaves only one pending frame', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.scheduleOpenTransition();
    store.scheduleOpenTransition();
    expect(frames.pending()).toBe(1);
  });

  test('finishPreparing clears isPreparing without touching the phase', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.finishPreparing();
    expect(store.getSnapshot().isPreparing).toBe(false);
    expect(store.getSnapshot().phase).toBe('opening');
  });
});

test.describe('createDialogStore — closing', () => {
  test('close records the reason and enters the closing phase', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    expect(store.close('confirm')).toBe(true);
    expect(store.getSnapshot().phase).toBe('closing');
    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm' });
  });

  test('close carries a data payload only when one is given', () => {
    const withData = createDialogStore('a');
    withData.beginOpen();
    withData.close('confirm', { id: 7 });
    expect(withData.getSnapshot().closeResult).toEqual({ reason: 'confirm', data: { id: 7 } });

    const withoutData = createDialogStore('b');
    withoutData.beginOpen();
    withoutData.close('confirm');
    // No `data` key at all, rather than `data: undefined` — consumers destructure this.
    expect(Object.hasOwn(withoutData.getSnapshot().closeResult ?? {}, 'data')).toBe(false);
  });

  test('close is a no-op while already closing or closed', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.close('confirm');

    // Every dismissal path calls close() blindly; the second must not overwrite the reason.
    expect(store.close('dismiss')).toBe(false);
    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm' });

    store.finalize();
    expect(store.close('dismiss')).toBe(false);
  });

  test('close cancels a pending open frame', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.scheduleOpenTransition();
    expect(frames.pending()).toBe(1);

    store.close('dismiss');
    expect(frames.pending()).toBe(0);

    // The cancelled frame must not resurrect the dialog into 'open' after it closed.
    frames.flush();
    expect(store.getSnapshot().phase).toBe('closing');
  });

  test('finalize settles the close resolvers with the close result', () => {
    const store = createDialogStore('t');
    const settled: AwaitedClose<unknown>[] = [];
    store.addCloseResolver((result) => {
      settled.push(result);
    });

    store.beginOpen();
    store.close('confirm', 42);
    store.finalize();

    expect(settled).toEqual([[null, { reason: 'confirm', data: 42 }]]);
    expect(store.getSnapshot().phase).toBe('closed');
  });

  test('closeResult survives into the closed phase', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.close('confirm');
    store.finalize();

    // The dialog manager reads the reason after the transition to emit its close event.
    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm' });
  });

  test('abandon settles a close that will never happen', () => {
    const store = createDialogStore('t');
    const settled: AwaitedClose<unknown>[] = [];
    store.addCloseResolver((result) => {
      settled.push(result);
    });

    // Torn down having never opened: without this the promise stays pending for the life of the
    // process, the awaiting code never resumes and the resolver keeps its closure alive.
    store.abandon();

    expect(settled).toHaveLength(1);
    const [error, result] = settled[0] ?? [];
    expect(error).toBeInstanceOf(Error);
    expect(result).toBeNull();
  });

  test('abandon does not hand back a stale result from an earlier close', () => {
    const store = createDialogStore('t');
    store.beginOpen();
    store.close('confirm');
    store.finalize();

    // Waiting for the *next* close, this must report abandonment, not replay the retained result.
    const settled: AwaitedClose<unknown>[] = [];
    store.addCloseResolver((result) => {
      settled.push(result);
    });
    store.abandon();

    expect(settled[0]?.[0]).toBeInstanceOf(Error);
    expect(settled[0]?.[1]).toBeNull();
  });

  test('abandon is harmless after a normal close settled the waiters', () => {
    const store = createDialogStore('t');
    const settled: AwaitedClose<unknown>[] = [];
    store.addCloseResolver((result) => {
      settled.push(result);
    });

    store.beginOpen();
    store.close('confirm');
    store.finalize();
    store.abandon();

    // Teardown runs abandon() unconditionally, so it must not double-settle a resolved waiter.
    expect(settled).toEqual([[null, { reason: 'confirm' }]]);
  });

  test('finalize releases open() callers that never got their frame', () => {
    const store = createDialogStore('t');
    let settled = false;
    store.beginOpen(() => {
      settled = true;
    });

    // Teardown while opening: the open() promise must not outlive the dialog.
    store.close('dismiss');
    store.finalize();
    expect(settled).toBe(true);
  });
});

test.describe('prepareSignal', () => {
  test('the close is the abort, and it fires as the exit begins', () => {
    const store = createDialogStore('signal');
    store.beginOpen();
    const signal = store.prepareSignal();
    expect(signal.aborted).toBe(false);

    store.close('dismiss');

    // Not at `finalize()`: nobody waits on it once the exit begins, so 200ms in flight for no one.
    expect(signal.aborted).toBe(true);
  });

  test('a reopen gets a fresh signal rather than the previous aborted one', () => {
    const store = createDialogStore('signal-reopen');
    store.beginOpen();
    const first = store.prepareSignal();
    store.close('dismiss');
    store.finalize();

    store.beginOpen();
    const second = store.prepareSignal();

    // Inheriting the old controller would cancel the new load before it began.
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    expect(second).not.toBe(first);
  });

  test('a teardown while open aborts too — a close nobody reported is still a close', () => {
    const store = createDialogStore('signal-abandon');
    store.beginOpen();
    const signal = store.prepareSignal();

    store.abandon();

    expect(signal.aborted).toBe(true);
  });

  test('reading it before the first open gives a live signal, not null', () => {
    const store = createDialogStore('signal-early');
    expect(store.prepareSignal().aborted).toBe(false);
  });
});

// Why `addCloseResolver` is internal: a resolver answers the *next* close, so one registered after
// one has landed waits forever with no error, no timeout, nothing. `openAndWait` registers first.
test.describe('close resolvers and the order they must be registered in', () => {
  test('a resolver registered after the close never settles', async () => {
    const store = createDialogStore<void, 'ok'>('resolver-late');

    store.beginOpen();
    frames.flush();
    store.close('ok');
    store.finalize();

    let settled = false;
    store.addCloseResolver(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(settled, 'a stale close was replayed — a wrong answer, not a late one').toBe(false);
  });

  test('a resolver registered before it does', async () => {
    const store = createDialogStore<void, 'ok'>('resolver-early');

    const seen: AwaitedClose<void, 'ok'>[] = [];
    store.addCloseResolver((result) => {
      seen.push(result);
    });

    store.beginOpen();
    frames.flush();
    store.close('ok');
    store.finalize();
    await Promise.resolve();

    expect(seen).toEqual([[null, { reason: 'ok' }]]);
  });

  // The other end of the same window, and the one that answered *wrongly* rather than not at all:
  // `beginOpen` queues no reopen, so a caller arriving mid-exit was handed the close it walked in
  // on — a reason somebody else's interaction produced, for a dialog it never saw.
  test('a resolver registered during the exit is refused rather than answered', async () => {
    const store = createDialogStore<void, 'cancel'>('resolver-mid-exit');

    store.beginOpen();
    frames.flush();
    store.finishPreparing();
    store.close('cancel');
    expect(store.getSnapshot().phase).toBe('closing');

    const seen: AwaitedClose<void, 'cancel'>[] = [];
    store.addCloseResolver((result) => {
      seen.push(result);
    });
    store.beginOpen();
    store.finalize();
    await Promise.resolve();

    expect(seen).toHaveLength(1);
    const [error, result] = seen[0] ?? [null, null];
    expect(error?.message).toBe('Dialog "resolver-mid-exit" is closing; no reopen is queued');
    expect(result, 'the in-flight close belongs to the caller that asked for it').toBeNull();
  });
});
