import { expect, test } from '@playwright/test';
import { keyboardEvent } from '../../__tests__/fake-events.js';
import { setLogLevel } from '../../utils/logger.js';
import { createActionEngine } from '../action-engine.js';

/**
 * The action engine, on its own.
 *
 * It had no unit test: everything it does was reached through a React component test, which is a
 * browser and a render pass away from the question being asked. But the engine is a store and a
 * handler runner with no DOM in it at all — the declaration window, the hotkey table, the
 * aggregation and the error capture are decidable here, and they are the rules **both** bindings
 * depend on.
 */

test.describe('running an action', () => {
  test('reports a run through the aggregate, and settles back to idle', async () => {
    const engine = createActionEngine<void>('run');
    expect(engine.aggregated().hasRunningAction).toBe(false);

    let observedWhileRunning = false;
    await engine.run('save', () => {
      observedWhileRunning = engine.aggregated().hasRunningAction;
    });

    expect(observedWhileRunning).toBe(true);
    expect(engine.aggregated().hasRunningAction).toBe(false);
    expect(engine.stateOf('save')).toEqual({ isRunning: false, error: null });
  });

  test('captures what a handler throws instead of letting it escape', async () => {
    const engine = createActionEngine<void>('throw');

    // Not re-thrown: the button is spread onto user markup, and an unhandled rejection there is
    // a broken modal rather than a reported one. It surfaces on `error`.
    await engine.run('save', () => {
      throw new Error('nope');
    });

    expect(engine.stateOf('save').error?.message).toBe('nope');
    expect(engine.aggregated().error?.message).toBe('nope');
    expect(engine.aggregated().hasRunningAction).toBe(false);
  });

  test('normalises a non-Error throw', async () => {
    const engine = createActionEngine<void>('throw-string');
    await engine.run('save', () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- the case under test
      throw 'just a string';
    });
    expect(engine.aggregated().error).toBeInstanceOf(Error);
    expect(engine.aggregated().error?.message).toBe('just a string');
  });

  test('a later success clears the error it replaces', async () => {
    const engine = createActionEngine<void>('recover');
    await engine.run('save', () => {
      throw new Error('first try');
    });
    expect(engine.aggregated().error).not.toBeNull();

    await engine.run('save', () => {});
    expect(engine.aggregated().error).toBeNull();
  });

  test('closes through the bound close, with the action’s own reason and payload', async () => {
    const engine = createActionEngine<{ id: number }, 'confirm'>('close');
    const closes: [string, unknown][] = [];
    engine.bindClose((reason, data) => {
      closes.push([reason, data]);
    });

    await engine.run('confirm', (close) => {
      close({ id: 3 });
    });

    expect(closes).toEqual([['confirm', { id: 3 }]]);
  });

  test('one running action is visible to every other', async () => {
    // What `disabled` on every button is computed from: the aggregate is the modal's, not the
    // action's, so a second action cannot start while the first is in flight.
    const engine = createActionEngine<void>('overlap');
    let seen = false;

    await engine.run('slow', async () => {
      seen = engine.aggregated().hasRunningAction;
      await Promise.resolve();
    });

    expect(seen).toBe(true);
  });
});

test.describe('the declaration window', () => {
  test('a render pass replaces the previous pass’s actions rather than adding to them', () => {
    const engine = createActionEngine<void>('window');

    engine.beginRender();
    engine.declare('save', 'Enter');
    engine.declare('cancel', 'Escape');
    engine.endRender();
    expect(engine.hasActions()).toBe(true);
    expect(engine.ownsHotkey('Escape')).toBe(true);

    // The pass that no longer draws Cancel must retire its hotkey — otherwise it goes on
    // suppressing the dismiss key for a button nobody can see.
    engine.beginRender();
    engine.declare('save', 'Enter');
    engine.endRender();
    expect(engine.ownsHotkey('Escape')).toBe(false);
    expect(engine.ownsHotkey('Enter')).toBe(true);
  });

  test('a declaration made outside a pass lands on the live table', () => {
    // This is the fine-grained renderer's path: Solid never re-runs the parent, so a button
    // inside a `<Show>` declares itself after `endRender` has already swapped.
    const engine = createActionEngine<void>('late');
    engine.beginRender();
    engine.endRender();

    engine.declare('confirm', 'Enter');
    expect(engine.hasActions()).toBe(true);
    expect(engine.ownsHotkey('Enter')).toBe(true);
  });

  test('undeclare retires an action, and with it the backdrop opt-in', () => {
    // `hasActions()` is what decides whether a backdrop click dismisses, so this is not merely a
    // stale hotkey: without it a modal that has drawn its last action stays silently opt-in.
    const engine = createActionEngine<void>('undeclare');
    engine.declare('confirm', 'Enter');
    expect(engine.hasActions()).toBe(true);

    engine.undeclare('confirm');
    expect(engine.hasActions()).toBe(false);
    expect(engine.ownsHotkey('Enter')).toBe(false);
  });

  test('an action with no hotkey still counts as an action', () => {
    const engine = createActionEngine<void>('no-hotkey');
    engine.declare('ok', undefined);
    expect(engine.hasActions()).toBe(true);
    expect(engine.matchHotkey(keyboardEvent('Enter'))).toBeNull();
  });
});

test.describe('hotkeys', () => {
  test('matches the declaring action, modifiers included', () => {
    const engine = createActionEngine<void>('match');
    engine.declare('save', 'Ctrl+s');
    engine.declare('quit', 'Escape');

    expect(engine.matchHotkey(keyboardEvent('s', { ctrlKey: true }))).toMatchObject({
      reason: 'save',
      hotkey: 'Ctrl+s',
    });
    // The modifier list is what discriminates: a bare `s` is not `Ctrl+s`.
    expect(engine.matchHotkey(keyboardEvent('s'))).toBeNull();
    expect(engine.matchHotkey(keyboardEvent('Escape'))).toMatchObject({ reason: 'quit' });
  });

  test('ownsHotkey compares labels, not raw strings', () => {
    // `'Shift+s'` and `'Shift+S'` are one hotkey — the modifier list discriminates, and CapsLock
    // must not change which one fires. The dismiss-key gate in `attach-keydown` relies on exactly this.
    const engine = createActionEngine<void>('labels');
    engine.declare('shout', 'Shift+s');

    expect(engine.ownsHotkey('Shift+S')).toBe(true);
    expect(engine.ownsHotkey('Shift+s')).toBe(true);
    expect(engine.ownsHotkey('s')).toBe(false);
  });

  test('hasActions is false until something is drawn', () => {
    // The default that follows: a modal drawing no actions is dismissible by a backdrop click.
    expect(createActionEngine<void>('empty').hasActions()).toBe(false);
  });
});

test.describe('subscription', () => {
  test('notifies on every state transition, which is what focus restoration rides on', async () => {
    const engine = createActionEngine<void>('subscribe');
    let notifications = 0;
    const unsubscribe = engine.subscribe(() => {
      notifications += 1;
    });

    await engine.run('save', () => {});

    // Started and settled: the focus coordinator watches for exactly this running → idle edge,
    // and a single coalesced notification would lose it.
    expect(notifications).toBeGreaterThanOrEqual(2);

    unsubscribe();
    await engine.run('save', () => {});
    expect(notifications).toBeGreaterThanOrEqual(2);
  });
});

test.describe('the edges', () => {
  test('warns when a second action starts while one is running', () => {
    // Every binding disables every button while an action runs, so overlap means something
    // bypassed that — a caller's own wrapper dropping `disabled`, or a programmatic run. The
    // engine does not refuse it (it has no business vetoing the caller) but it says so.
    const engine = createActionEngine<void, 'save' | 'other'>('overlap');
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    const originalDebug = console.debug;
    console.warn = (...args) => {
      warnings.push(args);
    };
    // Swallowed rather than left to print: enabling the namespace turns on its `debug` lines too,
    // and a passing test should not write four of them to the run's output.
    console.debug = () => {
      return;
    };
    // The logger is silent until a pattern says otherwise, warnings included — so a test that
    // asserts on one has to turn it on, or it asserts on the logger being off.
    setLogLevel('action');

    try {
      let releaseFirst = () => {
        return;
      };
      const first = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      void engine.run('save', async () => {
        await first;
      });
      void engine.run('other', () => {
        return;
      });

      releaseFirst();

      expect(warnings).toHaveLength(1);
      expect(String(warnings[0]?.[0])).toContain('Action overlap');
    } finally {
      console.warn = originalWarn;
      console.debug = originalDebug;
      setLogLevel(false);
    }
  });

  test('an action that has never run reports the idle state, not undefined', () => {
    const engine = createActionEngine<void, 'save'>('never');

    expect(engine.stateOf('save')).toEqual({ isRunning: false, error: null });
  });

  test('undeclaring mid-pass retires from the pass, not from the live table', () => {
    // `undeclare` writes to whichever table is open — the pending one during a render pass, the
    // live one outside it. A fine-grained binding removes a button inside a pass, and the
    // declaration has to leave with the pass rather than reach back into what is on screen.
    const engine = createActionEngine<void, 'save'>('undeclare-pending');

    engine.declare('save', 'Enter');
    expect(engine.ownsHotkey('Enter')).toBe(true);

    engine.beginRender();
    engine.declare('save', 'Enter');
    engine.undeclare('save');
    // Still the previous pass's table: nothing has been swapped in yet.
    expect(engine.ownsHotkey('Enter')).toBe(true);

    engine.endRender();
    expect(engine.ownsHotkey('Enter')).toBe(false);
    expect(engine.hasActions()).toBe(false);
  });
});
