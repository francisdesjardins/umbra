import { expect, test } from '@playwright/test';
import { keyboardEvent } from '../../__tests__/fake-events.js';
import { setLogLevel } from '../../utils/logger.js';
import { createActionEngine, runDeclarationWindow } from '../action-engine.js';

// The action engine alone — a store and a handler runner with no DOM, so the declaration window,
// the hotkey table, aggregation and error capture are decidable here, shared by both bindings.

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

    // Not re-thrown: a rejection in user markup breaks the modal. It surfaces on `error` instead.
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
    // What `disabled` on every button reads: the aggregate is the modal's, not the action's.
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

    // A pass that no longer draws Cancel must retire its hotkey, or it keeps suppressing dismiss.
    engine.beginRender();
    engine.declare('save', 'Enter');
    engine.endRender();
    expect(engine.ownsHotkey('Escape')).toBe(false);
    expect(engine.ownsHotkey('Enter')).toBe(true);
  });

  test('a declaration made outside a pass lands on the live table', () => {
    // Solid's fine-grained path: a button inside a `<Show>` declares after `endRender` swapped.
    const engine = createActionEngine<void>('late');
    engine.beginRender();
    engine.endRender();

    engine.declare('confirm', 'Enter');
    expect(engine.hasActions()).toBe(true);
    expect(engine.ownsHotkey('Enter')).toBe(true);
  });

  test('undeclare retires an action, and with it the backdrop opt-in', () => {
    // `hasActions()` gates backdrop dismiss, so a stale one leaves a spent modal silently opt-in.
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

// Both hook bindings wrap their `render` in `runDeclarationWindow`; all it adds over calling
// `beginRender`/`endRender` in a row is what happens when the call between them throws.
test.describe('the declaration window as a wrapper', () => {
  test('hands the render’s value back, having opened and closed the window around it', () => {
    const engine = createActionEngine<void, 'save'>('wrap');
    const seen: string[] = [];

    const content = runDeclarationWindow(
      {
        beginRender() {
          seen.push('begin');
          engine.beginRender();
        },
        endRender() {
          seen.push('end');
          engine.endRender();
        },
      },
      () => {
        seen.push('render');
        engine.declare('save', 'Enter');
        return 'the rendered node';
      }
    );

    expect(content).toBe('the rendered node');
    expect(seen).toEqual(['begin', 'render', 'end']);
    expect(engine.ownsHotkey('Enter')).toBe(true);
  });

  test('a render that throws closes the window anyway, and the throw is not swallowed', () => {
    // The `finally` is the point, asserted through what it costs: `endRender` swaps the pending
    // table in, so a window left open leaves `hasActions()` answering from an unfinished pass.
    const engine = createActionEngine<void, 'save' | 'cancel'>('abandoned');

    runDeclarationWindow(engine, () => {
      engine.declare('save', 'Enter');
      engine.declare('cancel', 'Escape');
    });
    expect(engine.ownsHotkey('Escape')).toBe(true);

    expect(() => {
      runDeclarationWindow(engine, (): void => {
        engine.declare('save', 'Enter');
        throw new Error('half a pass');
      });
    }).toThrow('half a pass');

    // The swap happened: the interrupted pass declared `save` only, so `cancel` is retired.
    expect(engine.ownsHotkey('Enter')).toBe(true);
    expect(engine.ownsHotkey('Escape')).toBe(false);
    expect(engine.hasActions()).toBe(true);
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

  test('ownsHotkey compares the canonical form, not raw strings', () => {
    // `Shift+s` and `Shift+S` are one hotkey, CapsLock included; `attach-keydown`'s gate needs it.
    const engine = createActionEngine<void>('labels');
    engine.declare('shout', 'Shift+s');

    expect(engine.ownsHotkey('Shift+S')).toBe(true);
    expect(engine.ownsHotkey('Shift+s')).toBe(true);
    expect(engine.ownsHotkey('s')).toBe(false);
  });

  test('ownsHotkey survived the move to the ARIA spelling', () => {
    // Canonicalised through `formatAriaKeyshortcuts`, so attribute, dispatch and this all agree.
    const engine = createActionEngine<void>('aria-form');
    engine.declare('save', 'Ctrl+s');

    expect(engine.ownsHotkey('Ctrl+S')).toBe(true);
    expect(engine.ownsHotkey('Ctrl+d')).toBe(false);
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

    // Focus restoration watches the running → idle edge, so a coalesced notification loses it.
    expect(notifications).toBeGreaterThanOrEqual(2);

    unsubscribe();
    await engine.run('save', () => {});
    expect(notifications).toBeGreaterThanOrEqual(2);
  });
});

test.describe('the edges', () => {
  test('warns when a second action starts while one is running', () => {
    // Every binding disables every button while an action runs, so overlap means something bypassed
    // that — a wrapper dropping `disabled`, or a programmatic run. Warned, never vetoed.
    const engine = createActionEngine<void, 'save' | 'other'>('overlap');
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    const originalDebug = console.debug;
    console.warn = (...args) => {
      warnings.push(args);
    };
    // Swallowed: enabling the namespace turns on its `debug` lines too, which need not print.
    console.debug = () => {
      return;
    };
    // The logger is silent until a pattern says otherwise, warnings included — so turn it on.
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

  test('warns once when an action is declared with the reserved dismiss reason', () => {
    // `ActionReason` excludes `'dismiss'`, but `Exclude<string, 'dismiss'>` is `string`, so the
    // default `TReason` — used here on purpose — gets no type error and needs the runtime guard.
    const engine = createActionEngine<void>('reserved');
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    const originalDebug = console.debug;
    console.warn = (...args) => {
      warnings.push(args);
    };
    console.debug = () => {
      return;
    };
    setLogLevel('action');

    try {
      engine.declare('dismiss', undefined);
      // Every pass re-declares, so a per-call warning would be a per-frame warning.
      engine.beginRender();
      engine.declare('dismiss', undefined);
      engine.endRender();

      expect(warnings).toHaveLength(1);
      expect(String(warnings[0]?.[0])).toContain('reserved dismiss reason');

      // Warned, not refused: the declaration still lands and `hasActions()` still counts it.
      expect(engine.hasActions()).toBe(true);
    } finally {
      console.warn = originalWarn;
      console.debug = originalDebug;
      setLogLevel(false);
    }
  });

  test('a named action never trips the reserved-reason warning', () => {
    // The negative half: a guard that always fires would pass while warning on every action.
    const engine = createActionEngine<void, 'save' | 'cancel'>('not-reserved');
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    const originalDebug = console.debug;
    console.warn = (...args) => {
      warnings.push(args);
    };
    console.debug = () => {
      return;
    };
    setLogLevel('action');

    try {
      engine.declare('save', 'Enter');
      engine.declare('cancel', 'Escape');

      expect(warnings).toHaveLength(0);
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
    // `undeclare` writes to whichever table is open — pending during a pass, live outside it — so a
    // button removed mid-pass leaves with the pass instead of reaching what is on screen.
    const engine = createActionEngine<void, 'save'>('undeclare-pending');

    engine.declare('save', 'Enter');
    expect(engine.ownsHotkey('Enter')).toBe(true);

    engine.beginRender();
    engine.declare('save', 'Enter');
    engine.undeclare('save');
    expect(engine.ownsHotkey('Enter')).toBe(true);

    engine.endRender();
    expect(engine.ownsHotkey('Enter')).toBe(false);
    expect(engine.hasActions()).toBe(false);
  });
});
