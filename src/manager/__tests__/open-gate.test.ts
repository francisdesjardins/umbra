import { expect, test } from '@playwright/test';
import type { DialogPhase, AwaitedClose } from '../../core/types.js';
import { createDialogManager, type DialogManagerEvent } from '../dialog-manager.js';
import { refusalFor, UNNAMED_REFUSAL, type OpenAttempt } from '../open-gate.js';

/**
 * The policy in front of every door. Two halves: what a gate's answer means (`refusalFor`, pure),
 * and that nothing routes around it — a cap or a kill switch is only true if every door asks.
 * The bindings' own `open()` is the other half of that claim and is tested where it lives,
 * `core/__tests__/dialog-runtime.test.ts` and one component test per binding.
 */

/** The manager's `RegisteredStore` contract, and nothing more. */
function createFakeStore() {
  const listeners = new Set<() => void>();
  let phase: DialogPhase = 'closed';

  return {
    beginOpen(): void {
      phase = 'opening';
      for (const listener of listeners) {
        listener();
      }
    },
    close(): boolean {
      return false;
    },
    addCloseResolver(_resolve: (result: AwaitedClose<unknown>) => void): void {},
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return { phase, isPreparing: false, closeResult: null } as const;
    },
    get phase() {
      return phase;
    },
  };
}

test.describe('refusalFor', () => {
  const attempt: OpenAttempt = { id: 'any', cause: 'instruct' };

  test('no gate is not a refusal', () => {
    expect(refusalFor(undefined, attempt)).toBeUndefined();
  });

  test('returning nothing opens, and returning a reason refuses with it', () => {
    expect(
      refusalFor(() => {
        return undefined;
      }, attempt)
    ).toBeUndefined();
    expect(
      refusalFor(() => {
        return 'kill-switch';
      }, attempt)
    ).toBe('kill-switch');
  });

  test('an empty reason still refuses — only undefined opens', () => {
    // The half that matters: a policy computing its reason and coming up empty must not be read
    // as consent, or a refusal turns into an open on the one path nobody writes a test for.
    expect(
      refusalFor(() => {
        return '';
      }, attempt)
    ).toBe(UNNAMED_REFUSAL);
  });

  test('a gate that throws admits, rather than taking every dialog down with it', () => {
    expect(
      refusalFor(() => {
        throw new Error('policy bug');
      }, attempt)
    ).toBeUndefined();
  });
});

test.describe('dialogManager.gate', () => {
  test('refuses open(id) without moving the store, and says so on the event stream', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('gated', { store });
    const events: DialogManagerEvent[] = [];
    dm.subscribe((event) => {
      events.push(event);
    });

    dm.gate(() => {
      return 'closed-for-maintenance';
    });

    expect(dm.open('gated')).toBe(false);
    expect(store.phase).toBe('closed');
    expect(events).toEqual([
      { type: 'refuse', id: 'gated', cause: 'instruct', reason: 'closed-for-maintenance' },
    ]);
  });

  test('refuses openAndWait(id) on the error branch, rather than leaving a caller waiting', async () => {
    const dm = createDialogManager();
    dm.register('gated', { store: createFakeStore() });
    dm.gate(() => {
      return 'nope';
    });

    const [error, result] = await dm.openAndWait('gated');
    expect(error?.message).toContain('nope');
    expect(result).toBeNull();
  });

  test('refuses an ask before the dialog is consulted', async () => {
    const dm = createDialogManager();
    let asked = false;
    dm.register('gated', {
      store: createFakeStore(),
      onOpenRequest: () => {
        asked = true;
      },
    });
    dm.gate(() => {
      return 'rate-limited';
    });

    const outcome = await dm.requestOpenAndWait('gated', { context: { source: 'shell' } });

    // The whole point of a gate above the library: the dialog's own handler never ran.
    expect(asked).toBe(false);
    expect(outcome).toEqual({ accepted: false, reason: 'rate-limited' });
  });

  test('the ask door carries the caller’s context to the policy and to the event', async () => {
    const dm = createDialogManager();
    const seen: OpenAttempt[] = [];
    const events: DialogManagerEvent[] = [];
    dm.register('gated', { store: createFakeStore(), onOpenRequest: () => {} });
    dm.subscribe((event) => {
      events.push(event);
    });
    dm.gate((attempt) => {
      seen.push(attempt);
      return 'denied';
    });

    await dm.requestOpenAndWait('gated', { context: { source: 'portal:nav' } });

    expect(seen).toEqual([{ id: 'gated', cause: 'ask', context: { source: 'portal:nav' } }]);
    expect(events).toEqual([
      {
        type: 'refuse',
        id: 'gated',
        cause: 'ask',
        reason: 'denied',
        context: { source: 'portal:nav' },
      },
    ]);
  });

  test('runs before the registry, so an unregistered id is the gate’s to refuse', () => {
    const dm = createDialogManager();
    const seen: string[] = [];
    dm.gate((attempt) => {
      seen.push(attempt.id);
      return 'never-this-one';
    });

    expect(dm.open('nobody-registered')).toBe(false);
    expect(seen).toEqual(['nobody-registered']);
  });

  test('a gate that admits leaves every door exactly as it was', () => {
    const dm = createDialogManager();
    const store = createFakeStore();
    dm.register('open-me', { store });
    dm.gate(() => {
      return undefined;
    });

    expect(dm.open('open-me')).toBe(true);
    expect(store.phase).toBe('opening');
  });

  test('the disposer lifts the policy, and a superseded one lifts nothing', () => {
    const dm = createDialogManager();
    dm.register('gated', { store: createFakeStore() });

    const removeFirst = dm.gate(() => {
      return 'first';
    });
    dm.gate(() => {
      return 'second';
    });

    // The first policy is already gone; its disposer must not take the second one with it.
    removeFirst();
    expect(dm.open('gated')).toBe(false);

    const removeSecond = dm.gate(() => {
      return 'third';
    });
    removeSecond();
    expect(dm.open('gated')).toBe(true);
  });
});
