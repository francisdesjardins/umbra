import { expect, test } from '@playwright/test';
import type { ModalPhase, AwaitedClose } from '../../core/types.js';
import { createDialogManager, createOpenRequest, type OpenRequest } from '../dialog-manager.js';

/**
 * `requestOpen` — an open a dialog is allowed to refuse.
 *
 * The behaviour under test is mostly about what does **not** happen. `open(id)` moves the store
 * whether or not the dialog wanted it, which for a controlled dialog means it opens for a moment
 * and is put back by its own reconciliation: a flash on screen, an open/close pair through
 * `subscribe`, and a stack entry that appears and vanishes for anything watching. Asking has to
 * cost none of that, so "the store never left `closed`" is the assertion that matters most here.
 */

/** The manager's `RegisteredStore` contract, and nothing more. */
function createFakeStore() {
  const listeners = new Set<() => void>();
  let phase: ModalPhase = 'closed';
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
    // Part of the port since `requestOpenAndWait` hands back the close of a dialog it does not
    // own. This fake never closes, so nothing here ever resolves — which is the point for the
    // refusal paths: they must not leave a caller waiting on a dialog that never opened.
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
    // The whole point: asking is free until the dialog says yes.
    expect(store.phase).toBe('closed');
    expect(dm.lookup('asked').isVisible).toBe(false);
  });

  test('emits nothing — an unanswered request is not an open', () => {
    // A spurious open/close pair is what an observer sees today when a controlled dialog is
    // instructed rather than asked: a shell disabling shortcuts while a modal is up, a bridge
    // pushing onto a shared stack. Neither should hear anything from a request.
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

    expect(events).toEqual([]);
  });

  test('a dialog that declares no handler refuses, and stays shut', () => {
    // Not "opens anyway". The request reached a dialog that never agreed to be opened from
    // outside, and the honest answer to that is no.
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
    // Accepting is an ordinary open, through the door the dialog already had — which is what
    // keeps the manager out of the business of deciding for it.
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
    // Adding the polite door must not change what the blunt one does, or every existing
    // imperative open in the fleet would start routing through a handler it never expected.
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
    // The registration is the agreement. A dialog that stops declaring one has withdrawn it, and
    // a stale handler answering for a dialog that no longer offers it is the worst of both.
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
    // The gap this closes: `requestOpen` tells the owner and walks away, so a microfrontend that
    // is refused has no way to tell the user why nothing happened.
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
    // The manager cannot infer it: the React binding's open is asynchronous, so a phase read when
    // the handler returns would report a successful accept as a refusal.
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
    // The fire-and-forget door is unchanged: adding the reporting one must cost no existing call.
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
    // The point is not brevity — `{ payload, context }` is shorter. It is that the call site of a
    // cross-boundary message is the worst place to be remembering key names by hand.
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
