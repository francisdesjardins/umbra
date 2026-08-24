import { useEffect, useRef, useState } from 'react';
import { reconcileOpen } from '../../core/reconcile-open.js';
import { createDialogManager } from '../../manager/dialog-manager.js';
import { setLogLevel } from '../../utils/logger.js';
import { bindDialog } from '../bind-dialog.js';
import type { ModalPhase } from '../../core/types.js';
import type { DialogController } from '../types.js';

/**
 * The vanilla binding, driven from a React component test — fair precisely because the binding never
 * renders: React only hands over a `<dialog>`. Each harness passes its own `createDialogManager()`,
 * the vanilla answer to `DialogManagerProvider`, or they would leak through the singleton.
 */

type Bound<TReason extends string> = DialogController<void, TReason>;

/** Open, close, dismiss, hotkeys, the running state — the ordinary surface. */
export function VanillaBasicHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [controller, setController] = useState<Bound<'confirm' | 'cancel'> | null>(null);
  const [lastReason, setLastReason] = useState('none');
  const [visible, setVisible] = useState('closed');
  const [confirmRunning, setConfirmRunning] = useState('no');
  const [cancelRunning, setCancelRunning] = useState('no');

  useEffect(() => {
    const dialog = dialogRef.current;
    const cancel = cancelRef.current;
    const confirm = confirmRef.current;
    if (!dialog || !cancel || !confirm) {
      return;
    }

    const bound = bindDialog<void, 'confirm' | 'cancel'>({
      id: 'vanilla-basic',
      dialog,
      ariaLabel: 'Vanilla basic',
      manager: createDialogManager(),
      onClose: (result) => {
        setLastReason(result.reason);
      },
    });

    const unbind = [
      bound.bindAction(cancel, { reason: 'cancel', hotkey: 'Escape' }),
      bound.bindAction(confirm, {
        reason: 'confirm',
        hotkey: 'Enter',
        focusOnOpen: true,
        onAction: async (close) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 120);
          });
          close();
        },
      }),
    ];

    // One subscription covers phases *and* actions, so the per-action reads stay live.
    const stop = bound.subscribe(() => {
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
      setConfirmRunning(bound.isActionRunning('confirm') ? 'yes' : 'no');
      setCancelRunning(bound.isActionRunning('cancel') ? 'yes' : 'no');
    });

    setController(bound);

    return () => {
      stop();
      for (const off of unbind) {
        off();
      }
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="is-visible">{visible}</span>
      <span data-testid="last-reason">{lastReason}</span>
      <span data-testid="confirm-running">{confirmRunning}</span>
      <span data-testid="cancel-running">{cancelRunning}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>
      <button
        data-testid="open-and-wait"
        onClick={() => {
          void controller?.openAndWait().then(([, result]) => {
            setLastReason(`awaited:${result?.reason ?? 'none'}`);
          });
        }}
      >
        Open and wait
      </button>

      <dialog ref={dialogRef}>
        <p>Vanilla content</p>
        <button ref={cancelRef}>Cancel</button>
        <button ref={confirmRef}>Confirm</button>
      </dialog>
    </>
  );
}

/**
 * A backdrop click this binding must *report* rather than act on.
 *
 * `answerDismiss` is unit-tested and `bind-dialog` calls it, but nothing asserted that it does: a
 * handler closing the store itself works perfectly and ignores `onDismissRequest`, which is the
 * defect the option exists to prevent. This harness draws no action, so backdrop dismissal is on by
 * default — the arrangement most likely to meet it.
 */
export function VanillaDismissRequestHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [controller, setController] = useState<Bound<'ok'> | null>(null);
  const [cause, setCause] = useState('none');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const bound = bindDialog<void, 'ok'>({
      id: 'vanilla-dismiss-request',
      dialog,
      ariaLabel: 'Vanilla dismiss request',
      manager: createDialogManager(),
      onDismissRequest: (which) => {
        setCause(which);
        return false;
      },
    });

    setController(bound);

    return () => {
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="cause">{cause}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>

      <dialog ref={dialogRef}>
        <p data-testid="inside">Vanilla content</p>
      </dialog>
    </>
  );
}

/**
 * Unbinding an action retires its declaration, which backdrop dismissal makes observable: it is
 * opt-out without actions and opt-in with them.
 */
export function VanillaUnbindHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLButtonElement>(null);
  const [controller, setController] = useState<Bound<'confirm'> | null>(null);
  const [visible, setVisible] = useState('closed');

  useEffect(() => {
    const dialog = dialogRef.current;
    const confirm = confirmRef.current;
    const drop = dropRef.current;
    if (!dialog || !confirm || !drop) {
      return;
    }

    const bound = bindDialog<void, 'confirm'>({
      id: 'vanilla-unbind',
      dialog,
      ariaLabel: 'Vanilla unbind',
      manager: createDialogManager(),
    });

    let unbindConfirm: (() => void) | null = bound.bindAction(confirm, { reason: 'confirm' });

    // A plain listener, not an action; inside the dialog, which owns the top layer.
    const handleDrop = () => {
      unbindConfirm?.();
      unbindConfirm = null;
      confirm.remove();
    };
    drop.addEventListener('click', handleDrop);

    const stop = bound.subscribe(() => {
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
    });

    setController(bound);

    return () => {
      stop();
      drop.removeEventListener('click', handleDrop);
      unbindConfirm?.();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="is-visible">{visible}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>

      <dialog ref={dialogRef}>
        <p>Toggle the action</p>
        <button ref={dropRef} data-testid="drop-action">
          Drop the action
        </button>
        <button ref={confirmRef}>Confirm</button>
      </dialog>
    </>
  );
}

/**
 * Where focus lands after an action **fails** — hardest here: actions bind *after* `bindDialog`
 * returns, so `bindAction`'s synchronous `disabled` write runs ahead of the focus coordinator's
 * subscriber, and the browser blurs a disabled element before anyone reads who held focus.
 */
export function VanillaFailingActionHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const failRef = useRef<HTMLButtonElement>(null);
  const [controller, setController] = useState<Bound<'cancel' | 'submit'> | null>(null);
  const [error, setError] = useState('none');

  useEffect(() => {
    const dialog = dialogRef.current;
    const cancel = cancelRef.current;
    const fail = failRef.current;
    if (!dialog || !cancel || !fail) {
      return;
    }

    const bound = bindDialog<void, 'cancel' | 'submit'>({
      id: 'vanilla-failing-action',
      dialog,
      ariaLabel: 'Vanilla failing action',
      manager: createDialogManager(),
    });

    // `focusOnOpen` on Cancel, Submit runs: "back to the runner" is not "focus never moved".
    const unbindCancel = bound.bindAction(cancel, { reason: 'cancel', focusOnOpen: true });
    const unbindFail = bound.bindAction(fail, {
      reason: 'submit',
      onAction: () => {
        throw new Error('submit failed');
      },
    });

    const stop = bound.subscribe(() => {
      setError(bound.getSnapshot().error?.message ?? 'none');
    });

    setController(bound);

    return () => {
      stop();
      unbindCancel();
      unbindFail();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="error">{error}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>

      <dialog ref={dialogRef}>
        <p>Submit throws</p>
        <button ref={cancelRef}>Cancel</button>
        <button ref={failRef} data-testid="submit">
          Submit
        </button>
      </dialog>
    </>
  );
}

/**
 * A **contained** non-modal panel — `nonModal: true` without `portal` — against the default host, the
 * dialog's parent, which must sit in a *sized, positioned* region or the panel collapses and
 * assertions pass vacuously. Nothing enters the top layer, so the region behind stays clickable:
 * what `pointerEvents` on the host preserves.
 */
export function VanillaContainedHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [controller, setController] = useState<Bound<'close'> | null>(null);
  const [visible, setVisible] = useState('closed');
  const [behindClicks, setBehindClicks] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const close = closeRef.current;
    if (!dialog || !close) {
      return;
    }

    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-contained',
      dialog,
      ariaLabel: 'Vanilla contained',
      nonModal: true,
      manager: createDialogManager(),
    });

    const unbindClose = bound.bindAction(close, { reason: 'close' });
    const stop = bound.subscribe(() => {
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
    });

    setController(bound);

    return () => {
      stop();
      unbindClose();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="is-visible">{visible}</span>
      <span data-testid="behind-clicks">{behindClicks}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>

      <div data-testid="region" style={{ position: 'relative', width: 400, height: 300 }}>
        <button
          data-testid="behind"
          style={{ position: 'absolute', inset: 0 }}
          onClick={() => {
            setBehindClicks((n) => {
              return n + 1;
            });
          }}
        >
          Behind the panel
        </button>
        <div data-testid="host">
          <dialog ref={dialogRef}>
            <p>Contained content</p>
            <button ref={closeRef} data-testid="close">
              Close
            </button>
          </dialog>
        </div>
      </div>
    </>
  );
}

/**
 * The same variant with an explicit `host`: the dialog's parent is a plain wrapper and the host is
 * its grandparent, so a pass cannot be the default branch answering by coincidence.
 */
export function VanillaExplicitHostHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<Bound<'close'> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const host = hostRef.current;
    if (!dialog || !host) {
      return;
    }

    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-explicit-host',
      dialog,
      ariaLabel: 'Vanilla explicit host',
      nonModal: true,
      host,
      manager: createDialogManager(),
    });

    setController(bound);

    return () => {
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>

      <div style={{ position: 'relative', width: 400, height: 300 }}>
        <div ref={hostRef} data-testid="host">
          <div data-testid="wrapper">
            <dialog ref={dialogRef}>
              <p>Explicit host</p>
            </dialog>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * A contained dialog with no parent and no named host — the branch that must warn and carry on
 * rather than throw down the caller's render or silently style `document.body`.
 */
export function VanillaNoHostHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState('unprobed');
  const [controller, setController] = useState<Bound<'close'> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    // Detached *before* binding: the host is resolved once, at bind time.
    dialog.remove();

    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-no-host',
      dialog,
      ariaLabel: 'Vanilla without a host',
      nonModal: true,
      manager: createDialogManager(),
    });

    const stop = bound.subscribe(() => {
      setPhase(bound.getSnapshot().phase);
    });
    setController(bound);

    return () => {
      stop();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="phase">{phase}</span>
      {/* Read on demand, not seeded from the effect: a controller that still answers is what
          "degrades rather than throws" has to mean. */}
      <button
        data-testid="probe"
        onClick={() => {
          setPhase(controller?.getSnapshot().phase ?? 'unbound');
        }}
      >
        Probe
      </button>
      <dialog ref={dialogRef}>
        <p>No host to position against</p>
      </dialog>
    </>
  );
}

/**
 * `destroy()` from a button rather than at unmount: the coverage fixture reads its counters after
 * the test body and before React's cleanup, so an unmount-only teardown is one no assertion watched.
 */
export function VanillaDestroyHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [controller, setController] = useState<Bound<'close'> | null>(null);
  const [visible, setVisible] = useState('closed');
  const [registered, setRegistered] = useState('unknown');
  const [afterDestroy, setAfterDestroy] = useState('no');
  const [destroyer, setDestroyer] = useState<(() => void) | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const manager = createDialogManager();
    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-destroy',
      dialog,
      ariaLabel: 'Vanilla destroy',
      manager,
    });

    // A flag, not a count: the open sequence settles over two transitions, so a count races the
    // second; what matters is whether this listener heard anything after it stopped.
    let destroyed = false;

    let stop: (() => void) | null = bound.subscribe(() => {
      if (destroyed) {
        setAfterDestroy('yes');
      }
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
    });
    setRegistered(manager.lookup().exists('vanilla-destroy') ? 'yes' : 'no');
    setController(bound);

    const teardown = () => {
      // `destroy()` closes an open dialog, so a leaked subscription has something to hear.
      destroyed = true;
      stop?.();
      stop = null;
      bound.destroy();
      setRegistered(manager.lookup().exists('vanilla-destroy') ? 'yes' : 'no');
    };
    setDestroyer(() => {
      return teardown;
    });

    return () => {
      stop?.();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="is-visible">{visible}</span>
      <span data-testid="registered">{registered}</span>
      <span data-testid="after-destroy">{afterDestroy}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>
      {/* Inside the dialog: destroying it while *open* is the case worth watching, and a
          `showModal()` dialog owns the top layer. */}
      <dialog ref={dialogRef}>
        <p>Destroy me</p>
        <button
          data-testid="destroy"
          onClick={() => {
            destroyer?.();
          }}
        >
          Destroy
        </button>
      </dialog>
    </>
  );
}

/**
 * The manager's asking door: `onOpenRequest` is forwarded to the manager, so a request the owner
 * refuses is refused before anything opens, and `requestOpenAndWait` reports which.
 */
export function VanillaOpenRequestHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [outcome, setOutcome] = useState('none');
  const [manager, setManager] = useState<ReturnType<typeof createDialogManager> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const instance = createDialogManager();
    // Assigned below: the manager never opens on the owner's behalf, so the handler must.
    let controller: Bound<'close'> | null = null;

    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-request',
      dialog,
      ariaLabel: 'Vanilla open request',
      manager: instance,
      onOpenRequest: async (payload, request) => {
        if (payload !== 'please') {
          request.refuse('wrong payload');
          return;
        }
        // Opening is the yes; awaited so the accepted outcome cannot resolve ahead of the dialog.
        await controller?.open();
      },
    });
    controller = bound;

    setManager(instance);

    return () => {
      bound.destroy();
      setManager(null);
    };
  }, []);

  return (
    <>
      <span data-testid="outcome">{outcome}</span>
      <button
        data-testid="ask-nicely"
        onClick={() => {
          void manager
            ?.requestOpenAndWait('vanilla-request', { payload: 'please' })
            .then((result) => {
              setOutcome(result.accepted ? 'accepted' : `refused:${result.reason}`);
            });
        }}
      >
        Ask nicely
      </button>
      <button
        data-testid="ask-rudely"
        onClick={() => {
          void manager
            ?.requestOpenAndWait('vanilla-request', { payload: 'nope' })
            .then((result) => {
              setOutcome(result.accepted ? 'accepted' : `refused:${result.reason}`);
            });
        }}
      >
        Ask rudely
      </button>

      <dialog ref={dialogRef}>
        <p>Ask first</p>
      </dialog>
    </>
  );
}

/**
 * A `<dialog>` in a shadow root. `adoptedStyleSheets` does not cross the boundary, so the library's
 * `dialog::backdrop` never applies; `document.activeElement` answers with the *host*, so a
 * document-scoped focus check concludes focus left. React only makes the host; inside is plain DOM.
 */
export function VanillaShadowRootHarness() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<Bound<'confirm'> | null>(null);
  const [visible, setVisible] = useState('closed');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    // `open` so the test can select in: under test is the library's reach, not the tree's opacity.
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <dialog data-testid="shadow-dialog">
        <p>Inside a shadow root</p>
        <button id="confirm">Confirm</button>
      </dialog>
    `;

    const dialog = root.querySelector('dialog');
    const confirm = root.getElementById('confirm');
    if (!(dialog instanceof HTMLDialogElement) || !(confirm instanceof HTMLButtonElement)) {
      return;
    }

    const bound = bindDialog<void, 'confirm'>({
      id: 'vanilla-shadow',
      dialog,
      ariaLabel: 'Vanilla in a shadow root',
      manager: createDialogManager(),
    });

    const unbindConfirm = bound.bindAction(confirm, { reason: 'confirm', focusOnOpen: true });
    const stop = bound.subscribe(() => {
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
    });

    setController(bound);

    return () => {
      stop();
      unbindConfirm();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="is-visible">{visible}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>
      <div ref={hostRef} data-testid="shadow-host" />
    </>
  );
}

/**
 * What unbinding hands back. The caller's markup outlives the controller, so `bindAction`'s writes
 * must be *restored* rather than cleared: the second button is disabled before it is ever bound,
 * which a naive `removeAttribute` gets wrong by switching it on.
 */
export function VanillaRestoreOnUnbindHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const slowRef = useRef<HTMLButtonElement>(null);
  const alreadyOffRef = useRef<HTMLButtonElement>(null);
  const unbindRef = useRef<HTMLButtonElement>(null);
  const [controller, setController] = useState<Bound<'save' | 'other'> | null>(null);
  const [visible, setVisible] = useState('closed');

  useEffect(() => {
    const dialog = dialogRef.current;
    const slow = slowRef.current;
    const alreadyOff = alreadyOffRef.current;
    const unbind = unbindRef.current;
    if (!dialog || !slow || !alreadyOff || !unbind) {
      return;
    }

    const bound = bindDialog<void, 'save' | 'other'>({
      id: 'vanilla-restore',
      dialog,
      ariaLabel: 'Vanilla restore',
      manager: createDialogManager(),
    });

    // Never resolves, so the unbind lands mid-flight, with `disabled` and `aria-busy` still on.
    const unbindSlow = bound.bindAction(slow, {
      reason: 'save',
      hotkey: 'Ctrl+s',
      onAction: async () => {
        await new Promise(() => {
          // Deliberately never settles.
        });
      },
    });
    const unbindOther = bound.bindAction(alreadyOff, { reason: 'other' });

    const handleUnbind = () => {
      unbindSlow();
      unbindOther();
    };
    unbind.addEventListener('click', handleUnbind);

    const stop = bound.subscribe(() => {
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
    });

    setController(bound);

    return () => {
      stop();
      unbind.removeEventListener('click', handleUnbind);
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="is-visible">{visible}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>

      <dialog ref={dialogRef}>
        <button ref={slowRef} data-testid="slow-action">
          Save
        </button>
        <button ref={alreadyOffRef} data-testid="already-off" disabled>
          Other
        </button>
        <button ref={unbindRef} data-testid="unbind">
          Unbind both
        </button>
      </dialog>
    </>
  );
}

/**
 * `aria-busy` on a `<dialog>` the controller does not own. `destroy()` unsubscribes before tearing
 * the store down, so a controller destroyed mid-`prepare` never hears the notification that would
 * clear the attribute — observable only because the element survives the controller.
 */
export function VanillaBusyHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const releaseRef = useRef<HTMLButtonElement>(null);
  const destroyRef = useRef<HTMLButtonElement>(null);
  const [controller, setController] = useState<Bound<'close'> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const release = releaseRef.current;
    const destroy = destroyRef.current;
    if (!dialog || !release || !destroy) {
      return;
    }

    let gate: (() => void) | undefined;

    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-busy',
      dialog,
      ariaLabel: 'Vanilla loading',
      manager: createDialogManager(),
      prepare: async () => {
        await new Promise<void>((resolve) => {
          gate = resolve;
        });
      },
    });

    const handleRelease = () => {
      gate?.();
    };
    const handleDestroy = () => {
      bound.destroy();
    };
    release.addEventListener('click', handleRelease);
    destroy.addEventListener('click', handleDestroy);

    setController(bound);

    return () => {
      release.removeEventListener('click', handleRelease);
      destroy.removeEventListener('click', handleDestroy);
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>

      <dialog ref={dialogRef}>
        <button ref={releaseRef} data-testid="release">
          Release
        </button>
        <button ref={destroyRef} data-testid="destroy">
          Destroy
        </button>
      </dialog>
    </>
  );
}

/**
 * The labelling diagnostic against markup the binding did not write — the only binding where the
 * failure is ordinary, the `id` and its `aria-labelledby` being hand-written in two places. Neither
 * dialog passes an aria option: the check reads the element, which is why it sees these at all.
 */
export function VanillaLabellingHarness() {
  const brokenRef = useRef<HTMLDialogElement>(null);
  const namelessRef = useRef<HTMLDialogElement>(null);
  const [controllers, setControllers] = useState<{
    broken: Bound<'close'>;
    nameless: Bound<'close'>;
  } | null>(null);

  useEffect(() => {
    const broken = brokenRef.current;
    const nameless = namelessRef.current;
    if (!broken || !nameless) {
      return;
    }

    const manager = createDialogManager();
    // The level is global, so it is claimed per open and dropped at the close: a page hosting this
    // beside a hundred other harnesses would otherwise run the whole route with logging on.
    const quieten = () => {
      setLogLevel(false);
    };
    const boundBroken = bindDialog<void, 'close'>({
      id: 'vanilla-broken-label',
      dialog: broken,
      manager,
      onClose: quieten,
    });
    const boundNameless = bindDialog<void, 'close'>({
      id: 'vanilla-nameless',
      dialog: nameless,
      manager,
      onClose: quieten,
    });

    setControllers({ broken: boundBroken, nameless: boundNameless });

    return () => {
      quieten();
      boundBroken.destroy();
      boundNameless.destroy();
      setControllers(null);
    };
  }, []);

  return (
    <>
      <button
        data-testid="open-broken"
        onClick={() => {
          setLogLevel('*');
          void controllers?.broken.open();
        }}
      >
        Open broken
      </button>
      <button
        data-testid="open-nameless"
        onClick={() => {
          setLogLevel('*');
          void controllers?.nameless.open();
        }}
      >
        Open nameless
      </button>

      <dialog ref={brokenRef} aria-labelledby="vanilla-broken-title">
        <h2 id="a-different-id">Broken reference</h2>
      </dialog>

      <dialog ref={namelessRef}>
        <p>Nothing names this one.</p>
      </dialog>
    </>
  );
}

/**
 * A shadow-root dialog and a light-DOM one, one manager, one stack policy — three things nothing else
 * reaches. **Reclaim across a shadow boundary**: `activeWithin` asks the dialog's *own* root, where a
 * document-scoped answer would be "focus left" forever. **The native `close` a raise fires**: a raise
 * is `close()` + `showModal()`, and `close()` *queues* its event, so it arrives with `dialog.open`
 * already `true` — the only way a caller's listener tells a raise from a real close. **`prioritize`
 * through a non-React binding**: the policy is core, so nothing would fail if a binding stopped
 * reaching it, `binding-parity.test.ts` comparing only export names. The manager is hoisted so two
 * controllers share it; tests dispatch the policy toggle's click directly, since under the policy the
 * light-DOM dialog is underneath and a real press would hit a backdrop.
 */
export function VanillaShadowStackHarness() {
  const hostRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDialogElement>(null);
  const [controllers, setControllers] = useState<{
    readonly shadow: Bound<'confirm'>;
    readonly over: Bound<'close'>;
  } | null>(null);
  const [policyOn, setPolicyOn] = useState(false);
  const [manager, setManager] = useState<ReturnType<typeof createDialogManager> | null>(null);
  const [closes, setCloses] = useState('0');
  const [openWhenClosed, setOpenWhenClosed] = useState('n/a');

  useEffect(() => {
    const host = hostRef.current;
    const over = overRef.current;
    if (!host || !over) {
      return;
    }

    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <dialog data-testid="shadow-stack-dialog">
        <p>In front, in a shadow root</p>
        <button id="shadow-confirm">Confirm</button>
        <!-- A second focusable, and the tests turn on it: with only one, "handed back where focus
             was" and "showModal picked the first focusable" are the same element, so an assertion
             cannot tell the two apart. Verified — the reclaim could be removed entirely and the
             one-button version still passed. -->
        <input id="shadow-note" aria-label="Notes" />
      </dialog>
    `;

    const dialog = root.querySelector('dialog');
    const confirm = root.getElementById('shadow-confirm');
    if (!(dialog instanceof HTMLDialogElement) || !(confirm instanceof HTMLButtonElement)) {
      return;
    }

    // A listener the *caller* owns — the situation the contract is written for.
    let seen = 0;
    const handleNativeClose = () => {
      seen += 1;
      setCloses(String(seen));
      // Read inside the listener: a raise has already re-shown the dialog by the time this runs.
      setOpenWhenClosed(dialog.open ? 'still-open' : 'really-closed');
    };
    dialog.addEventListener('close', handleNativeClose);

    const instance = createDialogManager();
    const shadow = bindDialog<void, 'confirm'>({
      id: 'vanilla-shadow-front',
      dialog,
      ariaLabel: 'In front, in a shadow root',
      manager: instance,
      style: { width: '260px', height: '260px' },
    });
    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-light-over',
      dialog: over,
      ariaLabel: 'Opened over it, in the light DOM',
      manager: instance,
      style: { width: '260px', height: '260px' },
    });

    const unbindConfirm = shadow.bindAction(confirm, { reason: 'confirm', focusOnOpen: true });

    setControllers({ shadow, over: bound });
    setManager(instance);

    return () => {
      dialog.removeEventListener('close', handleNativeClose);
      unbindConfirm();
      shadow.destroy();
      bound.destroy();
      setControllers(null);
      setManager(null);
    };
  }, []);

  useEffect(() => {
    if (!policyOn || !manager) {
      return undefined;
    }
    return manager.prioritize((modal) => {
      return modal.id === 'vanilla-shadow-front' ? 10 : 0;
    });
  }, [policyOn, manager]);

  return (
    <>
      <button
        data-testid="open-shadow-front"
        onClick={() => {
          void controllers?.shadow.open();
        }}
      >
        Open the shadow one
      </button>
      <button
        data-testid="open-light-over"
        onClick={() => {
          void controllers?.over.open();
        }}
      >
        Open the light one over it
      </button>
      <button
        data-testid="toggle-policy"
        onClick={() => {
          setPolicyOn((previous) => {
            return !previous;
          });
        }}
      >
        Toggle the policy
      </button>
      <span data-testid="policy">{policyOn ? 'on' : 'off'}</span>
      <span data-testid="native-closes">{closes}</span>
      <span data-testid="open-when-closed">{openWhenClosed}</span>
      <div ref={hostRef} data-testid="shadow-stack-host" />
      <dialog ref={overRef} data-testid="light-over-dialog">
        <p>Over it</p>
      </dialog>
    </>
  );
}

/**
 * `nonModal: true, portal: true` — the placement without the relocation, since a controller cannot
 * move markup the caller wrote. The dialog sits in a wrapper inside a `transform`ed ancestor: the
 * containing block `fixed` resolves against instead of the viewport, so which half arrived shows.
 */
export function VanillaPortalHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [controller, setController] = useState<Bound<'close'> | null>(null);
  const [visible, setVisible] = useState('closed');

  useEffect(() => {
    const dialog = dialogRef.current;
    const close = closeRef.current;
    if (!dialog || !close) {
      return;
    }

    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-portal',
      dialog,
      ariaLabel: 'Vanilla portal',
      nonModal: true,
      portal: true,
      manager: createDialogManager(),
    });

    const unbindClose = bound.bindAction(close, { reason: 'close' });
    const stop = bound.subscribe(() => {
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
    });

    setController(bound);

    return () => {
      stop();
      unbindClose();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="is-visible">{visible}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>

      <div
        data-testid="transformed"
        style={{
          transform: 'translateZ(0)',
          position: 'absolute',
          top: 40,
          left: 60,
          width: 320,
          height: 240,
        }}
      >
        <div data-testid="wrapper">
          <dialog ref={dialogRef}>
            <p>Portaled in name only</p>
            <button ref={closeRef} data-testid="close">
              Close
            </button>
          </dialog>
        </div>
      </div>
    </>
  );
}

/**
 * `containFocus`, `dismissOnClickOutside` and a custom `dismissKey` — all non-modal (`containFocus`
 * is the Tab wrap `show()` does not give, and the union rejects dismissal on a modal dialog);
 * `portal: true` so no host is needed. The instant animation is load-bearing: with the default 200 ms
 * exit a closing panel still reports `isVisible`, so "still open after the press" matches a close.
 */
export function VanillaNonModalOptionsHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [controller, setController] = useState<Bound<'inside'> | null>(null);
  const [visible, setVisible] = useState('closed');
  const [reason, setReason] = useState('none');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const bound = bindDialog<void, 'inside'>({
      id: 'vanilla-non-modal-options',
      dialog,
      ariaLabel: 'Vanilla non-modal options',
      nonModal: true,
      portal: true,
      containFocus: true,
      dismissOnClickOutside: true,
      // Not Escape: no native `cancel` here, so an Escape close would mean the key was ignored.
      dismissKey: 'Delete',
      animation: {
        entrance: { opacity: '1' },
        exit: { opacity: '0' },
        duration: 0,
        exitDuration: 0,
        transitionProperty: 'opacity',
      },
      manager: createDialogManager(),
      onClose: (result) => {
        setReason(result.reason);
      },
    });

    const stop = bound.subscribe(() => {
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
    });
    setController(bound);

    return () => {
      stop();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <>
      <span data-testid="is-visible">{visible}</span>
      <span data-testid="last-reason">{reason}</span>
      <button
        data-testid="open"
        onClick={() => {
          void controller?.open();
        }}
      >
        Open
      </button>
      <button data-testid="outside" style={{ width: 120 }}>
        Outside
      </button>

      <dialog ref={dialogRef}>
        <p>Vanilla non-modal options</p>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </dialog>
    </>
  );
}

/**
 * `reconcileOpen` from the controller's own snapshot — why `phase` is exposed on this binding alone:
 * there is no render pass to be the clock. The 120 ms exit is deliberate, since the window where
 * `phase` is `'closing'` while `isVisible` is still true is the whole point.
 */
export function VanillaReconcileHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [controller, setController] = useState<Bound<'close'> | null>(null);
  const [wanted, setWanted] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>('closed');
  /**
   * Every phase the controller published, not only the latest. Reading the current one loses any
   * transition that shares a React batch with the next — which is what `'closing'` does when an exit
   * settles quickly — and deciding on `isVisible` differs from deciding on `phase` **only** while the
   * phase is `'closing'`. Without this the harness never observes the window the decision turns on.
   */
  const [phasesSeen, setPhasesSeen] = useState<ModalPhase[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [asked, setAsked] = useState<string[]>([]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-reconcile',
      dialog,
      ariaLabel: 'Vanilla reconcile',
      nonModal: true,
      portal: true,
      animation: {
        entrance: { opacity: '1' },
        exit: { opacity: '0' },
        duration: 0,
        exitDuration: 120,
        transitionProperty: 'opacity',
      },
      manager: createDialogManager(),
      onClose: () => {
        setWanted(false);
      },
    });
    const stop = bound.subscribe(() => {
      const next = bound.getSnapshot().phase;
      setPhase(next);
      // Functional, so a batch cannot swallow the phase that shared it.
      setPhasesSeen((seen) => {
        return seen.at(-1) === next ? seen : [...seen, next];
      });
    });
    setController(bound);
    return () => {
      stop();
      bound.destroy();
      setController(null);
    };
  }, []);

  useEffect(() => {
    if (!controller) {
      return;
    }
    const next = reconcileOpen(phase, wanted);
    if (next !== 'none') {
      // The controller is the external system here, and the recorded list is what the test
      // asserts on.
      // oxlint-disable-next-line react/set-state-in-effect
      setAsked((seen) => {
        return [...seen, next];
      });
    }
    if (next === 'open') {
      setOpenCount((count) => {
        return count + 1;
      });
      void controller.open();
    } else if (next === 'close') {
      controller.handle.close('close');
    }
  }, [controller, phase, wanted]);

  return (
    <>
      <span data-testid="phase">{phase}</span>
      <span data-testid="phases-seen">{phasesSeen.join(',')}</span>
      <span data-testid="wanted">{wanted ? 'true' : 'false'}</span>
      <span data-testid="open-count">{openCount}</span>
      <span data-testid="asked">{asked.join(',')}</span>
      <button
        data-testid="raise"
        onClick={() => {
          setWanted(true);
        }}
      >
        Raise
      </button>
      <button
        data-testid="lower"
        onClick={() => {
          setWanted(false);
        }}
      >
        Lower
      </button>
      <button
        data-testid="open-behind-its-back"
        onClick={() => {
          controller?.dialogManager.open('vanilla-reconcile');
        }}
      >
        Open imperatively
      </button>

      <dialog ref={dialogRef}>
        <p>Vanilla reconcile</p>
        <button
          data-testid="close-and-lower"
          onClick={() => {
            // Both at once: `onClose` runs only when the exit finishes.
            controller?.handle.close('close');
            setWanted(false);
          }}
        >
          Close and lower
        </button>
      </dialog>
    </>
  );
}

/**
 * A `<dialog open>` the server sent, adopted after the fact — the SSR hydration gap. `nonModal` is a
 * prop because both answers are correct: a non-modal dialog is adopted where it stands, a modal one
 * cannot be, since the top layer is only enterable from script.
 */
export function VanillaServerOpenHarness({ nonModal }: { readonly nonModal: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState('?');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    dialog.setAttribute('open', '');

    const bound = nonModal
      ? bindDialog<void, 'close'>({
          id: 'vanilla-server-open',
          dialog,
          nonModal: true,
          ariaLabel: 'Server rendered',
          manager: createDialogManager(),
        })
      : bindDialog<void, 'close'>({
          id: 'vanilla-server-open',
          dialog,
          nonModal: false,
          ariaLabel: 'Server rendered',
          manager: createDialogManager(),
        });

    const stop = bound.subscribe(() => {
      setPhase(bound.getSnapshot().phase);
    });
    setPhase(bound.getSnapshot().phase);
    return () => {
      stop();
      bound.destroy();
    };
  }, [nonModal]);

  return (
    <div>
      <span data-testid="phase">{phase}</span>
      <dialog ref={dialogRef}>
        <p>Rendered by the server</p>
        <button type="button" data-testid="inside">
          Inside
        </button>
      </dialog>
    </div>
  );
}

/**
 * A modal claiming no opening focus, a non-modal panel opening underneath — the claimless half of
 * {@link VanillaShadowStackHarness}, whose `focusOnOpen` gives the reclaim a marker to aim at.
 * Without one it falls through to `dialog.focus()`, which an open `<dialog>` refuses. Two focusables,
 * because with one "handed back to the first focusable" and "focus never moved" are one element.
 */
export function VanillaClaimlessReclaimHarness() {
  const modalRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [controllers, setControllers] = useState<{
    readonly modal: Bound<'confirm' | 'cancel'>;
    readonly panel: Bound<'close'>;
  } | null>(null);

  useEffect(() => {
    const modalEl = modalRef.current;
    const panelEl = panelRef.current;
    const cancel = cancelRef.current;
    const confirm = confirmRef.current;
    if (!modalEl || !panelEl || !cancel || !confirm) {
      return;
    }

    const instance = createDialogManager();
    const modal = bindDialog<void, 'confirm' | 'cancel'>({
      id: 'vanilla-claimless',
      dialog: modalEl,
      ariaLabel: 'Vanilla modal claiming no opening focus',
      manager: instance,
      style: { width: '260px', height: '200px' },
    });
    const panel = bindDialog<void, 'close'>({
      id: 'vanilla-claimless-panel',
      dialog: panelEl,
      ariaLabel: 'Panel opening underneath',
      nonModal: true,
      // Viewport-anchored: contained would lay an `inset: 0` wrapper over the harness's trigger.
      portal: true,
      manager: instance,
      style: { width: '200px', height: '160px' },
    });

    // Neither takes `focusOnOpen`, which is what puts this harness on the floor's path.
    const unbindCancel = modal.bindAction(cancel, { reason: 'cancel' });
    const unbindConfirm = modal.bindAction(confirm, { reason: 'confirm' });

    setControllers({ modal, panel });

    return () => {
      unbindCancel();
      unbindConfirm();
      modal.destroy();
      panel.destroy();
      setControllers(null);
    };
  }, []);

  return (
    <div>
      <button
        data-testid="open-both"
        onClick={() => {
          void controllers?.modal.open().then(() => {
            return controllers.panel.open();
          });
        }}
        type="button"
      >
        Open the modal, then the panel underneath
      </button>

      <dialog ref={modalRef} data-testid="vanilla-claimless-dialog">
        <p>Claims nothing</p>
        <button data-testid="vanilla-claimless-cancel" ref={cancelRef} type="button">
          Cancel
        </button>
        <button data-testid="vanilla-claimless-confirm" ref={confirmRef} type="button">
          Confirm
        </button>
      </dialog>

      <dialog ref={panelRef} data-testid="vanilla-claimless-panel-dialog">
        <button data-testid="vanilla-panel-button" type="button">
          In the panel
        </button>
      </dialog>
    </div>
  );
}

/**
 * A `prepare` that throws, reported through `onError`. Its own harness because there is no render
 * pass: the state reaches the page through the caller's own listener. `aria-busy` — the library's one
 * owned attribute on the caller's markup — says the settle reached the element, not only the store.
 */
export function VanillaPrepareFailureHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [controller, setController] = useState<Bound<'close'> | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [message, setMessage] = useState('none');
  const [preparing, setPreparing] = useState('ready');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-prepare-failure',
      dialog,
      ariaLabel: 'Vanilla prepare that fails',
      manager: createDialogManager(),
      prepare: async () => {
        await Promise.resolve();
        throw new Error('report is unavailable');
      },
      onError: ({ error, source }) => {
        setSources((seen) => {
          return [...seen, source];
        });
        setMessage(error.message);
      },
    });

    const stop = bound.subscribe(() => {
      setPreparing(bound.getSnapshot().isPreparing ? 'preparing' : 'ready');
    });
    setController(bound);

    return () => {
      stop();
      bound.destroy();
      setController(null);
    };
  }, []);

  return (
    <div>
      <button
        data-testid="vpf-open"
        onClick={() => {
          void controller?.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="vpf-sources">{sources.join(',') || 'none'}</span>
      <span data-testid="vpf-message">{message}</span>
      <span data-testid="vpf-preparing">{preparing}</span>

      <dialog ref={dialogRef}>
        <p>The dialog is up either way.</p>
      </dialog>
    </div>
  );
}
