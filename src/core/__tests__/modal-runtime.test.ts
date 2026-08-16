import { expect, test } from '@playwright/test';
import { installFakeFrames, type FrameControl } from '../../__tests__/fake-frames.js';
import { createActionEngine } from '../../actions/action-engine.js';
import { createDialogManager } from '../../manager/dialog-manager.js';
import { setLogLevel } from '../../utils/logger.js';
import {
  createModalRuntime,
  resolveModalOptions,
  shouldDismissOnBackdropClick,
  teardownModal,
} from '../modal-runtime.js';

/**
 * The parts of a modal both bindings share, tested where they live rather than twice through two
 * renderers.
 *
 * That is the point of them being here at all: before the second binding, every one of these
 * answers was only ever exercised through React, so "does the Solid binding narrow the variant
 * the same way" had no answer short of reading both files.
 */

// The store cancels a pending frame on every close, and Node has none — see `fake-frames.ts`.
let frames: FrameControl;
test.beforeEach(() => {
  frames = installFakeFrames();
});
test.afterEach(() => {
  frames.restore();
});

test.describe('resolveModalOptions', () => {
  test('applies the defaults a bare modal relies on', () => {
    expect(resolveModalOptions({})).toMatchObject({
      isNonModal: false,
      isPortaled: false,
      dismissWhilePreparing: true,
      dismissKey: 'Escape',
      template: 'modal',
      // `undefined`, not `false`: it means "decide from whether any action was drawn", which is
      // a third state the backdrop rule needs and a boolean could not carry.
      dismissOnBackdropClick: undefined,
      dismissOnClickOutside: false,
    });
  });

  test('a value the caller passed wins over every default', () => {
    // The defaults above were the only thing asserted, and a resolver that ignored its argument
    // entirely — returning the table verbatim — passed all of it. These four are the arms with a
    // `??` behind them, which is exactly where an option gets silently dropped: the failure is not
    // an error anywhere, it is `containFocus: true` doing nothing at a keyboard.
    expect(
      resolveModalOptions({
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
    expect(resolveModalOptions({ dismissOnBackdropClick: true }).dismissOnBackdropClick).toBe(true);

    // A non-modal dialog has no backdrop. The option cannot be passed (it is `never` there), and
    // one arriving anyway — from an untyped caller — must not be honoured.
    expect(
      resolveModalOptions({ nonModal: true, dismissOnClickOutside: true }).dismissOnBackdropClick
    ).toBeUndefined();
  });

  test('reads dismissOnClickOutside only on the non-modal branch', () => {
    expect(
      resolveModalOptions({ nonModal: true, dismissOnClickOutside: true }).dismissOnClickOutside
    ).toBe(true);
    // Defaults to false even on its own branch: a panel that dismisses on any outside click is
    // an opt-in, because it sits over a live page.
    expect(resolveModalOptions({ nonModal: true }).dismissOnClickOutside).toBe(false);
    expect(resolveModalOptions({ dismissOnBackdropClick: true }).dismissOnClickOutside).toBe(false);
  });

  test('an explicit nonModal: false reads the same as leaving it out', () => {
    // `nonModal` is optional *and* has a `false` branch in the union, so a caller may write it
    // either way — and a resolution that only handled the absent case would silently drop the
    // backdrop option for everyone who spelled it out.
    expect(
      resolveModalOptions({ nonModal: false, dismissOnBackdropClick: true }).dismissOnBackdropClick
    ).toBe(true);
    expect(resolveModalOptions({ nonModal: false }).isNonModal).toBe(false);
    expect(resolveModalOptions({ nonModal: false }).dismissOnClickOutside).toBe(false);
  });

  test('dismissKey: false survives, because it is not "unset"', () => {
    // `?? Key.Escape` and not `|| Key.Escape` — `false` disables key dismissal entirely, and a
    // truthiness check would silently turn it back on.
    expect(resolveModalOptions({ dismissKey: false }).dismissKey).toBe(false);
    expect(resolveModalOptions({ dismissKey: 'Ctrl+k' }).dismissKey).toBe('Ctrl+k');
  });

  test('threads the variant into the placement table', () => {
    expect(resolveModalOptions({}).placement).toEqual({ host: null, dialog: {}, backdrop: null });
    expect(resolveModalOptions({ nonModal: true, portal: true }).placement.host).toBeNull();
    // Contained: the dialog needs a host to be positioned against.
    expect(resolveModalOptions({ nonModal: true }).placement.host).not.toBeNull();
    expect(
      resolveModalOptions({ nonModal: true, clipContainer: true }).placement.host
    ).toMatchObject({ overflow: 'clip' });
  });
});

test.describe('createModalRuntime', () => {
  test('open() settles when prepare does, not when the dialog is shown', async () => {
    const { store, open } = createModalRuntime('runtime-open');

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
    const { store, openAndWait } = createModalRuntime<string, 'save'>('runtime-wait');

    // The close lands *inside* the open — the window `prepare` opens, and the one a resolver
    // added on the next line would fall into.
    const closed = openAndWait();
    store.close('save', 'payload');
    store.finalize();

    const [error, result] = await closed;
    expect(error).toBeNull();
    expect(result).toEqual({ reason: 'save', data: 'payload' });
  });

  test('the handle closes with the reason and payload it is given', () => {
    const { store, handle } = createModalRuntime<number, 'ok'>('runtime-handle');
    store.beginOpen();

    handle.close('ok', 7);

    expect(store.getSnapshot().closeResult).toEqual({ reason: 'ok', data: 7 });
  });

  test('the handle defaults to dismiss, which is the library’s own reason', () => {
    const { store, handle } = createModalRuntime('runtime-default');
    store.beginOpen();

    handle.close();

    expect(store.getSnapshot().closeResult).toEqual({ reason: 'dismiss' });
  });

  test('an action closes through the engine, with the action’s own reason', async () => {
    const { store, engine } = createModalRuntime<string, 'confirm'>('runtime-engine');
    store.beginOpen();

    // `bindClose` is wired inside the runtime, which is why nothing has to be handed in.
    await engine.run('confirm', (close) => {
      close('from-action');
    });

    expect(store.getSnapshot().closeResult).toEqual({ reason: 'confirm', data: 'from-action' });
  });
});

test.describe('teardownModal', () => {
  test('closes an open modal and reports it through onClose', () => {
    const dm = createDialogManager();
    const { store } = createModalRuntime('teardown-open');
    dm.register('teardown-open', store, { template: 'modal', nonModal: false });
    store.beginOpen();

    const reasons: string[] = [];
    store.setOnClose((result) => {
      reasons.push(result.reason);
    });

    teardownModal(store, {
      manager: dm,
      modalId: 'teardown-open',
      dialog: null,
      onError: undefined,
    });

    expect(reasons).toEqual(['dismiss']);
    expect(store.getSnapshot().phase).toBe('closed');
    expect(dm.lookup('teardown-open').exists).toBe(false);
  });

  test('a modal torn down while open still reports its close to a waiter', async () => {
    const dm = createDialogManager();
    const { store, openAndWait } = createModalRuntime('teardown-waiting');
    dm.register('teardown-waiting', store, { template: 'modal', nonModal: false });

    const closed = openAndWait();
    store.finishPreparing();

    teardownModal(store, {
      manager: dm,
      modalId: 'teardown-waiting',
      dialog: null,
      onError: undefined,
    });

    // Not the abandoned branch: the modal *was* open, so the teardown closes it for real and the
    // waiter gets the reason the library produces on teardown rather than an error.
    const [error, result] = await closed;
    expect(error).toBeNull();
    expect(result).toEqual({ reason: 'dismiss' });
  });

  test('settles a waiter on a modal that is destroyed while closed', async () => {
    // The case the unconditional `abandon()` exists for. A close resolver answers the *next*
    // close, so one still queued on a modal that never opens again would stay pending for the
    // life of the process — holding its continuation, and everything that closure captures,
    // alive while the awaiting code silently never resumes.
    const dm = createDialogManager();
    const { store } = createModalRuntime('teardown-closed');
    dm.register('teardown-closed', store, { template: 'modal', nonModal: false });

    const closed = new Promise<readonly [Error | null, unknown]>((resolve) => {
      store.addCloseResolver(resolve);
    });

    expect(store.getSnapshot().phase).toBe('closed');
    teardownModal(store, {
      manager: dm,
      modalId: 'teardown-closed',
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

  /**
   * A real engine in the two states the chain asks about — no fake, because the engine is
   * framework-free and driving it is what makes "has actions" and "one is running" mean here
   * exactly what they mean in a binding.
   */
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
    const { store } = createModalRuntime('backdrop-non-modal');
    expect(
      shouldDismissOnBackdropClick(onBackdrop, boxed, {
        store,
        engine: gate({ hasActions: false }),
        isNonModal: true,
        dismissOnBackdropClick: true,
        dismissWhilePreparing: true,
      })
    ).toBe(false);
  });

  test('defaults to opt-out with no actions, and opt-in with them', () => {
    // A modal offering buttons wants to be dismissed through one, so drawing an action flips the
    // default. Both halves here, because the default is the whole subtlety.
    const frames = installFakeFrames();
    try {
      const { store } = createModalRuntime('backdrop-default');
      store.beginOpen();
      store.scheduleOpenTransition();
      frames.flush();
      store.finishPreparing();

      const options = {
        store,
        isNonModal: false as const,
        dismissWhilePreparing: true,
        dismissOnBackdropClick: undefined,
      };

      expect(
        shouldDismissOnBackdropClick(onBackdrop, boxed, {
          ...options,
          engine: gate({ hasActions: false }),
        })
      ).toBe(true);

      expect(
        shouldDismissOnBackdropClick(onBackdrop, boxed, {
          ...options,
          engine: gate({ hasActions: true }),
        })
      ).toBe(false);
    } finally {
      frames.restore();
    }
  });

  test('an explicit `true` opts a modal with actions back in', () => {
    const frames = installFakeFrames();
    try {
      const { store } = createModalRuntime('backdrop-explicit');
      store.beginOpen();
      store.scheduleOpenTransition();
      frames.flush();
      store.finishPreparing();

      expect(
        shouldDismissOnBackdropClick(onBackdrop, boxed, {
          store,
          engine: gate({ hasActions: true }),
          isNonModal: false,
          dismissOnBackdropClick: true,
          dismissWhilePreparing: true,
        })
      ).toBe(true);
    } finally {
      frames.restore();
    }
  });

  test('a running action holds the backdrop shut', () => {
    // The shared gate, reached only after the first two questions pass — the same predicate the
    // dismiss key and click-outside ask.
    const frames = installFakeFrames();
    try {
      const { store } = createModalRuntime('backdrop-running');
      store.beginOpen();
      store.scheduleOpenTransition();
      frames.flush();
      store.finishPreparing();

      expect(
        shouldDismissOnBackdropClick(onBackdrop, boxed, {
          store,
          engine: gate({ hasActions: false, hasRunningAction: true }),
          isNonModal: false,
          dismissOnBackdropClick: true,
          dismissWhilePreparing: true,
        })
      ).toBe(false);
    } finally {
      frames.restore();
    }
  });

  test('a closed modal never dismisses, whatever the pointer did', () => {
    const { store } = createModalRuntime('backdrop-closed');
    expect(store.getSnapshot().phase).toBe('closed');
    expect(
      shouldDismissOnBackdropClick(onBackdrop, boxed, {
        store,
        engine: gate({ hasActions: false }),
        isNonModal: false,
        dismissOnBackdropClick: true,
        dismissWhilePreparing: true,
      })
    ).toBe(false);
  });

  test('and the geometry still decides, last', () => {
    const frames = installFakeFrames();
    try {
      const { store } = createModalRuntime('backdrop-geometry');
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
      };

      // Inside the box, and on the element: not a backdrop click.
      expect(
        shouldDismissOnBackdropClick(
          { target: surface, currentTarget: surface, clientX: 200, clientY: 150 },
          boxed,
          options
        )
      ).toBe(false);

      // Outside the box, but targeting content: still not one.
      expect(
        shouldDismissOnBackdropClick(
          { target: new EventTarget(), currentTarget: surface, clientX: 0, clientY: 0 },
          boxed,
          options
        )
      ).toBe(false);
    } finally {
      frames.restore();
    }
  });
});

test.describe('teardownModal reports a failing onClose', () => {
  test('logs instead of losing an error thrown during cleanup', async () => {
    // Teardown runs while the component is going away, so a throwing `onClose` has nobody left to
    // catch it — `fireAndForget` hands it here, and here it becomes a log line rather than an
    // unhandled rejection in whatever unmounted the modal.
    const dm = createDialogManager();
    const { store } = createModalRuntime<void, 'save'>('teardown-throws');
    dm.register('teardown-throws', store, { template: 'modal', nonModal: false });

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
    setLogLevel('modal');

    try {
      teardownModal(store, {
        manager: dm,
        modalId: 'teardown-throws',
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

test.describe('teardownModal reports through onError', () => {
  test('an onClose that throws on unmount reaches onError, like one that throws on close', async () => {
    // The gap this closes: `onClose` failures reached `onError` on the close path and not on the
    // unmount path, so the same callback throwing was reported or silent depending on how the
    // modal happened to end. A modal unmounted while open is the ordinary React case, not an edge.
    const dm = createDialogManager();
    const { store } = createModalRuntime('teardown-on-error');
    dm.register('teardown-on-error', store, { template: 'modal', nonModal: false });
    store.beginOpen();
    store.setOnClose(() => {
      throw new Error('cleanup exploded');
    });

    const failures: { readonly error: Error; readonly source: string }[] = [];
    teardownModal(store, {
      manager: dm,
      modalId: 'teardown-on-error',
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
    // The channel is for failures only — a consumer wiring it to a reporter must not get an event
    // for every modal that unmounts normally.
    const dm = createDialogManager();
    const { store } = createModalRuntime('teardown-quiet');
    dm.register('teardown-quiet', store, { template: 'modal', nonModal: false });
    store.beginOpen();

    const failures: unknown[] = [];
    teardownModal(store, {
      manager: dm,
      modalId: 'teardown-quiet',
      dialog: null,
      onError: (failure) => {
        failures.push(failure);
      },
    });
    await Promise.resolve();

    expect(failures).toHaveLength(0);
  });
});
