import { expect, test } from '@playwright/test';
import { createDialogManager } from '../dialog-manager.js';
import { createDialogStore } from '../../core/dialog-store.js';
import { lookupIn } from '../lookup.js';

// Two sources, and both are needed: the snapshot carries the open dialogs and is what makes a
// subscriber re-render, while `lookup` answers for one that is registered and closed, or absent.

const registered = (id: string) => {
  const manager = createDialogManager();
  const store = createDialogStore(id);
  manager.register(id, { store, template: 'dialog', nonModal: false });
  return { manager, store };
};

test.describe('lookupIn', () => {
  test('an open dialog comes from the snapshot, by reference', () => {
    const { manager, store } = registered('open-one');
    store.beginOpen();

    const snapshot = manager.getSnapshot();
    const found = lookupIn('open-one', { manager, snapshot });

    // The same object the snapshot holds, not a copy — a subscriber comparing references relies
    // on it, which is the whole reason the open branch reads the snapshot at all.
    expect(found).toBe(
      snapshot.openDialogs.find((info) => {
        return info.id === 'open-one';
      })
    );
  });

  test('a registered but closed one falls through to the manager', () => {
    const { manager } = registered('closed-one');

    const found = lookupIn('closed-one', { manager, snapshot: manager.getSnapshot() });

    expect(found.exists).toBe(true);
    expect(found.isVisible).toBe(false);
  });

  test('and one nobody registered is answered rather than thrown at', () => {
    const manager = createDialogManager();

    expect(lookupIn('nowhere', { manager, snapshot: manager.getSnapshot() }).exists).toBe(false);
  });

  test('a snapshot that predates the open still answers correctly, through the manager', () => {
    // The snapshot chooses the *source*, not the truth: one taken too early misses the dialog and
    // the live fallback answers instead, so a stale one costs the stable reference and never
    // correctness.
    const { manager, store } = registered('stale');
    const before = manager.getSnapshot();
    store.beginOpen();

    const throughManager = lookupIn('stale', { manager, snapshot: before });
    expect(throughManager.isVisible).toBe(true);
    expect(before.openDialogs).toHaveLength(0);

    const fresh = manager.getSnapshot();
    expect(lookupIn('stale', { manager, snapshot: fresh })).toBe(fresh.openDialogs[0]);
  });
});
