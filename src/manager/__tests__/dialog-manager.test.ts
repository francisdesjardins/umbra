import { expect, test } from '@playwright/test';
import type { ModalPhase, AwaitedClose } from '../../core/types.js';
import {
  type MODAL_CLOSE_EVENT,
  type MODAL_OPEN_EVENT,
  createDialogManager,
  type DialogManagerEvent,
  type ModalCloseEventDetail,
  type ModalOpenEventDetail,
} from '../dialog-manager.js';

/**
 * The `DocumentEventMap` augmentation is written with string literals, because an interface
 * key cannot be a computed `typeof MODAL_OPEN_EVENT`. Indexing the map *through* the constants
 * is what ties the two together: rename an event and one of these stops resolving, which is a
 * type error rather than a listener that silently falls back to a bare `Event`.
 */
type Equals<A extends B, B extends C, C = A> = A;

export type _OpenEventIsMapped = Equals<
  DocumentEventMap[typeof MODAL_OPEN_EVENT],
  CustomEvent<ModalOpenEventDetail>
>;
export type _CloseEventIsMapped = Equals<
  DocumentEventMap[typeof MODAL_CLOSE_EVENT],
  CustomEvent<ModalCloseEventDetail>
>;

/**
 * Minimal stand-in for the modal store, satisfying the manager's
 * `RegisteredStore` contract. `transition()` drives the phase machine the way
 * the real store does (including retaining the close reason through 'closed').
 */
function createFakeStore() {
  const listeners = new Set<() => void>();
  let phase: ModalPhase = 'closed';
  let isPreparing = false;
  let closeReason: string | undefined;
  const closeResolvers: ((result: AwaitedClose<unknown>) => void)[] = [];

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    // The manager's port includes a one-shot close resolver, so `requestOpenAndWait` can hand
    // back a close it does not own. The fake drains its queue from `close`, like the real store.
    addCloseResolver(resolve: (result: AwaitedClose<unknown>) => void): void {
      closeResolvers.push(resolve);
    },
    beginOpen(): void {
      if (phase !== 'closed') {
        return;
      }
      closeReason = undefined;
      phase = 'opening';
      isPreparing = true;
      notify();
    },
    close(reason: string): boolean {
      if (phase === 'closing' || phase === 'closed') {
        return false;
      }
      closeReason = reason;
      phase = 'closing';
      notify();
      return true;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => {
      // Mirrors the real store: closeResult is retained through 'closed' so the
      // manager can still read the reason when it emits its close event.
      return {
        phase,
        isPreparing,
        closeResult: closeReason === undefined ? null : { reason: closeReason },
      };
    },
    /** Test control: drive a phase transition like the real modal store does. */
    transition(next: ModalPhase, opening = false): void {
      phase = next;
      isPreparing = opening;
      notify();
    },
    /**
     * Test control: notify without moving the phase, the way the real store does when something
     * the manager does not track changes — an action starting, a close resolver being added.
     */
    touch(): void {
      notify();
    },
  };
}

type FakeStore = ReturnType<typeof createFakeStore>;

/** Drive a registered store through the full opening sequence. */
function openFully(store: FakeStore): void {
  store.beginOpen();
  store.transition('open', true);
  store.transition('open', false);
}

const realNow = Date.now;

test.describe('createDialogManager', () => {
  test.beforeEach(() => {
    // Deterministic, strictly increasing openedAt timestamps — registrations
    // in the same real millisecond would otherwise tie in stack ordering.
    let t = 1_000;
    Date.now = () => {
      return ++t;
    };
  });

  test.afterEach(() => {
    Date.now = realNow;
  });

  test('register/unregister drive registration queries and the snapshot', () => {
    const dm = createDialogManager();
    const a = createFakeStore();
    const b = createFakeStore();

    dm.register('a', a);
    dm.register('b', b);

    expect(dm.lookup().exists('a')).toBe(true);
    expect(dm.lookup().getRegisteredCount()).toBe(2);
    expect(dm.lookup().getClosed()).toHaveLength(2);
    expect(dm.getSnapshot().openDialogs).toHaveLength(0);

    dm.unregister('a');
    expect(dm.lookup().exists('a')).toBe(false);
    expect(dm.lookup().getRegisteredCount()).toBe(1);
  });

  test('snapshot tracks every phase transition, including closing', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('m', store);

    dm.open('m');
    expect(dm.getSnapshot().openDialogs).toHaveLength(1);
    expect(dm.lookup('m').phase).toBe('opening');

    store.transition('open', true);
    expect(dm.lookup('m').phase).toBe('open');

    store.transition('open', false);
    dm.close('m', 'custom-reason');
    // The snapshot must not lag the registry during the closing animation.
    expect(dm.lookup('m').phase).toBe('closing');
    expect(dm.lookup('m').isVisible).toBe(true);
    expect(dm.getSnapshot().openDialogs).toHaveLength(1);

    store.transition('closed');
    expect(dm.getSnapshot().openDialogs).toHaveLength(0);
    expect(dm.lookup('m').isVisible).toBe(false);
    expect(dm.lookup('m').exists).toBe(true);
  });

  test('open and close events fire once, with the reason read from the store', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    const events: DialogManagerEvent[] = [];
    dm.register('m', store);
    dm.subscribe((event) => {
      events.push(event);
    });

    openFully(store);
    dm.close('m', 'saved');
    store.transition('closed');

    expect(events).toEqual([
      { type: 'open', id: 'm' },
      { type: 'close', id: 'm', reason: 'saved' },
    ]);
  });

  test('unregistering an open dialog reports the close, so nothing outside leaks', () => {
    // A dialog torn down while open is a close that no observer would otherwise hear: `close()`
    // is never called, so the phase never reaches `'closed'` and neither the subscription nor the
    // document event fires. Anything counting opens from outside — a coexistence bridge pushing
    // onto a shared stack, a shell disabling its shortcuts while a modal is up — is then stuck
    // one open ahead, permanently, with nothing on screen to explain it.
    const dm = createDialogManager();
    const store = createFakeStore();
    const events: DialogManagerEvent[] = [];

    dm.register('m', store);
    dm.subscribe((event) => {
      events.push(event);
    });
    openFully(store);

    dm.unregister('m');

    expect(events).toEqual([
      { type: 'open', id: 'm' },
      { type: 'close', id: 'm', reason: 'dismiss' },
    ]);
    // The `modal:close` document event goes out on the same branch; there is no DOM in this
    // project, so it is checked where its absence actually hurt — `complib-bridge.ct.tsx`, whose
    // shared stack is what leaks when it does not fire.
  });

  test('unregistering a closed dialog reports nothing', () => {
    // The ordinary path: a modal that closed and then unmounted has already been reported, and a
    // second close would put the same observers one *behind*.
    const dm = createDialogManager();
    const store = createFakeStore();
    const events: DialogManagerEvent[] = [];

    dm.register('m', store);
    dm.subscribe((event) => {
      events.push(event);
    });
    openFully(store);
    dm.close('m', 'saved');
    store.transition('closed');
    const before = events.length;

    dm.unregister('m');

    expect(events).toHaveLength(before);
  });

  test('foreground, openDialogs order and z-index follow open order', () => {
    const dm = createDialogManager();
    const a = createFakeStore();
    const b = createFakeStore();
    dm.register('a', a);
    dm.register('b', b);

    openFully(a);
    openFully(b);

    expect(dm.getSnapshot().foreground?.id).toBe('b');
    expect(dm.lookup().isForeground('b')).toBe(true);
    expect(dm.lookup().isForeground('a')).toBe(false);
    // openDialogs is sorted by openedAt — index doubles as stack position.
    expect(
      dm.getSnapshot().openDialogs.map((d) => {
        return d.id;
      })
    ).toEqual(['a', 'b']);
    expect(dm.getZIndex('a')).toBe(dm.Z_INDEX_BASE);
    expect(dm.getZIndex('b')).toBe(dm.Z_INDEX_BASE + 1);

    dm.close('b');
    b.transition('closed');
    expect(dm.getSnapshot().foreground?.id).toBe('a');
    expect(dm.lookup().isForeground('a')).toBe(true);
  });

  test('modal and non-modal dialogs are counted separately', () => {
    const dm = createDialogManager();
    const modal = createFakeStore();
    const nonModal = createFakeStore();
    dm.register('modal', modal, { template: 'modal', nonModal: false });
    dm.register('non-modal', nonModal, { template: 'modal', nonModal: true });

    openFully(modal);
    openFully(nonModal);

    const lookup = dm.lookup();
    expect(lookup.getOpen()).toHaveLength(2);
    expect(
      lookup.getOpen('modal').map((d) => {
        return d.id;
      })
    ).toEqual(['modal']);
    expect(
      lookup.getOpen('non-modal').map((d) => {
        return d.id;
      })
    ).toEqual(['non-modal']);
    expect(
      dm.getSnapshot().openDialogs.filter((d) => {
        return !d.nonModal;
      })
    ).toHaveLength(1);
    expect(
      dm.getSnapshot().openDialogs.filter((d) => {
        return d.nonModal;
      })
    ).toHaveLength(1);
  });

  test('lookup(id) returns a null-object default for unregistered ids', () => {
    const dm = createDialogManager();
    const info = dm.lookup('nope');

    expect(info.exists).toBe(false);
    expect(info.phase).toBe('closed');
    expect(info.isVisible).toBe(false);
    expect(info.isForeground).toBe(false);
    expect(info.openedAt).toBe(0);
  });

  test('lookup(id) on a registered-but-closed modal reports closed state', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('idle', store);

    const info = dm.lookup('idle');
    expect(info.exists).toBe(true);
    expect(info.isVisible).toBe(false);
    expect(info.isForeground).toBe(false);
    expect(
      dm
        .lookup()
        .getClosed()
        .map((d) => {
          return d.id;
        })
    ).toEqual(['idle']);
  });

  test('open/close on unregistered ids are safe no-ops', () => {
    const dm = createDialogManager();
    expect(() => {
      dm.open('nope');
      dm.close('nope');
    }).not.toThrow();
  });

  test('unregistering an id that was never registered is a safe no-op', () => {
    // The teardown path a binding runs unconditionally: an effect that never got as far as
    // registering still unregisters on cleanup, and must not take the reporting branch below —
    // an unknown id has no open to report.
    const dm = createDialogManager();
    const events: DialogManagerEvent[] = [];
    dm.subscribe((event) => {
      events.push(event);
    });

    expect(() => {
      dm.unregister('never-registered');
    }).not.toThrow();
    expect(events).toHaveLength(0);
  });

  test('lookup().isVisible asks the snapshot, not the registry', () => {
    // The collection-level query, distinct from `lookup(id).isVisible`: this one reads
    // `openDialogs`, so a registered-but-closed modal is absent from it rather than reported
    // closed. Both spellings exist and only one of them was exercised.
    const dm = createDialogManager();
    const open = createFakeStore();
    const idle = createFakeStore();
    dm.register('open', open);
    dm.register('idle', idle);

    openFully(open);

    expect(dm.lookup().isVisible('open')).toBe(true);
    expect(dm.lookup().isVisible('idle')).toBe(false);
    expect(dm.lookup().isVisible('never-registered')).toBe(false);

    dm.close('open');
    open.transition('closed');
    expect(dm.lookup().isVisible('open')).toBe(false);
  });

  test('a store notification that moves no phase is not a transition', () => {
    // The manager subscribes to the whole store, but only phase and `isPreparing` concern it —
    // everything else a store notifies about (an action starting, a resolver queued) must not
    // re-emit an open. Without the guard, a modal with a running action reports one open per
    // keystroke to anything counting them.
    const dm = createDialogManager();
    const store = createFakeStore();
    const events: DialogManagerEvent[] = [];

    dm.register('m', store);
    dm.subscribe((event) => {
      events.push(event);
    });
    openFully(store);
    const afterOpen = events.length;
    const snapshotAfterOpen = dm.getSnapshot();

    store.touch();
    store.touch();

    expect(events).toHaveLength(afterOpen);
    // The snapshot is not even recomputed, so subscribers reading it are not woken either.
    expect(dm.getSnapshot()).toBe(snapshotAfterOpen);
  });
});
