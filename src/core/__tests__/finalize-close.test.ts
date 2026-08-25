import { expect, test } from '@playwright/test';
import { noop } from '../../__tests__/noop.js';
import { installFakeFrames, type FrameControl } from '../../__tests__/fake-frames.js';
import { finalizeDialogClose } from '../finalize-close.js';
import { createDialogStore } from '../dialog-store.js';

// The shared tail of every close path, called by both the animated path (`syncCloseSequence`) and
// teardown, so its order is what stops those two drifting: close the element if still open, run
// `onClose` with the result, finalize the store. It reads two `<dialog>` members and nothing else.

const fakeDialog = (open: boolean) => {
  let closed = 0;
  return {
    get open() {
      return open;
    },
    close: () => {
      closed += 1;
      open = false;
    },
    get closedCount() {
      return closed;
    },
  };
};

// `beginOpen` schedules a frame and `close` cancels it, and Node has neither function.
let frames: FrameControl;

test.beforeEach(() => {
  frames = installFakeFrames();
});

test.afterEach(() => {
  frames.restore();
});

test.describe('finalizeDialogClose', () => {
  test('closes the element when it is still open', () => {
    const store = createDialogStore('finalize-open');
    const dialog = fakeDialog(true);

    finalizeDialogClose(store, { dialog, onCloseError: noop });

    expect(dialog.closedCount).toBe(1);
    expect(dialog.open).toBe(false);
  });

  test('leaves an already-closed element alone', () => {
    // The ESC race: the browser's cancel can close first, and `close()` again fires a second event.
    const store = createDialogStore('finalize-closed');
    const dialog = fakeDialog(false);

    finalizeDialogClose(store, { dialog, onCloseError: noop });

    expect(dialog.closedCount).toBe(0);
  });

  test('tolerates having no element at all', () => {
    // Teardown passes `null` on an unmount before the first commit; the close still has to settle.
    const store = createDialogStore('finalize-null');
    store.beginOpen();
    store.close('cancel');

    finalizeDialogClose(store, { dialog: null, onCloseError: noop });

    expect(store.getSnapshot().phase).toBe('closed');
  });

  test('runs onClose with the result, then finalizes', async () => {
    const store = createDialogStore<{ id: number }, 'save'>('finalize-order');
    const seen: string[] = [];
    store.setOnClose((result) => {
      seen.push(`onClose:${result.reason}:${String(result.data?.id)}`);
    });

    store.beginOpen();
    store.close('save', { id: 7 });
    finalizeDialogClose(store, { dialog: fakeDialog(true), onCloseError: noop });

    // `runOnClose` is detached, so it lands on the next microtask — the point of `fireAndForget`.
    await Promise.resolve();

    expect(seen).toEqual(['onClose:save:7']);
    expect(store.getSnapshot().phase).toBe('closed');
  });

  test('finalizes even when there is no close result to report', () => {
    // Nothing to hand `onClose`; the finalize is unconditional, so the phase settles regardless.
    const store = createDialogStore('finalize-no-result');
    let ran = false;
    store.setOnClose(() => {
      ran = true;
    });

    finalizeDialogClose(store, { dialog: null, onCloseError: noop });

    expect(ran).toBe(false);
    expect(store.getSnapshot().phase).toBe('closed');
  });

  test('reports a throwing onClose instead of losing it', async () => {
    const store = createDialogStore<void, 'save'>('finalize-throws');
    const errors: string[] = [];
    store.setOnClose(() => {
      throw new Error('onClose exploded');
    });

    store.beginOpen();
    store.close('save');
    finalizeDialogClose(store, {
      dialog: null,
      onCloseError: (error) => {
        errors.push(error.message);
      },
    });

    await Promise.resolve();

    expect(errors).toEqual(['onClose exploded']);
    // And the close still completed — a caller's failing callback is not the modal's problem.
    expect(store.getSnapshot().phase).toBe('closed');
  });
});

test.describe('the onError channel', () => {
  test('a throwing onClose is normalized and reported as its own source', async () => {
    // `onClose` runs detached with no render pass and no promise — without this, only a quiet log.
    const failures: { readonly error: Error; readonly source: string }[] = [];
    const store = createDialogStore('on-error-close');

    store.setOnClose(() => {
      // A non-Error throw, the case `normalizeError` exists for: `onError` always gets an `Error`.
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- that is the case under test
      throw 'not an error object';
    });

    store.beginOpen();
    store.close('save');
    finalizeDialogClose(store, {
      dialog: null,
      onCloseError: (error) => {
        failures.push({ error, source: 'onClose' });
      },
    });

    await Promise.resolve();

    expect(failures).toHaveLength(1);
    expect(failures[0]?.error).toBeInstanceOf(Error);
    expect(failures[0]?.error.message).toBe('not an error object');
    expect(failures[0]?.source).toBe('onClose');
  });

  test('a close with nothing thrown reports nothing', () => {
    // Failures only: a well-behaved `onClose` must not stream non-events to a reporter.
    const failures: Error[] = [];
    const store = createDialogStore('on-error-quiet');

    store.setOnClose(() => {
      // succeeds
    });

    store.beginOpen();
    store.close('save');
    finalizeDialogClose(store, {
      dialog: null,
      onCloseError: (error) => {
        failures.push(error);
      },
    });

    expect(failures).toHaveLength(0);
  });
});
