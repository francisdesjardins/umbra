import { expect, test } from '@playwright/test';
import { installFakeFrames, type FrameControl } from '../../__tests__/fake-frames.js';
import { createActionEngine } from '../../actions/action-engine.js';
import { createDialogManager } from '../../manager/dialog-manager.js';
import { setLogLevel } from '../../utils/logger.js';
import {
  answerBackdropClick,
  createDialogRuntime,
  resolveDialogOptions,
  resolvePortalHost,
  shouldDismissOnBackdropClick,
  teardownDialog,
} from '../dialog-runtime.js';

// The parts of a dialog both bindings share, tested where they live rather than twice through two
// renderers — before the second binding, every answer here was only exercised through React.

// The store cancels a pending frame on every close, and Node has none — see `fake-frames.ts`.
let frames: FrameControl;
test.beforeEach(() => {
  frames = installFakeFrames();
});
test.afterEach(() => {
  frames.restore();
});

/** No element to walk: these tests are the runtime's own logic, and Node has no `<dialog>`. */
const noDialog = () => {
  return null;
};

test.describe('resolveDialogOptions', () => {
  test('applies the defaults a bare dialog relies on', () => {
    expect(resolveDialogOptions({})).toMatchObject({
      isNonModal: false,
      isPortaled: false,
      dismissWhilePreparing: true,
      dismissKey: 'Escape',
      template: 'dialog',
      // `undefined`, not `false`: "decide from whether any action was drawn", a third state.
      dismissOnBackdropClick: undefined,
      dismissOnClickOutside: false,
    });
  });

  test('a value the caller passed wins over every default', () => {
    // A resolver returning the table verbatim passed the defaults test; these four sit behind a
    // `??`, where an option is dropped silently — `containFocus: true` doing nothing, not an error.
    expect(
      resolveDialogOptions({
        dismissWhilePreparing: false,
        dismissKey: 'Enter',
        containFocus: true,
        template: 'slide',
      })
    ).toMatchObject({
      dismissWhilePreparing: false,
      dismissKey: 'Enter',
      containFocus: true,
      template: 'slide',
    });
  });

  test('reads dismissOnBackdropClick only on the modal branch', () => {
    expect(resolveDialogOptions({ dismissOnBackdropClick: true }).dismissOnBackdropClick).toBe(
      true
    );

    // No backdrop to click. The option is `never` here, and one from an untyped caller is ignored.
    expect(
      resolveDialogOptions({ nonModal: true, dismissOnClickOutside: true }).dismissOnBackdropClick
    ).toBeUndefined();
  });

  test('reads dismissOnClickOutside only on the non-modal branch', () => {
    expect(
      resolveDialogOptions({ nonModal: true, dismissOnClickOutside: true }).dismissOnClickOutside
    ).toBe(true);
    // Opt-in even on its own branch, because the panel sits over a live page.
    expect(resolveDialogOptions({ nonModal: true }).dismissOnClickOutside).toBe(false);
    expect(resolveDialogOptions({ dismissOnBackdropClick: true }).dismissOnClickOutside).toBe(
      false
    );
  });

  test('an explicit nonModal: false reads the same as leaving it out', () => {
    // `nonModal` is optional *and* has a `false` branch, so both spellings must resolve alike.
    expect(
      resolveDialogOptions({ nonModal: false, dismissOnBackdropClick: true }).dismissOnBackdropClick
    ).toBe(true);
    expect(resolveDialogOptions({ nonModal: false }).isNonModal).toBe(false);
    expect(resolveDialogOptions({ nonModal: false }).dismissOnClickOutside).toBe(false);
  });

  test('dismissKey: false survives, because it is not "unset"', () => {
    // `??`, not `||` — `false` disables key dismissal and truthiness would turn it back on.
    expect(resolveDialogOptions({ dismissKey: false }).dismissKey).toBe(false);
    expect(resolveDialogOptions({ dismissKey: 'Ctrl+k' }).dismissKey).toBe('Ctrl+k');
  });

  test('threads the variant into the placement table', () => {
    expect(resolveDialogOptions({}).placement).toEqual({ host: null, dialog: {}, backdrop: null });
    expect(resolveDialogOptions({ nonModal: true, portal: true }).placement.host).toBeNull();
    // Contained: the dialog needs a host to be positioned against.
    expect(resolveDialogOptions({ nonModal: true }).placement.host).not.toBeNull();
    expect(
      resolveDialogOptions({ nonModal: true, clipContainer: true }).placement.host
    ).toMatchObject({ overflow: 'clip' });
  });
});

test.describe('createDialogRuntime', () => {
  test('open() settles when prepare does, not when the dialog is shown', async () => {
    const { store, open } = createDialogRuntime('runtime-open', noDialog);

    let settled = false;
    const opening = open().then(() => {
      settled = true;
    });

    expect(store.getSnapshot().phase).toBe('opening');
    expect(settled).toBe(false);

    store.finishPreparing();
    await opening;
    expect(settled).toBe(true);
  });

  test('openAndWait() registers its resolver before requesting the open', async () => {
    const { store, openAndWait } = createDialogRuntime<string, 'save'>('runtime-wait', noDialog);

    // The close lands *inside* the open — the window a resolver added on the next line would miss.
    const closed = openAndWait();
    store.close('save', 'payload');
    store.finalize();

    const [error, result] = await closed;
    expect(error).toBeNull();
    expect(result).toEqual({ reason: 'save', data: 'payload' });
  });

  test('the handle closes with the reason and payload it is given', () => {
    const { store, handle } = createDialogRuntime<number, 'ok'>('runtime-handle', noDialog);
    store.beginOpen();

    handle.close('ok', 7);

    expect(store.getSnapshot().closeResult).toEqual({ reason: 'ok', data: 7 });
  });

  test('the handle defaults to dismiss, which is the library’s own reason', () => {
    const { store, handle } = createDialogRuntime('runtime-default', noDialog);
    store.beginOpen();

    handle.close();

    expect(store.getSnapshot().closeResult).toEqual({ reason: 'dismiss' });
  });

  test('an action closes through the engine, with the action’s own reason', async () => {
    const { store, engine } = createDialogRuntime<string, 'confirm'>('runtime-engine', noDialog);
    store.beginOpen();

    // `bindClose` is wired inside the runtime, which is why nothing has to be handed in.
    await engine.run('confirm', (close) => {
      close('from-action');
    });

    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm', data: 'from-action' });
  });
});

test.describe('teardownDialog', () => {
  test('closes an open dialog and reports it through onClose', () => {
    const dm = createDialogManager();
    const { store } = createDialogRuntime('teardown-open', noDialog);
    dm.register('teardown-open', { store, template: 'dialog', nonModal: false });
    store.beginOpen();

    const reasons: string[] = [];
    store.setOnClose((result) => {
      reasons.push(result.reason);
    });

    teardownDialog(store, {
      manager: dm,
      dialogId: 'teardown-open',
      dialog: null,
      onError: undefined,
    });

    expect(reasons).toEqual(['dismiss']);
    expect(store.getSnapshot().phase).toBe('closed');
    expect(dm.lookup('teardown-open').exists).toBe(false);
  });

  test('a dialog torn down while open still reports its close to a waiter', async () => {
    const dm = createDialogManager();
    const { store, openAndWait } = createDialogRuntime('teardown-waiting', noDialog);
    dm.register('teardown-waiting', { store, template: 'dialog', nonModal: false });

    const closed = openAndWait();
    store.finishPreparing();

    teardownDialog(store, {
      manager: dm,
      dialogId: 'teardown-waiting',
      dialog: null,
      onError: undefined,
    });

    // Not the abandoned branch: the dialog *was* open, so the waiter gets a reason, not an error.
    const [error, result] = await closed;
    expect(error).toBeNull();
    expect(result).toEqual({ reason: 'dismiss' });
  });

  test('settles a waiter on a dialog that is destroyed while closed', async () => {
    // Why `abandon()` is unconditional: a resolver answers the *next* close, so one queued on a
    // dialog that never reopens stays pending for the life of the process.
    const dm = createDialogManager();
    const { store } = createDialogRuntime('teardown-closed', noDialog);
    dm.register('teardown-closed', { store, template: 'dialog', nonModal: false });

    const closed = new Promise<readonly [Error | null, unknown]>((resolve) => {
      store.addCloseResolver(resolve);
    });

    expect(store.getSnapshot().phase).toBe('closed');
    teardownDialog(store, {
      manager: dm,
      dialogId: 'teardown-closed',
      dialog: null,
      onError: undefined,
    });

    const [error, result] = await closed;
    expect(error).toBeInstanceOf(Error);
    expect(result).toBeNull();
  });
});

test.describe('shouldDismissOnBackdropClick', () => {
  /** A dialog is a rect here — the geometry is the last question, and only if the first three pass. */
  const boxed = {
    getBoundingClientRect: () => {
      return { left: 100, right: 300, top: 100, bottom: 200 };
    },
  };
  const surface = new EventTarget();
  /** A click on the dialog itself, well outside its box: the geometry says "backdrop". */
  const onBackdrop = { target: surface, currentTarget: surface, clientX: 0, clientY: 0 };

  // A real engine, not a fake: framework-free, so "running" means what it means in a binding.
  const gate = (options: { hasActions: boolean; hasRunningAction?: boolean }) => {
    const engine = createActionEngine<void, 'save'>('backdrop-gate');
    if (options.hasActions) {
      engine.declare('save', undefined);
    }
    if (options.hasRunningAction === true) {
      // Never settles for the life of the test, which is the point: the action is *running*.
      void engine.run('save', () => {
        return new Promise<void>(() => {
          return undefined;
        });
      });
    }
    return engine;
  };

  test('a non-modal dialog has no backdrop to click', () => {
    const { store } = createDialogRuntime('backdrop-non-modal', noDialog);
    expect(
      shouldDismissOnBackdropClick(onBackdrop, {
        dialog: boxed,
        store,
        engine: gate({ hasActions: false }),
        isNonModal: true,
        dismissOnBackdropClick: true,
        dismissWhilePreparing: true,
        pressedOnBackdrop: true,
      })
    ).toBe(false);
  });

  test('defaults to opt-out with no actions, and opt-in with them', () => {
    // Drawing an action flips the default — both halves, because the default is the subtlety.
    const frames = installFakeFrames();
    try {
      const { store } = createDialogRuntime('backdrop-default', noDialog);
      store.beginOpen();
      store.scheduleOpenTransition();
      frames.flush();
      store.finishPreparing();

      const options = {
        store,
        isNonModal: false as const,
        dismissWhilePreparing: true,
        pressedOnBackdrop: true,
        dismissOnBackdropClick: undefined,
      };

      expect(
        shouldDismissOnBackdropClick(onBackdrop, {
          dialog: boxed,
          ...options,
          engine: gate({ hasActions: false }),
        })
      ).toBe(true);

      expect(
        shouldDismissOnBackdropClick(onBackdrop, {
          dialog: boxed,
          ...options,
          engine: gate({ hasActions: true }),
        })
      ).toBe(false);
    } finally {
      frames.restore();
    }
  });

  test('an explicit `true` opts a dialog with actions back in', () => {
    const frames = installFakeFrames();
    try {
      const { store } = createDialogRuntime('backdrop-explicit', noDialog);
      store.beginOpen();
      store.scheduleOpenTransition();
      frames.flush();
      store.finishPreparing();

      expect(
        shouldDismissOnBackdropClick(onBackdrop, {
          dialog: boxed,
          store,
          engine: gate({ hasActions: true }),
          isNonModal: false,
          dismissOnBackdropClick: true,
          dismissWhilePreparing: true,
          pressedOnBackdrop: true,
        })
      ).toBe(true);
    } finally {
      frames.restore();
    }
  });

  test('a running action holds the backdrop shut', () => {
    // The shared gate the dismiss key and click-outside also ask, reached after the first two.
    const frames = installFakeFrames();
    try {
      const { store } = createDialogRuntime('backdrop-running', noDialog);
      store.beginOpen();
      store.scheduleOpenTransition();
      frames.flush();
      store.finishPreparing();

      expect(
        shouldDismissOnBackdropClick(onBackdrop, {
          dialog: boxed,
          store,
          engine: gate({ hasActions: false, hasRunningAction: true }),
          isNonModal: false,
          dismissOnBackdropClick: true,
          dismissWhilePreparing: true,
          pressedOnBackdrop: true,
        })
      ).toBe(false);
    } finally {
      frames.restore();
    }
  });

  test('a closed dialog never dismisses, whatever the pointer did', () => {
    const { store } = createDialogRuntime('backdrop-closed', noDialog);
    expect(store.getSnapshot().phase).toBe('closed');
    expect(
      shouldDismissOnBackdropClick(onBackdrop, {
        dialog: boxed,
        store,
        engine: gate({ hasActions: false }),
        isNonModal: false,
        dismissOnBackdropClick: true,
        dismissWhilePreparing: true,
        pressedOnBackdrop: true,
      })
    ).toBe(false);
  });

  test('and the geometry still decides, last', () => {
    const frames = installFakeFrames();
    try {
      const { store } = createDialogRuntime('backdrop-geometry', noDialog);
      store.beginOpen();
      store.scheduleOpenTransition();
      frames.flush();
      store.finishPreparing();

      const options = {
        store,
        engine: gate({ hasActions: false }),
        isNonModal: false as const,
        dismissOnBackdropClick: true,
        dismissWhilePreparing: true,
        pressedOnBackdrop: true,
      };

      // Inside the box, and on the element: not a backdrop click.
      expect(
        shouldDismissOnBackdropClick(
          { target: surface, currentTarget: surface, clientX: 200, clientY: 150 },
          { dialog: boxed, ...options }
        )
      ).toBe(false);

      // Outside the box, but targeting content: still not one.
      expect(
        shouldDismissOnBackdropClick(
          { target: new EventTarget(), currentTarget: surface, clientX: 0, clientY: 0 },
          { dialog: boxed, ...options }
        )
      ).toBe(false);
    } finally {
      frames.restore();
    }
  });
});

test.describe('teardownDialog reports a failing onClose', () => {
  test('logs instead of losing an error thrown during cleanup', async () => {
    // Teardown has nobody left to catch a throwing `onClose`; `fireAndForget` logs it instead.
    const dm = createDialogManager();
    const { store } = createDialogRuntime<void, 'save'>('teardown-throws', noDialog);
    dm.register('teardown-throws', { store, template: 'dialog', nonModal: false });

    store.setOnClose(() => {
      throw new Error('cleanup exploded');
    });
    store.beginOpen();

    const errors: unknown[][] = [];
    const originalError = console.error;
    const originalDebug = console.debug;
    console.error = (...args) => {
      errors.push(args);
    };
    // Enabling the namespace turns its `debug` lines on too; a passing test should not print them.
    console.debug = () => {
      return;
    };
    setLogLevel('dialog');

    try {
      teardownDialog(store, {
        manager: dm,
        dialogId: 'teardown-throws',
        dialog: null,
        onError: undefined,
      });
      await Promise.resolve();

      expect(errors).toHaveLength(1);
      expect(String(errors[0]?.[0])).toContain('onClose callback failed during cleanup');
    } finally {
      console.error = originalError;
      console.debug = originalDebug;
      setLogLevel(false);
    }
  });
});

test.describe('teardownDialog reports through onError', () => {
  test('an onClose that throws on unmount reaches onError, like one that throws on close', async () => {
    // The gap: `onClose` failures reached `onError` on the close path but not on unmount.
    const dm = createDialogManager();
    const { store } = createDialogRuntime('teardown-on-error', noDialog);
    dm.register('teardown-on-error', { store, template: 'dialog', nonModal: false });
    store.beginOpen();
    store.setOnClose(() => {
      throw new Error('cleanup exploded');
    });

    const failures: { readonly error: Error; readonly source: string }[] = [];
    teardownDialog(store, {
      manager: dm,
      dialogId: 'teardown-on-error',
      dialog: null,
      onError: (failure) => {
        failures.push(failure);
      },
    });
    await Promise.resolve();

    expect(failures).toHaveLength(1);
    expect(failures[0]?.source).toBe('onClose');
    expect(failures[0]?.error.message).toBe('cleanup exploded');
  });

  test('a clean unmount reports nothing', async () => {
    // Failures only — a consumer wiring a reporter must not get an event per normal unmount.
    const dm = createDialogManager();
    const { store } = createDialogRuntime('teardown-quiet', noDialog);
    dm.register('teardown-quiet', { store, template: 'dialog', nonModal: false });
    store.beginOpen();

    const failures: unknown[] = [];
    teardownDialog(store, {
      manager: dm,
      dialogId: 'teardown-quiet',
      dialog: null,
      onError: (failure) => {
        failures.push(failure);
      },
    });
    await Promise.resolve();

    expect(failures).toHaveLength(0);
  });
});

test.describe('resolvePortalHost', () => {
  // Stand-ins: the decision reads no member of either, which is why it is a unit test at all.
  const body = { id: 'body' } as unknown as Element;
  const themed = { id: 'themed' } as unknown as Element;

  test('an un-portaled dialog resolves to no host at all', () => {
    // `null` rather than the default: the caller branches on it, and a body here would portal
    // every inline dialog in the library.
    expect(resolvePortalHost(undefined, body)).toBe(null);
    expect(resolvePortalHost(false, body)).toBe(null);
  });

  test('true is the default host', () => {
    expect(resolvePortalHost(true, body)).toBe(body);
  });

  test('a getter names its own', () => {
    expect(
      resolvePortalHost(() => {
        return themed;
      }, body)
    ).toBe(themed);
  });

  test('the getter is read on every call rather than cached, so the binding owns the timing', () => {
    // The reason it is a getter and not an element: a caller cannot name a node its own tree has
    // not rendered yet.
    let host: Element | null = null;
    const target = () => {
      return host;
    };

    expect(resolvePortalHost(target, body)).toBe(body);
    host = themed;
    expect(resolvePortalHost(target, body)).toBe(themed);
  });

  test('a getter answering null falls back rather than un-portaling', () => {
    // By here the placement CSS is already a portaled dialog's; rendering it inline would position
    // it against the wrong thing, so the body is the arrangement that still works.
    expect(
      resolvePortalHost(() => {
        return null;
      }, body)
    ).toBe(body);
  });
});

test.describe('answerBackdropClick', () => {
  // The chain's answer *acted on*, which is what all three bindings call — React from an `onClick`
  // prop, the other two from a listener. Splitting decision from action is how one of them came to
  // ask the question and dismiss on a different rule.
  const surface = new EventTarget();
  const boxed = {
    getBoundingClientRect: () => {
      return { left: 100, right: 300, top: 100, bottom: 200 };
    },
  };
  const onBackdrop = { target: surface, currentTarget: surface, clientX: 0, clientY: 0 };

  const opened = (id: string) => {
    const runtime = createDialogRuntime<void, 'save'>(id, noDialog);
    runtime.store.beginOpen();
    // The director's two calls, by hand: nothing here drives a lifecycle, and a dialog still
    // `'opening'` would pass the assertions below for the wrong reason.
    runtime.store.scheduleOpenTransition();
    frames.flush();
    runtime.store.finishPreparing();
    return runtime;
  };

  test('a click the chain accepts closes the dialog, with the dismiss reason', () => {
    const { store, engine } = opened('backdrop-answer');

    answerBackdropClick(onBackdrop, {
      pressedOnBackdrop: true,
      dialog: boxed,
      store,
      engine,
      isNonModal: false,
      dismissOnBackdropClick: true,
      dismissWhilePreparing: true,
      onDismissRequest: undefined,
    });

    expect(store.getSnapshot().phase).toBe('closing');
    expect(store.getSnapshot().closeResult?.reason).toBe('dismiss');
  });

  test('a controlled surface is asked, and its refusal leaves the dialog open', () => {
    // The same door the dismiss key goes through: `onDismissRequest` returning false is a report,
    // not a close, so a caller driving `open` itself stays the one deciding.
    const { store, engine } = opened('backdrop-refused');
    const seen: string[] = [];

    answerBackdropClick(onBackdrop, {
      pressedOnBackdrop: true,
      dialog: boxed,
      store,
      engine,
      isNonModal: false,
      dismissOnBackdropClick: true,
      dismissWhilePreparing: true,
      onDismissRequest: (cause) => {
        seen.push(cause);
        return false;
      },
    });

    expect(seen).toEqual(['backdrop-click']);
    expect(store.getSnapshot().phase).toBe('open');
  });

  test('a click the chain refuses does nothing at all', () => {
    const { store, engine } = opened('backdrop-declined');

    answerBackdropClick(onBackdrop, {
      pressedOnBackdrop: false,
      dialog: boxed,
      store,
      engine,
      isNonModal: false,
      dismissOnBackdropClick: true,
      dismissWhilePreparing: true,
      onDismissRequest: undefined,
    });

    expect(store.getSnapshot().phase).toBe('open');
  });
});
