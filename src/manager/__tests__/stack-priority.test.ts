import { expect, test } from '@playwright/test';
import type { AwaitedClose, ModalPhase } from '../../core/types.js';
import { createDialogManager } from '../dialog-manager.js';

/**
 * What a stack policy changes about the manager's own answers.
 *
 * Reordering the DOM needs a browser and is asserted in `stack-priority.ct.tsx`. Everything here is
 * the half that does not: the snapshot's order, which dialog is the foreground, and the z-index each
 * one is stamped with. That half matters on its own — `isForeground` is what decides which dialog
 * answers the dismiss key and which one a click-outside belongs to, so a policy that moved the
 * paint order and left those behind would put the visible dialog behind the one that owns Escape.
 */
function createFakeStore() {
  const listeners = new Set<() => void>();
  let phase: ModalPhase = 'closed';

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    addCloseResolver(_resolve: (result: AwaitedClose<unknown>) => void): void {
      // Nothing here awaits a close.
    },
    beginOpen(): void {
      if (phase !== 'closed') {
        return;
      }
      phase = 'opening';
      notify();
      phase = 'open';
      notify();
    },
    close(_reason: string): boolean {
      if (phase === 'closing' || phase === 'closed') {
        return false;
      }
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
      return { phase, isPreparing: false, closeResult: null };
    },
  };
}

function stackOf(manager: ReturnType<typeof createDialogManager>): string[] {
  return manager.getSnapshot().openDialogs.map((d) => {
    return d.id;
  });
}

test.describe('prioritize', () => {
  test('a high-priority dialog is the foreground even when it opened first', () => {
    const manager = createDialogManager();
    manager.register('warning', { store: createFakeStore(), template: 'alert' });
    manager.register('panel', { store: createFakeStore(), template: 'slide' });

    manager.prioritize((modal) => {
      return modal.template === 'alert' ? 100 : 0;
    });

    manager.open('warning');
    manager.open('panel');

    // Without the policy this is ['warning', 'panel'] and the panel is in front — the race this
    // exists to settle, where a deep link's panel lands on top of an interruption.
    expect(stackOf(manager)).toEqual(['panel', 'warning']);
    expect(manager.getSnapshot().foreground?.id).toBe('warning');
    expect(manager.lookup().isForeground('warning')).toBe(true);
    expect(manager.lookup('panel').isForeground).toBe(false);
  });

  test('the stamped z-index follows the policy, not the open order', () => {
    const manager = createDialogManager();
    manager.register('warning', { store: createFakeStore(), template: 'alert' });
    manager.register('panel', { store: createFakeStore(), template: 'slide' });
    manager.prioritize((modal) => {
      return modal.template === 'alert' ? 1 : 0;
    });

    manager.open('warning');
    manager.open('panel');

    // It is what orders a *non-modal* dialog, which is never in the top layer.
    expect(manager.getZIndex('panel')).toBe(manager.zIndexBase);
    expect(manager.getZIndex('warning')).toBe(manager.zIndexBase + 1);
  });

  test('it applies to dialogs already open, not only to the ones opened after', () => {
    const manager = createDialogManager();
    manager.register('warning', { store: createFakeStore(), template: 'alert' });
    manager.register('panel', { store: createFakeStore(), template: 'slide' });
    manager.open('warning');
    manager.open('panel');
    expect(stackOf(manager)).toEqual(['warning', 'panel']);

    manager.prioritize((modal) => {
      return modal.template === 'alert' ? 100 : 0;
    });

    expect(stackOf(manager)).toEqual(['panel', 'warning']);
  });

  test('the disposer restores open order', () => {
    const manager = createDialogManager();
    manager.register('warning', { store: createFakeStore(), template: 'alert' });
    manager.register('panel', { store: createFakeStore(), template: 'slide' });
    const stop = manager.prioritize((modal) => {
      return modal.template === 'alert' ? 100 : 0;
    });

    manager.open('warning');
    manager.open('panel');
    expect(stackOf(manager)).toEqual(['panel', 'warning']);

    stop();

    expect(stackOf(manager)).toEqual(['warning', 'panel']);
  });

  test('a second call replaces the first, and the stale disposer does nothing', () => {
    const manager = createDialogManager();
    manager.register('a', { store: createFakeStore() });
    manager.register('b', { store: createFakeStore() });
    const stopFirst = manager.prioritize((modal) => {
      return modal.id === 'a' ? 1 : 0;
    });
    manager.prioritize((modal) => {
      return modal.id === 'b' ? 1 : 0;
    });

    manager.open('a');
    manager.open('b');
    expect(stackOf(manager)).toEqual(['a', 'b']);

    // One project-wide rule, not a stack of them: the replaced policy's disposer must not put the
    // manager back to open order behind the live policy's back.
    stopFirst();

    expect(stackOf(manager)).toEqual(['a', 'b']);
  });

  test('a closed dialog leaves the stack and the rest keep the policy order', () => {
    const manager = createDialogManager();
    manager.register('warning', { store: createFakeStore(), template: 'alert' });
    manager.register('panel', { store: createFakeStore(), template: 'slide' });
    manager.register('other', { store: createFakeStore(), template: 'slide' });
    manager.prioritize((modal) => {
      return modal.template === 'alert' ? 100 : 0;
    });

    manager.open('warning');
    manager.open('panel');
    manager.open('other');
    expect(stackOf(manager)).toEqual(['panel', 'other', 'warning']);

    manager.close('panel');

    expect(stackOf(manager)).toEqual(['other', 'warning']);
    expect(manager.getZIndex('other')).toBe(manager.zIndexBase);
    expect(manager.getZIndex('warning')).toBe(manager.zIndexBase + 1);
  });

  test('an id nobody prioritised keeps open order among its equals', () => {
    const manager = createDialogManager();
    manager.register('first', { store: createFakeStore() });
    manager.register('second', { store: createFakeStore() });
    manager.register('third', { store: createFakeStore() });
    manager.prioritize(() => {
      return 0;
    });

    manager.open('second');
    manager.open('third');
    manager.open('first');

    expect(stackOf(manager)).toEqual(['second', 'third', 'first']);
  });

  test('a non-modal dialog is under every modal one, whatever the policy asks for', () => {
    const manager = createDialogManager();
    manager.register('modal', { store: createFakeStore(), template: 'alert' });
    manager.register('panel', { store: createFakeStore(), template: 'slide', nonModal: true });
    // A policy shouting for the panel. It orders the panel against the other panels and moves it no
    // nearer the user — the platform paints top-layer elements above ordinary ones and no `z-index`
    // reaches between them, so an order claiming otherwise would be false rather than debatable.
    manager.prioritize((modal) => {
      return modal.nonModal ? 1000 : 0;
    });

    manager.open('modal');
    manager.open('panel');

    expect(stackOf(manager)).toEqual(['panel', 'modal']);
    expect(manager.getSnapshot().foreground?.id).toBe('modal');
    // The consequence that made this a defect rather than a cosmetic ordering: `isForeground` is what
    // decides who answers the dismiss key, so naming the panel sent Escape to the dialog underneath
    // while the user was looking at the one above it.
    expect(manager.lookup().isForeground('panel')).toBe(false);
    expect(manager.getZIndex('panel')).toBe(manager.zIndexBase);
    expect(manager.getZIndex('modal')).toBe(manager.zIndexBase + 1);
  });

  test('and it holds with no policy at all, which is the default that changed', () => {
    const manager = createDialogManager();
    manager.register('modal', { store: createFakeStore() });
    manager.register('panel', { store: createFakeStore(), nonModal: true });

    // The panel opens *later*, so open order alone would put it in front.
    manager.open('modal');
    manager.open('panel');

    expect(stackOf(manager)).toEqual(['panel', 'modal']);
    expect(manager.getSnapshot().foreground?.id).toBe('modal');
  });

  test('within one family the policy still decides', () => {
    const manager = createDialogManager();
    manager.register('first-panel', { store: createFakeStore(), nonModal: true });
    manager.register('second-panel', { store: createFakeStore(), nonModal: true });
    manager.prioritize((modal) => {
      return modal.id === 'first-panel' ? 5 : 0;
    });

    manager.open('first-panel');
    manager.open('second-panel');

    // Both non-modal, so the modality key is a tie and the rank is what is left to break it.
    expect(stackOf(manager)).toEqual(['second-panel', 'first-panel']);
  });

  test('syncStackOrder is safe to call at any time, policy or not', () => {
    const manager = createDialogManager();
    manager.register('a', { store: createFakeStore() });
    manager.open('a');

    // The lifecycle calls it after every `showModal()`, including for dialogs whose manager has no
    // policy at all — so it has to be a no-op rather than a throw.
    expect(() => {
      manager.syncStackOrder();
      manager.syncStackOrder('a');
      manager.syncStackOrder('never-registered');
    }).not.toThrow();
  });
});
