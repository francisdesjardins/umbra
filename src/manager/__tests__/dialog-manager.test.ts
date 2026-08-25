import { expect, test } from '@playwright/test';
import type { DialogPhase, AwaitedClose } from '../../core/types.js';
import {
  type DIALOG_CLOSE_EVENT,
  type DIALOG_OPEN_EVENT,
  createDialogManager,
  type DialogManagerEvent,
  type DialogCloseEventDetail,
  type DialogOpenEventDetail,
} from '../dialog-manager.js';

/**
 * `DocumentEventMap` is augmented with string literals — an interface key cannot be a computed
 * `typeof DIALOG_OPEN_EVENT`. Indexing the map *through* the constants ties the two together: a
 * renamed event stops resolving, a type error rather than a listener falling back to bare `Event`.
 */
type Equals<A extends B, B extends C, C = A> = A;

export type _OpenEventIsMapped = Equals<
  DocumentEventMap[typeof DIALOG_OPEN_EVENT],
  CustomEvent<DialogOpenEventDetail>
>;
export type _CloseEventIsMapped = Equals<
  DocumentEventMap[typeof DIALOG_CLOSE_EVENT],
  CustomEvent<DialogCloseEventDetail>
>;

/**
 * Minimal stand-in for the modal store, satisfying `RegisteredStore`. `transition()` drives the
 * phase machine as the real store does, including retaining the close reason through 'closed'.
 */
function createFakeStore() {
  const listeners = new Set<() => void>();
  let phase: DialogPhase = 'closed';
  let isPreparing = false;
  let closeReason: string | undefined;
  const closeResolvers: ((result: AwaitedClose<unknown>) => void)[] = [];

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    // A one-shot close resolver, so `requestOpenAndWait` can hand back a close it does not own.
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
      // Like the real store, closeResult survives 'closed' so the close event still has a reason.
      return {
        phase,
        isPreparing,
        closeResult: closeReason === undefined ? null : { reason: closeReason },
      };
    },
    transition(next: DialogPhase, opening = false): void {
      phase = next;
      isPreparing = opening;
      notify();
    },
    /** Test control: notify without moving the phase, as the real store does on an action start. */
    touch(): void {
      notify();
    },
  };
}

type FakeStore = ReturnType<typeof createFakeStore>;

function openFully(store: FakeStore): void {
  store.beginOpen();
  store.transition('open', true);
  store.transition('open', false);
}

const realNow = Date.now;

test.describe('createDialogManager', () => {
  test.beforeEach(() => {
    // Deterministic, increasing openedAt — same-millisecond registrations would tie in stack order.
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

    dm.register('a', { store: a });
    dm.register('b', { store: b });

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
    dm.register('m', { store });

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
    dm.register('m', { store });
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
    // A dialog torn down while open never calls `close()`, so the phase never reaches `'closed'`
    // and nothing fires — anything counting opens from outside is stuck one ahead, permanently.
    const dm = createDialogManager();
    const store = createFakeStore();
    const events: DialogManagerEvent[] = [];

    dm.register('m', { store });
    dm.subscribe((event) => {
      events.push(event);
    });
    openFully(store);

    dm.unregister('m');

    expect(events).toEqual([
      { type: 'open', id: 'm' },
      { type: 'close', id: 'm', reason: 'dismiss' },
      // The dialog leaves the screen before it leaves the registry, and both are worth hearing.
      { type: 'unregister', id: 'm' },
    ]);
    // The `dialog:close` event shares this branch; no DOM here, so see `complib-bridge.ct.tsx`.
  });

  test('unregistering a closed dialog reports no second close', () => {
    // A modal that closed then unmounted is already reported; a second close puts observers behind.
    const dm = createDialogManager();
    const store = createFakeStore();
    const events: DialogManagerEvent[] = [];

    dm.register('m', { store });
    dm.subscribe((event) => {
      events.push(event);
    });
    openFully(store);
    dm.close('m', 'saved');
    store.transition('closed');
    const before = events.length;

    dm.unregister('m');

    // It leaves the registry, which is a fact of its own — and that is all it says.
    expect(events.slice(before)).toEqual([{ type: 'unregister', id: 'm' }]);
  });

  test('foreground, openDialogs order and z-index follow open order', () => {
    const dm = createDialogManager();
    const a = createFakeStore();
    const b = createFakeStore();
    dm.register('a', { store: a });
    dm.register('b', { store: b });

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
    expect(dm.getZIndex('a')).toBe(dm.zIndexBase);
    expect(dm.getZIndex('b')).toBe(dm.zIndexBase + 1);

    dm.close('b');
    b.transition('closed');
    expect(dm.getSnapshot().foreground?.id).toBe('a');
    expect(dm.lookup().isForeground('a')).toBe(true);
  });

  test('the lookup answers for a dialog that is not open, rather than for nothing', () => {
    // `isForeground` feeds a boolean prop and `getZIndex` a CSS value — `undefined` is no stacking.
    const dm = createDialogManager();
    const registered = createFakeStore();
    dm.register('registered', { store: registered });

    expect(dm.getSnapshot().foreground).toBeUndefined();
    expect(dm.lookup().isForeground('registered')).toBe(false);
    expect(dm.lookup().isForeground('never-registered')).toBe(false);

    // A closed dialog sits at the base, so one styled from this before it opens does not jump.
    expect(dm.getZIndex('registered')).toBe(dm.zIndexBase);
    expect(dm.getZIndex('never-registered')).toBe(dm.zIndexBase);

    openFully(registered);
    expect(dm.lookup().isForeground('registered')).toBe(true);
  });

  test('modal and non-modal dialogs are counted separately', () => {
    const dm = createDialogManager();
    const modal = createFakeStore();
    const nonModal = createFakeStore();
    dm.register('modal', { store: modal, template: 'modal', nonModal: false });
    dm.register('non-modal', { store: nonModal, template: 'modal', nonModal: true });

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
    dm.register('idle', { store });

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
    // An effect that never registered still unregisters on cleanup — no open to report.
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
    // Unlike `lookup(id).isVisible`, this reads `openDialogs` — a closed modal is absent from it.
    const dm = createDialogManager();
    const open = createFakeStore();
    const idle = createFakeStore();
    dm.register('open', { store: open });
    dm.register('idle', { store: idle });

    openFully(open);

    expect(dm.lookup().isVisible('open')).toBe(true);
    expect(dm.lookup().isVisible('idle')).toBe(false);
    expect(dm.lookup().isVisible('never-registered')).toBe(false);

    dm.close('open');
    open.transition('closed');
    expect(dm.lookup().isVisible('open')).toBe(false);
  });

  test('a store notification that moves no phase is not a transition', () => {
    // Only phase and `isPreparing` concern the manager; without the guard a modal with a running
    // action reports one open per keystroke to anything counting them.
    const dm = createDialogManager();
    const store = createFakeStore();
    const events: DialogManagerEvent[] = [];

    dm.register('m', { store });
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
