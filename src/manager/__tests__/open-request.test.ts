import { expect, test } from '@playwright/test';
import { installFakeFrames, type FrameControl } from '../../__tests__/fake-frames.js';
import { createDialogStore } from '../../core/dialog-store.js';
import type { DialogPhase, AwaitedClose } from '../../core/types.js';
import { createDialogManager, createOpenRequest, type OpenRequest } from '../dialog-manager.js';

/**
 * `requestOpen` — an open a dialog may refuse; mostly about what does **not** happen. `open(id)`
 * moves the store regardless, so a controlled dialog flashes open before its own reconciliation
 * puts it back, emitting an open/close pair and a vanishing stack entry. Hence the assertion that
 * matters most: the store never left `closed`.
 */

/** The manager's `RegisteredStore` contract, and nothing more. */
function createFakeStore() {
  const listeners = new Set<() => void>();
  let phase: DialogPhase = 'closed';
  let isPreparing = false;
  const closeResolvers: ((result: AwaitedClose<unknown>) => void)[] = [];

  return {
    beginOpen(): void {
      if (phase !== 'closed') {
        return;
      }
      phase = 'opening';
      isPreparing = true;
      for (const listener of listeners) {
        listener();
      }
    },
    close(): boolean {
      return false;
    },
    // This fake never closes, so nothing resolves: a refusal must not leave a caller waiting.
    addCloseResolver(resolve: (result: AwaitedClose<unknown>) => void): void {
      closeResolvers.push(resolve);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return { phase, isPreparing, closeResult: null } as const;
    },
    get phase() {
      return phase;
    },
  };
}

test.describe('requestOpen', () => {
  test('hands the request to the dialog and moves nothing itself', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    const seen: OpenRequest[] = [];
    dm.register('asked', {
      store,
      onOpenRequest: (_payload, request) => {
        seen.push(request);
      },
    });

    dm.requestOpen('asked', { payload: { patientId: '42' }, context: { source: 'portal:nav' } });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.payload).toEqual({ patientId: '42' });
    expect(seen[0]?.context?.source).toBe('portal:nav');
    expect(store.phase).toBe('closed');
    expect(dm.lookup('asked').isVisible).toBe(false);
  });

  test('emits nothing — an unanswered request is not an open', () => {
    // A shell disabling shortcuts, a bridge on a shared stack: neither may hear a mere request.
    const dm = createDialogManager();
    const events: string[] = [];
    dm.subscribe((event) => {
      events.push(event.type);
    });
    dm.register('asked', {
      store: createFakeStore(),
      onOpenRequest: () => {
        return undefined;
      },
    });

    dm.requestOpen('asked', { payload: 1 });

    // The registration is heard — a dialog existing is a different fact from one opening — and
    // the request that nobody answered adds nothing after it.
    expect(events).toEqual(['register']);
  });

  test('a dialog that declares no handler refuses, and stays shut', () => {
    // Not "opens anyway": the dialog never agreed to be opened from outside.
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('never-asked', { store });

    dm.requestOpen('never-asked', { payload: 'anything' });

    expect(store.phase).toBe('closed');
    expect(dm.lookup('never-asked').isVisible).toBe(false);
  });

  test('an unregistered id is refused rather than thrown at', () => {
    const dm = createDialogManager();
    expect(() => {
      dm.requestOpen('nobody', { context: { source: 'test' } });
    }).not.toThrow();
  });

  test('the handler accepts by opening the dialog itself', () => {
    // Accepting is an ordinary open through the door the dialog already had.
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('asked', {
      store,
      onOpenRequest: () => {
        dm.open('asked');
      },
    });

    dm.requestOpen('asked');

    expect(store.phase).toBe('opening');
  });

  test('`open(id)` is untouched — the two doors are separate', () => {
    // Or every existing imperative open would start routing through a handler it never expected.
    const dm = createDialogManager();
    const store = createFakeStore();
    let asked = 0;
    dm.register('asked', {
      store,
      onOpenRequest: () => {
        asked += 1;
      },
    });

    dm.open('asked');

    expect(asked).toBe(0);
    expect(store.phase).toBe('opening');
  });

  test('unregistering takes the handler with it', () => {
    const dm = createDialogManager();
    let asked = 0;
    dm.register('asked', {
      store: createFakeStore(),
      onOpenRequest: () => {
        asked += 1;
      },
    });
    dm.unregister('asked');

    dm.requestOpen('asked');

    expect(asked).toBe(0);
  });

  test('re-registering without a handler stops accepting requests', () => {
    // The registration is the agreement; a stale handler would answer for a withdrawn offer.
    const dm = createDialogManager();
    let asked = 0;
    dm.register('asked', {
      store: createFakeStore(),
      onOpenRequest: () => {
        asked += 1;
      },
    });
    dm.register('asked', { store: createFakeStore() });

    dm.requestOpen('asked');

    expect(asked).toBe(0);
  });
});

test.describe('requestOpenAndWait', () => {
  test('a refusal comes back with its reason, and nothing opened', async () => {
    // `requestOpen` walks away, so a refused caller cannot tell the user why nothing happened.
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('billing', {
      store,
      onOpenRequest: (_payload, request) => {
        request.refuse('over-limit');
      },
    });

    const outcome = await dm.requestOpenAndWait('billing', createOpenRequest({ amount: 900 }));

    expect(outcome).toEqual({ accepted: false, reason: 'over-limit' });
    expect(store.phase).toBe('closed');
  });

  // The ask registers its resolver before the handler decides, so it shares the store's rule about
  // a close already in flight: the request is still accepted — the owner said yes — but the close
  // it hands back is the error branch rather than an exit nobody in this exchange asked for.
  test('an accept during the exit carries the error branch, not the leaving dialog’s reason', async () => {
    const frames: FrameControl = installFakeFrames();
    try {
      const dm = createDialogManager();
      const store = createDialogStore<void, 'cancel'>('leaving');
      dm.register('leaving', {
        store,
        onOpenRequest: () => {
          store.beginOpen();
        },
      });

      store.beginOpen();
      frames.flush();
      store.finishPreparing();
      store.close('cancel');

      const outcome = await dm.requestOpenAndWait('leaving');
      expect(outcome.accepted).toBe(true);
      if (!outcome.accepted) {
        return;
      }
      const [error, result] = await outcome.closed;
      expect(error?.message).toBe('Modal "leaving" is closing; no reopen is queued');
      expect(result).toBeNull();
    } finally {
      frames.restore();
    }
  });

  test('the refuses the manager makes itself are reasons too, not just warnings', async () => {
    const dm = createDialogManager();
    dm.register('deaf', { store: createFakeStore() });

    expect(await dm.requestOpenAndWait('absent')).toEqual({
      accepted: false,
      reason: 'not-registered',
    });
    expect(await dm.requestOpenAndWait('deaf')).toEqual({
      accepted: false,
      reason: 'accepts-none',
    });
  });

  test('acceptance is the default — a handler that just opens says yes', async () => {
    // React's open is async: a phase read when the handler returns would call an accept a refusal.
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('asked', {
      store,
      onOpenRequest: () => {
        dm.open('asked');
      },
    });

    const outcome = await dm.requestOpenAndWait('asked');

    expect(outcome.accepted).toBe(true);
    expect(store.phase).toBe('opening');
  });

  test('an async handler is awaited, so a validator that fetches can still refuse', async () => {
    const dm = createDialogManager();
    dm.register('slow', {
      store: createFakeStore(),
      onOpenRequest: async (_payload, request) => {
        await Promise.resolve();
        request.refuse('checked-and-refused');
      },
    });

    expect(await dm.requestOpenAndWait('slow')).toEqual({
      accepted: false,
      reason: 'checked-and-refused',
    });
  });

  test('the first answer stands — refusing twice does not rewrite it', async () => {
    const dm = createDialogManager();
    dm.register('asked', {
      store: createFakeStore(),
      onOpenRequest: (_payload, request) => {
        request.refuse('first');
        request.refuse('second');
      },
    });

    expect(await dm.requestOpenAndWait('asked')).toEqual({ accepted: false, reason: 'first' });
  });

  test('requestOpen still returns nothing and still reaches the handler', () => {
    const dm = createDialogManager();
    let asked = 0;
    dm.register('asked', {
      store: createFakeStore(),
      onOpenRequest: () => {
        asked += 1;
      },
    });

    // Its `void` return is pinned by type-check; what matters at runtime is that the ask lands.
    dm.requestOpen('asked');
    expect(asked).toBe(1);
  });
});

test.describe('createOpenRequest', () => {
  test('names the two halves at the boundary, and omits what was not given', () => {
    expect(createOpenRequest({ patientId: '42' }, { source: 'portal:nav' })).toEqual({
      payload: { patientId: '42' },
      context: { source: 'portal:nav' },
    });

    // `exactOptionalPropertyTypes` is on: an absent half must be absent, not present-and-undefined.
    expect(Object.keys(createOpenRequest(undefined, { source: 'shell:menu' }))).toEqual([
      'context',
    ]);
    expect(Object.keys(createOpenRequest({ id: 1 }))).toEqual(['payload']);
    expect(Object.keys(createOpenRequest())).toEqual([]);
  });

  test('the dialog reads back exactly what was built', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    const seen: unknown[] = [];
    dm.register('asked', {
      store,
      onOpenRequest: (payload) => {
        seen.push(payload);
      },
    });

    dm.requestOpen('asked', createOpenRequest({ room: '204' }, { source: 'kiosk' }));
    expect(seen).toEqual([{ room: '204' }]);
  });
});
