import { expect, test } from '@playwright/test';
import { installFakeFrames, type FrameControl } from '../../__tests__/fake-frames.js';
import { createDialogManager } from '../../manager/dialog-manager.js';
import { createModalRuntime, resolveModalConfig, teardownModal } from '../modal-runtime.js';

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

test.describe('resolveModalConfig', () => {
  test('applies the defaults a bare modal relies on', () => {
    expect(resolveModalConfig({})).toMatchObject({
      isNonModal: false,
      shouldPortal: false,
      dismissWhilePreparing: true,
      dismissKey: 'Escape',
      modalType: 'modal',
      // `undefined`, not `false`: it means "decide from whether any action was drawn", which is
      // a third state the backdrop rule needs and a boolean could not carry.
      dismissOnBackdropClick: undefined,
      dismissOnClickOutside: false,
    });
  });

  test('reads dismissOnBackdropClick only on the modal branch', () => {
    expect(resolveModalConfig({ dismissOnBackdropClick: true }).dismissOnBackdropClick).toBe(true);

    // A non-modal dialog has no backdrop. The option cannot be passed (it is `never` there), and
    // one arriving anyway — from an untyped caller — must not be honoured.
    expect(
      resolveModalConfig({ nonModal: true, dismissOnClickOutside: true }).dismissOnBackdropClick
    ).toBeUndefined();
  });

  test('reads dismissOnClickOutside only on the non-modal branch', () => {
    expect(
      resolveModalConfig({ nonModal: true, dismissOnClickOutside: true }).dismissOnClickOutside
    ).toBe(true);
    // Defaults to false even on its own branch: a panel that dismisses on any outside click is
    // an opt-in, because it sits over a live page.
    expect(resolveModalConfig({ nonModal: true }).dismissOnClickOutside).toBe(false);
    expect(resolveModalConfig({ dismissOnBackdropClick: true }).dismissOnClickOutside).toBe(false);
  });

  test('dismissKey: false survives, because it is not "unset"', () => {
    // `?? Key.Escape` and not `|| Key.Escape` — `false` disables key dismissal entirely, and a
    // truthiness check would silently turn it back on.
    expect(resolveModalConfig({ dismissKey: false }).dismissKey).toBe(false);
    expect(resolveModalConfig({ dismissKey: 'Ctrl+k' }).dismissKey).toBe('Ctrl+k');
  });

  test('threads the variant into the placement table', () => {
    expect(resolveModalConfig({}).placement).toEqual({ host: null, dialog: {} });
    expect(resolveModalConfig({ nonModal: true, portal: true }).placement.host).toBeNull();
    // Contained: the dialog needs a host to be positioned against.
    expect(resolveModalConfig({ nonModal: true }).placement.host).not.toBeNull();
    expect(
      resolveModalConfig({ nonModal: true, clipContainer: true }).placement.host
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

    store.resolveOpen();
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
    dm.register('teardown-open', store, { modalType: 'modal', nonModal: false });
    store.beginOpen();

    const reasons: string[] = [];
    store.setOnClose((result) => {
      reasons.push(result.reason);
    });

    teardownModal(store, dm, 'teardown-open', null);

    expect(reasons).toEqual(['dismiss']);
    expect(store.getSnapshot().phase).toBe('closed');
    expect(dm.lookup('teardown-open').exists).toBe(false);
  });

  test('a modal torn down while open still reports its close to a waiter', async () => {
    const dm = createDialogManager();
    const { store, openAndWait } = createModalRuntime('teardown-waiting');
    dm.register('teardown-waiting', store, { modalType: 'modal', nonModal: false });

    const closed = openAndWait();
    store.resolveOpen();

    teardownModal(store, dm, 'teardown-waiting', null);

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
    dm.register('teardown-closed', store, { modalType: 'modal', nonModal: false });

    const closed = new Promise<readonly [Error | null, unknown]>((resolve) => {
      store.addCloseResolver(resolve);
    });

    expect(store.getSnapshot().phase).toBe('closed');
    teardownModal(store, dm, 'teardown-closed', null);

    const [error, result] = await closed;
    expect(error).toBeInstanceOf(Error);
    expect(result).toBeNull();
  });
});
