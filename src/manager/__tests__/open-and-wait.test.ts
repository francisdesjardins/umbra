import { expect, test } from '@playwright/test';
import type { AwaitedClose, ModalPhase } from '../../core/types.js';
import { createDialogManager } from '../dialog-manager.js';

/**
 * `dialogManager.openAndWait(id)` — the manager's own instruct-and-await, for code with no
 * component to hold a hook's. Two of its three promises are runtime ones and neither is provable
 * by the type fixtures: an id nobody registered answers rather than hanging, and a close that
 * lands *inside* the open is still heard.
 */

/** A store that resolves its close resolvers, which is the half `openAndWait` reads. */
function createResolvingStore(options: { readonly closeDuringOpen?: AwaitedClose<unknown> } = {}) {
  const listeners = new Set<() => void>();
  let phase: ModalPhase = 'closed';
  const closeResolvers: ((result: AwaitedClose<unknown>) => void)[] = [];

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const resolveAll = (result: AwaitedClose<unknown>) => {
    for (const resolve of closeResolvers.splice(0)) {
      resolve(result);
    }
  };

  return {
    addCloseResolver(resolve: (result: AwaitedClose<unknown>) => void): void {
      closeResolvers.push(resolve);
    },
    beginOpen(): void {
      phase = 'opening';
      notify();
      // The window a `prepare` that throws opens: the modal is closed again before `beginOpen`
      // has returned, so a caller that registered afterwards would wait forever.
      if (options.closeDuringOpen) {
        phase = 'closed';
        resolveAll(options.closeDuringOpen);
        notify();
      }
    },
    close(reason: string): boolean {
      if (phase === 'closed') {
        return false;
      }
      phase = 'closed';
      resolveAll([null, { reason, data: 'payload' }]);
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
      return { phase, isPreparing: false, closeResult: null };
    },
  };
}

test.describe('openAndWait', () => {
  test('opens the dialog and resolves with how it closed', async () => {
    const dm = createDialogManager();
    const store = createResolvingStore();
    dm.register('confirm', { store });

    const waiting = dm.openAndWait('confirm');
    expect(store.getSnapshot().phase).toBe('opening');

    dm.close('confirm', 'accept');

    expect(await waiting).toEqual([null, { reason: 'accept', data: 'payload' }]);
  });

  test('answers an unregistered id instead of leaving the caller waiting', async () => {
    const dm = createDialogManager();

    const [error, result] = await dm.openAndWait('nobody-registered-this');

    expect(error?.message).toBe('No modal registered with id "nobody-registered-this"');
    expect(result).toBeNull();
  });

  test('hears a close that happens inside the open', async () => {
    const dm = createDialogManager();
    const store = createResolvingStore({ closeDuringOpen: [null, { reason: 'dismiss' }] });
    dm.register('self-closing', { store });

    expect(await dm.openAndWait('self-closing')).toEqual([null, { reason: 'dismiss' }]);
  });
});
