import { expect, test } from '@playwright/test';
import type { ModalPhase, AwaitedClose } from '../../core/types.js';
import { createDialogManager, type DialogManagerEvent } from '../dialog-manager.js';

/**
 * Registry edges that stay silent until an app has been mounting and unmounting for a while: a
 * leaked subscription, a listener firing during its own registration, a speed-dependent stack
 * order. The happy paths are in `dialog-manager.test.ts` and the component suite.
 */

function createFakeStore() {
  const listeners = new Set<() => void>();
  let phase: ModalPhase = 'closed';
  let isPreparing = false;
  let closeReason: string | undefined;
  const closeResolvers: ((result: AwaitedClose<unknown>) => void)[] = [];

  const notify = () => {
    // Mirrors the real store: dispatch over a snapshot so a listener may unsubscribe itself.
    // oxlint-disable-next-line no-useless-spread -- snapshot before dispatch, see above
    for (const listener of [...listeners]) {
      listener();
    }
  };

  return {
    // A one-shot close resolver, so `requestOpenAndWait` can hand back a close it does not own.
    addCloseResolver(resolve: (result: AwaitedClose<unknown>) => void): void {
      closeResolvers.push(resolve);
    },
    /** Number of live subscriptions — the leak detector. */
    subscriberCount(): number {
      return listeners.size;
    },
    beginOpen(): void {
      if (phase !== 'closed') {
        return;
      }
      closeReason = undefined;
      phase = 'opening';
      isPreparing = true;
      notify();
      isPreparing = false;
      phase = 'open';
      notify();
    },
    close(reason: string): boolean {
      if (phase === 'closing' || phase === 'closed') {
        return false;
      }
      closeReason = reason;
      phase = 'closing';
      notify();
      phase = 'closed';
      notify();
      return true;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return {
        phase,
        isPreparing,
        closeResult: closeReason !== undefined ? { reason: closeReason } : null,
      };
    },
  };
}

test.describe('registering the same id twice', () => {
  test('releases the previous store subscription', () => {
    const dm = createDialogManager();
    const first = createFakeStore();
    const second = createFakeStore();

    dm.register('dupe', { store: first });
    expect(first.subscriberCount()).toBe(1);

    dm.register('dupe', { store: second });

    // Without an explicit release, `unregister('dupe')` can only reach the second: the first leaks
    // for the manager's lifetime, driving snapshot recomputation from off-registry.
    expect(first.subscriberCount()).toBe(0);
    expect(second.subscriberCount()).toBe(1);
  });

  test('the displaced store can no longer move the manager', () => {
    const dm = createDialogManager();
    const first = createFakeStore();
    const second = createFakeStore();

    dm.register('dupe', { store: first });
    dm.register('dupe', { store: second });

    const events: DialogManagerEvent[] = [];
    dm.subscribe((event) => {
      events.push(event);
    });

    first.beginOpen();
    expect(events).toEqual([]);
    expect(dm.lookup().getOpen()).toEqual([]);

    second.beginOpen();
    expect(events).toEqual([{ type: 'open', id: 'dupe' }]);
  });

  test('unregister after a duplicate leaves no live subscription behind', () => {
    const dm = createDialogManager();
    const first = createFakeStore();
    const second = createFakeStore();

    dm.register('dupe', { store: first });
    dm.register('dupe', { store: second });
    dm.unregister('dupe');

    expect(first.subscriberCount()).toBe(0);
    expect(second.subscriberCount()).toBe(0);
    expect(dm.lookup().getRegisteredCount()).toBe(0);
  });
});

test.describe('event emission', () => {
  test('a listener added while an event is dispatching does not receive that event', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('m', { store });

    const lateEvents: DialogManagerEvent[] = [];
    dm.subscribe(() => {
      // A subscriber that lazily attaches per-modal tracking on the first event it sees.
      dm.subscribe((event) => {
        lateEvents.push(event);
      });
    });

    store.beginOpen();

    // Iterating the live Set would deliver the causing event, a duplicate to anything counting.
    expect(lateEvents).toEqual([]);

    store.close('confirm');
    expect(lateEvents).toEqual([{ type: 'close', id: 'm', reason: 'confirm' }]);
  });

  test('a listener may unsubscribe itself mid-dispatch', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('m', { store });

    const seen: DialogManagerEvent[] = [];
    const unsubscribe = dm.subscribe((event) => {
      seen.push(event);
      unsubscribe();
    });

    store.beginOpen();
    store.close('confirm');

    expect(seen).toEqual([{ type: 'open', id: 'm' }]);
  });
});

test.describe('stack ordering', () => {
  test('modals opened in the same millisecond stack in open order, not registration order', () => {
    const dm = createDialogManager();
    const bottom = createFakeStore();
    const top = createFakeStore();

    // Registration order reversed against open order: two modals opened in one synchronous block
    // land in the same millisecond, where `Date.now()` cannot separate them.
    dm.register('top', { store: top });
    dm.register('bottom', { store: bottom });

    bottom.beginOpen();
    top.beginOpen();

    expect(dm.lookup().getForeground()?.id).toBe('top');
    expect(
      dm
        .lookup()
        .getOpen()
        .map((info) => {
          return info.id;
        })
    ).toEqual(['bottom', 'top']);
    // z-index must follow the same order, or the newer modal renders behind the older one.
    expect(dm.getZIndex('top')).toBeGreaterThan(dm.getZIndex('bottom'));
  });

  test('reopening moves a modal to the top of the stack', () => {
    const dm = createDialogManager();
    const a = createFakeStore();
    const b = createFakeStore();
    dm.register('a', { store: a });
    dm.register('b', { store: b });

    a.beginOpen();
    b.beginOpen();
    expect(dm.lookup().getForeground()?.id).toBe('b');

    a.close('dismiss');
    a.beginOpen();
    expect(dm.lookup().getForeground()?.id).toBe('a');
  });
});
