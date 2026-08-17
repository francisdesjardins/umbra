import { expect, test } from '@playwright/test';
import type { AwaitedClose, ModalPhase } from '../../core/types.js';
import { createDialogManager } from '../dialog-manager.js';
import {
  createLockOwner,
  getScrollbarWidth,
  lockBodyScroll,
  unlockBodyScroll,
} from '../scroll-lock.js';

/**
 * The manager on a server, where there is no `document` at all.
 *
 * Six `typeof document === 'undefined'` guards stand between the manager and the DOM, and the unit
 * project is the only place their early return is the branch taken — every other manager test
 * crosses them incidentally, which covers the lines and asserts nothing about the contract. This
 * file is that assertion: a render pass may build a manager, register its dialogs, open and close
 * them and read the snapshot back, and none of it may reach for a document.
 *
 * It belongs in one place rather than spread across the suites that cross those guards anyway,
 * because incidental cover is one reorganisation away from disappearing with nothing to say what
 * went.
 */

/** The environment itself, first: with a DOM in scope every assertion below is vacuously true. */
test('the unit project really has no document', () => {
  expect(typeof document).toBe('undefined');
  expect(typeof window).toBe('undefined');
});

/** Minimal `RegisteredStore` — the phase machine and nothing else a server pass would touch. */
function createServerStore() {
  const listeners = new Set<() => void>();
  let phase: ModalPhase = 'closed';
  let closeReason: string | undefined;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    beginOpen(): void {
      phase = 'opening';
      notify();
    },
    close(reason: string): boolean {
      closeReason = reason;
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
    getSnapshot: () => {
      return {
        phase,
        isPreparing: false,
        closeResult: closeReason === undefined ? null : { reason: closeReason },
      };
    },
    addCloseResolver(_resolve: (result: AwaitedClose<unknown>) => void): void {
      // A server pass never settles a close, so nothing is ever resolved.
    },
  };
}

test.describe('the manager during a server render', () => {
  test('builds, registers and reports without a document', () => {
    const dm = createDialogManager();
    const store = createServerStore();
    dm.register('m', { store });

    expect(dm.lookup().exists('m')).toBe(true);
    expect(dm.lookup().getRegisteredCount()).toBe(1);
    expect(dm.getSnapshot().openDialogs).toHaveLength(0);
  });

  /**
   * `open` reaches both the event dispatch and the scroll-lock sync, which are two of the four
   * guards in this module — a modal dialog, because a non-modal one never asks for the lock.
   */
  test('opens and closes a modal dialog, dispatching no DOM event', () => {
    const dm = createDialogManager();
    const store = createServerStore();
    dm.register('m', { store });

    dm.open('m');
    expect(
      dm.getSnapshot().openDialogs.map((d) => {
        return d.id;
      })
    ).toEqual(['m']);
    expect(dm.lookup('m').phase).toBe('opening');

    dm.close('m', 'save');
    expect(dm.getSnapshot().openDialogs).toHaveLength(0);
    expect(dm.lookup('m').phase).toBe('closed');
  });

  /**
   * The stack sync is guarded twice, and only the second guard is this file's: a manager with no
   * policy returns before it, so the document check is reachable only once one is installed.
   */
  test('installing a stack policy orders nothing and raises nothing', () => {
    const dm = createDialogManager();
    const a = createServerStore();
    const b = createServerStore();
    dm.register('a', { store: a });
    dm.register('b', { store: b });
    dm.open('a');
    dm.open('b');

    const remove = dm.prioritize(() => {
      return 1;
    });
    expect(dm.getSnapshot().openDialogs).toHaveLength(2);

    dm.syncStackOrder();
    remove();
    expect(dm.getSnapshot().openDialogs).toHaveLength(2);
  });

  /** Per-request instances: two managers on one server pass share no registry. */
  test('two managers are independent', () => {
    const first = createDialogManager();
    const second = createDialogManager();
    first.register('only-mine', { store: createServerStore() });

    expect(first.lookup().exists('only-mine')).toBe(true);
    expect(second.lookup().exists('only-mine')).toBe(false);
  });
});

test.describe('the scroll lock during a server render', () => {
  /** No layout to measure, and `window` is not there to be asked. */
  test('there is no scrollbar to compensate', () => {
    expect(getScrollbarWidth()).toBe(0);
  });

  /**
   * The guard sits ahead of the ledger claim on purpose: a server pass that seeded it would leave
   * the first real lock in the hydrated page with nothing to apply.
   */
  test('claiming and releasing the lock are no-ops rather than errors', () => {
    const owner = createLockOwner();

    expect(() => {
      lockBodyScroll(owner);
    }).not.toThrow();
    expect(() => {
      unlockBodyScroll(owner);
    }).not.toThrow();
  });
});
