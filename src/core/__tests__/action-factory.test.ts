import { expect, test } from '@playwright/test';
import { createActionEngine, type EngineSnapshot } from '../../actions/action-engine.js';
import { createActionFactory } from '../action-factory.js';
import type { ActionClickEvent } from '../../actions/types.js';

/**
 * The `action` factory — one function, two bindings, and no DOM in it at all.
 *
 * The design under test is the `readState` parameter: the factory reads the engine's state
 * through a callback the *binding* supplies, rather than from the engine's own getters. That is
 * what lets React hand it a `useSyncExternalStore` value and Solid a signal, and it is why the
 * three live props are getters. Both halves are assertable here, with neither framework present.
 */

const idle: EngineSnapshot = { states: {}, hasRunningAction: false, error: null };

/** The structural slice an action's `onClick` reads — no cast needed, which is the point. */
const clickEvent = (defaultPrevented = false): ActionClickEvent => {
  let prevented = defaultPrevented;
  return {
    get defaultPrevented() {
      return prevented;
    },
    preventDefault: () => {
      prevented = true;
    },
  };
};

test.describe('the props an action returns', () => {
  test('are all DOM props, and default `type` to button', () => {
    // A `<button>` inside a `<form>` defaults to `type="submit"`, so an action button in a form
    // modal would submit the form *and* run its handler. The default makes the spread safe.
    const engine = createActionEngine<void>('props');
    const action = createActionFactory(engine, () => {
      return idle;
    });

    expect(action('ok').type).toBe('button');
    expect(action('save', { type: 'submit' }).type).toBe('submit');
  });

  test('carry the canonical hotkey label, not the string as written', () => {
    // `aria-keyshortcuts` is what hotkey dispatch finds the button by, and what
    // `dismissKeyIsOwnedByAction` compares against — so all three have to agree by construction.
    const engine = createActionEngine<void>('label');
    const action = createActionFactory(engine, () => {
      return idle;
    });

    expect(action('save', { hotkey: 'Ctrl+s' })['aria-keyshortcuts']).toBe('Ctrl+S');
    expect(action('plain')['aria-keyshortcuts']).toBeUndefined();
  });

  test('mark the opening focus only when it was asked for', () => {
    const engine = createActionEngine<void>('focus');
    const action = createActionFactory(engine, () => {
      return idle;
    });

    expect(action('go', { focusOnOpen: true })['data-focus-on-open']).toBe(true);
    expect(action('stay')['data-focus-on-open']).toBeUndefined();
  });
});

test.describe('the live props', () => {
  test('read the snapshot the binding supplies, not the engine directly', () => {
    // The whole reason `readState` is a parameter. Swap what it returns and the *same* props
    // object reports the new value — which is a re-render for React and a tracked read for Solid.
    const engine = createActionEngine<void>('live');
    let snapshot: EngineSnapshot = idle;
    const action = createActionFactory(engine, () => {
      return snapshot;
    });

    const props = action('save');
    expect(props['data-loading']).toBe(false);
    expect(props.disabled).toBe(false);

    snapshot = {
      states: { save: { isRunning: true, error: null } },
      hasRunningAction: true,
      error: null,
    };

    expect(props['data-loading']).toBe(true);
    expect(props['aria-busy']).toBe(true);
    expect(props.disabled).toBe(true);
  });

  test('disable this button while *another* action runs', () => {
    // `data-loading` is this action's; `disabled` is the modal's. Two different scopes, which is
    // why they are two props rather than one.
    const engine = createActionEngine<void>('other');
    const snapshot: EngineSnapshot = {
      states: { other: { isRunning: true, error: null } },
      hasRunningAction: true,
      error: null,
    };
    const action = createActionFactory(engine, () => {
      return snapshot;
    });

    const props = action('save');
    expect(props['data-loading']).toBe(false);
    expect(props.disabled).toBe(true);
  });

  test('or a caller’s own reason, which can add but never remove', () => {
    const engine = createActionEngine<void>('or');
    const action = createActionFactory(engine, () => {
      return idle;
    });

    expect(action('save', { disabled: true }).disabled).toBe(true);
    expect(action('save', { disabled: false }).disabled).toBe(false);
  });
});

test.describe('declaring and running', () => {
  test('calling the factory is what declares the action', () => {
    // There is no config and no second hook: an action exists because it was rendered.
    const engine = createActionEngine<void>('declare');
    const action = createActionFactory(engine, () => {
      return idle;
    });

    expect(engine.hasActions()).toBe(false);
    action('confirm', { hotkey: 'Enter' });
    expect(engine.hasActions()).toBe(true);
    expect(engine.ownsHotkey('Enter')).toBe(true);
  });

  test('a handler-less action auto-closes with its own reason', async () => {
    const engine = createActionEngine<void, 'ok'>('auto');
    const closes: string[] = [];
    engine.bindClose((reason) => {
      closes.push(reason);
    });
    const action = createActionFactory(engine, () => {
      return idle;
    });

    await action('ok').onClick(clickEvent());

    expect(closes).toEqual(['ok']);
  });

  test('the caller’s onClick runs first and owns the veto', async () => {
    // Same protocol as `onKeyDown`: composing a click never has to mean replacing the action's.
    const engine = createActionEngine<void, 'ok'>('veto');
    const ran: string[] = [];
    const action = createActionFactory(engine, () => {
      return idle;
    });

    const props = action('ok', {
      onClick: (event) => {
        ran.push('caller');
        event.preventDefault();
      },
      onAction: () => {
        ran.push('action');
      },
    });

    await props.onClick(clickEvent());

    expect(ran).toEqual(['caller']);
  });

  test('an un-vetoed click runs the handler, in order', async () => {
    const engine = createActionEngine<void, 'ok'>('order');
    const ran: string[] = [];
    const action = createActionFactory(engine, () => {
      return idle;
    });

    await action('ok', {
      onClick: () => {
        ran.push('caller');
      },
      onAction: () => {
        ran.push('action');
      },
    }).onClick(clickEvent());

    expect(ran).toEqual(['caller', 'action']);
  });

  test('an event that arrived already prevented never reaches the handler', async () => {
    const engine = createActionEngine<void, 'ok'>('pre-vetoed');
    let ran = false;
    const action = createActionFactory(engine, () => {
      return idle;
    });

    await action('ok', {
      onAction: () => {
        ran = true;
      },
    }).onClick(clickEvent(true));

    expect(ran).toBe(false);
  });
});
