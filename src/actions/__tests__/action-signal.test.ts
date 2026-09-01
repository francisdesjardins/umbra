import { expect, test } from '@playwright/test';
import { installFakeFrames, type FrameControl } from '../../__tests__/fake-frames.js';
import { createDialogRuntime } from '../../core/dialog-runtime.js';
import { DISMISS_REASON } from '../../core/dismiss-reason.js';

/**
 * The signal an action handler is given, and the one close that does not fire it.
 *
 * The rule is a decision rather than a mechanism: a dialog never shuts on its own, so `close()`
 * from inside a handler is the outcome the action was written for and the work queued after it is
 * the caller's. Every other way a dialog can go — a dismissal, another action, the manager, an
 * unmount — is one the handler never chose and cannot otherwise see.
 */

// Node has no `requestAnimationFrame`, and the store cancels a pending open frame on close.
let frames: FrameControl;
test.beforeEach(() => {
  frames = installFakeFrames();
});
test.afterEach(() => {
  frames.restore();
});

/** A runtime with no element behind it: none of these paths reads the DOM. */
const runtime = () => {
  return createDialogRuntime<string, 'save' | 'other'>('signal-test', () => {
    return null;
  });
};

/** Start an action that parks, and hand back the context it was given. */
const runParked = (engine: ReturnType<typeof runtime>['engine'], reason: 'save' | 'other') => {
  let seen: AbortSignal | undefined;
  let release: (() => void) | undefined;
  const parked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const done = engine.run(reason, (_close, run) => {
    seen = run.signal;
    return parked;
  });
  return {
    signal: (): AbortSignal => {
      if (!seen) {
        throw new Error('the handler never ran');
      }
      return seen;
    },
    finish: async () => {
      release?.();
      await done;
    },
  };
};

test.describe('the signal an action runs under', () => {
  test('a dismissal aborts the action still running', async () => {
    const { store, engine } = runtime();
    store.beginOpen();
    const action = runParked(engine, 'save');

    expect(action.signal().aborted, 'live while the dialog is').toBe(false);
    store.close(DISMISS_REASON);
    expect(action.signal().aborted, 'the dialog went, and the handler never asked').toBe(true);

    await action.finish();
  });

  test('the action closing the dialog itself does not abort itself', async () => {
    const { store, engine } = runtime();
    store.beginOpen();

    let seen: AbortSignal | undefined;
    await engine.run('save', (close, run) => {
      seen = run.signal;
      close('done');
    });

    expect(store.getSnapshot().closeResult?.reason, 'it did close the dialog').toBe('save');
    expect(seen?.aborted, 'the green path is not an abort').toBe(false);
  });

  test('another action closing it does abort the one still running', async () => {
    const { store, engine } = runtime();
    store.beginOpen();
    const parked = runParked(engine, 'save');

    await engine.run('other', (close) => {
      close();
    });

    expect(parked.signal().aborted, 'a close it did not ask for').toBe(true);
    await parked.finish();
  });

  test('teardown while an action runs aborts it', async () => {
    const { store, engine } = runtime();
    store.beginOpen();
    const action = runParked(engine, 'save');

    // What `teardownDialog` does to an open dialog, in the order it does it.
    store.close(DISMISS_REASON);
    store.abandon();

    expect(action.signal().aborted).toBe(true);
    await action.finish();
  });

  test('a re-run is not born aborted', async () => {
    const { store, engine } = runtime();
    store.beginOpen();
    const first = runParked(engine, 'save');
    store.close(DISMISS_REASON);
    expect(first.signal().aborted).toBe(true);
    await first.finish();

    store.beginOpen();
    const second = runParked(engine, 'save');
    expect(second.signal().aborted, 'a fresh controller, not the previous one').toBe(false);
    await second.finish();
  });
});
