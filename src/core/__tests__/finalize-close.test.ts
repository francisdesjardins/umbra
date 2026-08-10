import { expect, test } from '@playwright/test';
import { installFakeFrames, type FrameControl } from '../../__tests__/fake-frames.js';
import { finalizeModalClose } from '../finalize-close.js';
import { createModalStore } from '../modal-store.js';

/**
 * The shared tail of every close path.
 *
 * Both the animated path (`syncCloseSequence`) and the teardown path call it, so its order is
 * what stops those two from drifting: close the element if it is still open, run the caller's
 * `onClose` with the result, then finalize the store. It reads two members of the `<dialog>` and
 * nothing else, which is why all of that is assertable here rather than only in a browser.
 */

/** A dialog is `open` plus `close()` here, which is all this function touches. */
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

const noop = () => {
  return;
};

// `beginOpen` schedules a frame and `close` cancels it, and Node has neither function.
let frames: FrameControl;

test.beforeEach(() => {
  frames = installFakeFrames();
});

test.afterEach(() => {
  frames.restore();
});

test.describe('finalizeModalClose', () => {
  test('closes the element when it is still open', () => {
    const store = createModalStore('finalize-open');
    const dialog = fakeDialog(true);

    finalizeModalClose(store, dialog, noop);

    expect(dialog.closedCount).toBe(1);
    expect(dialog.open).toBe(false);
  });

  test('leaves an already-closed element alone', () => {
    // The ESC race: the browser's own cancel can close the dialog before this runs, and calling
    // `close()` on a closed one would fire a second `close` event at whoever is listening.
    const store = createModalStore('finalize-closed');
    const dialog = fakeDialog(false);

    finalizeModalClose(store, dialog, noop);

    expect(dialog.closedCount).toBe(0);
  });

  test('tolerates having no element at all', () => {
    // Teardown passes `null` when the binding never got a ref — an unmount before the first
    // commit. The close still has to settle.
    const store = createModalStore('finalize-null');
    store.beginOpen();
    store.close('cancel');

    finalizeModalClose(store, null, noop);

    expect(store.getSnapshot().phase).toBe('closed');
  });

  test('runs onClose with the result, then finalizes', async () => {
    const store = createModalStore<{ id: number }, 'save'>('finalize-order');
    const seen: string[] = [];
    store.setOnClose((result) => {
      seen.push(`onClose:${result.reason}:${String(result.data?.id)}`);
    });

    store.beginOpen();
    store.close('save', { id: 7 });
    finalizeModalClose(store, fakeDialog(true), noop);

    // `runOnClose` is fired detached, so it lands on the next microtask — the finalize below
    // does not wait for it, which is the point of `fireAndForget`.
    await Promise.resolve();

    expect(seen).toEqual(['onClose:save:7']);
    expect(store.getSnapshot().phase).toBe('closed');
  });

  test('finalizes even when there is no close result to report', () => {
    // A store torn down without ever closing has nothing to hand `onClose`; the finalize is
    // unconditional so the phase still settles and any resolver is released.
    const store = createModalStore('finalize-no-result');
    let ran = false;
    store.setOnClose(() => {
      ran = true;
    });

    finalizeModalClose(store, null, noop);

    expect(ran).toBe(false);
    expect(store.getSnapshot().phase).toBe('closed');
  });

  test('reports a throwing onClose instead of losing it', async () => {
    const store = createModalStore<void, 'save'>('finalize-throws');
    const errors: string[] = [];
    store.setOnClose(() => {
      throw new Error('onClose exploded');
    });

    store.beginOpen();
    store.close('save');
    finalizeModalClose(store, null, (error) => {
      errors.push(error.message);
    });

    await Promise.resolve();

    expect(errors).toEqual(['onClose exploded']);
    // And the close still completed — a caller's failing callback is not the modal's problem.
    expect(store.getSnapshot().phase).toBe('closed');
  });
});
