import { expect, test } from '@playwright/test';
import type { ModalPhase, AwaitedClose } from '../../core/types.js';
import { createDialogManager, type DialogManagerEvent } from '../dialog-manager.js';

/**
 * Registry invariants that only bite in long-lived apps.
 *
 * The happy paths are well covered by `dialog-manager.test.ts` and the component suite. These
 * are the edges that stay silent until something has been mounting and unmounting for a while:
 * a leaked subscription, a listener that fires during its own registration, a stacking order
 * that depends on how fast the machine is.
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
    // The manager's port includes a one-shot close resolver, so `requestOpenAndWait` can hand
    // back a close it does not own. The fake drains its queue from `close`, like the real store.
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

// ── Duplicate ids ────────────────────────────────────────────────────────────

test.describe('registering the same id twice', () => {
  test('releases the previous store subscription', () => {
    const dm = createDialogManager();
    const first = createFakeStore();
    const second = createFakeStore();

    dm.register('dupe', first);
    expect(first.subscriberCount()).toBe(1);

    // Two components mounting with the same modal id — a routine user mistake.
    dm.register('dupe', second);

    // Without an explicit release the first subscription outlives its registry entry:
    // `unregister('dupe')` can only ever reach the second one, so the first leaks for the
    // lifetime of the manager and keeps driving snapshot recomputation from off-registry.
    expect(first.subscriberCount()).toBe(0);
    expect(second.subscriberCount()).toBe(1);
  });

  test('the displaced store can no longer move the manager', () => {
    const dm = createDialogManager();
    const first = createFakeStore();
    const second = createFakeStore();

    dm.register('dupe', first);
    dm.register('dupe', second);

    const events: DialogManagerEvent[] = [];
    dm.subscribe((event) => {
      events.push(event);
    });

    // The displaced store is no longer anybody's modal; its transitions must be invisible.
    first.beginOpen();
    expect(events).toEqual([]);
    expect(dm.lookup().getOpen()).toEqual([]);

    // The store that actually holds the id still works.
    second.beginOpen();
    expect(events).toEqual([{ type: 'open', id: 'dupe' }]);
  });

  test('unregister after a duplicate leaves no live subscription behind', () => {
    const dm = createDialogManager();
    const first = createFakeStore();
    const second = createFakeStore();

    dm.register('dupe', first);
    dm.register('dupe', second);
    dm.unregister('dupe');

    expect(first.subscriberCount()).toBe(0);
    expect(second.subscriberCount()).toBe(0);
    expect(dm.lookup().getRegisteredCount()).toBe(0);
  });
});

// ── Re-entrant subscription ──────────────────────────────────────────────────

test.describe('event emission', () => {
  test('a listener added while an event is dispatching does not receive that event', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('m', store);

    const lateEvents: DialogManagerEvent[] = [];
    dm.subscribe(() => {
      // A listener that installs another listener — e.g. a subscriber that lazily attaches
      // per-modal tracking on the first event it sees.
      dm.subscribe((event) => {
        lateEvents.push(event);
      });
    });

    store.beginOpen();

    // Iterating the live Set would call the just-added listener with the very event that
    // caused it to be added, which reads as a duplicate to anything counting opens.
    expect(lateEvents).toEqual([]);

    store.close('confirm');
    // ...but it does receive the next one.
    expect(lateEvents).toEqual([{ type: 'close', id: 'm', reason: 'confirm' }]);
  });

  test('a listener may unsubscribe itself mid-dispatch', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('m', store);

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

// ── Stacking order ───────────────────────────────────────────────────────────

test.describe('stack ordering', () => {
  test('modals opened in the same millisecond stack in open order, not registration order', () => {
    const dm = createDialogManager();
    const bottom = createFakeStore();
    const top = createFakeStore();

    // Registration order deliberately reversed relative to open order. Opening two modals in
    // one synchronous block — a confirm raised from inside another modal — routinely lands
    // both in the same millisecond, at which point a `Date.now()` timestamp cannot separate
    // them and the sort falls back to registry insertion order.
    dm.register('top', top);
    dm.register('bottom', bottom);

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
    dm.register('a', a);
    dm.register('b', b);

    a.beginOpen();
    b.beginOpen();
    expect(dm.lookup().getForeground()?.id).toBe('b');

    a.close('dismiss');
    a.beginOpen();
    expect(dm.lookup().getForeground()?.id).toBe('a');
  });
});
