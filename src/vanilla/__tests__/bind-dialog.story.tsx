import { useEffect, useRef, useState } from 'react';
import { reconcileOpen } from '../../core/reconcile-open.js';
import { createDialogManager } from '../../manager/dialog-manager.js';
import { setLogLevel } from '../../utils/logger.js';
import { bindDialog } from '../bind-dialog.js';
import type { ModalPhase } from '../../core/types.js';
import type { DialogController } from '../types.js';

/**
 * The vanilla binding, driven from a React component test.
 *
 * React's only job here is to put a `<dialog>` on the page and hand it over — after that nothing
 * it does is under test. That is a fair harness precisely because the binding never renders:
 * whoever wrote the markup is irrelevant to it, which is the property being demonstrated.
 *
 * Each harness gets its own `createDialogManager()`, passed as the `manager` option. That is the
 * vanilla answer to `DialogManagerProvider` — no tree, so the instance is passed rather than
 * provided — and without it these would register with the singleton and leak between tests.
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
      bound.bindAction(cancel, 'cancel', { hotkey: 'Escape' }),
      bound.bindAction(confirm, 'confirm', {
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

    // Nothing re-renders the caller's markup, so state reaches the page the vanilla way. The
    // subscription covers the actions as well as the phases, which is what makes the per-action
    // reads below live without a second listener.
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

      {/* The markup is the caller's, entirely. The binding never writes into it. */}
      <dialog ref={dialogRef}>
        <p>Vanilla content</p>
        <button ref={cancelRef}>Cancel</button>
        <button ref={confirmRef}>Confirm</button>
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

    let unbindConfirm: (() => void) | null = bound.bindAction(confirm, 'confirm');

    // Inside the dialog, because a `showModal()` dialog owns the top layer — the same rule the
    // React and Solid stories follow. A plain listener, not an action.
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
 * Where focus lands after an action **fails** — the retry belongs under the hand that pressed it.
 *
 * The controller is the binding where that is hardest, and it is why this harness exists rather
 * than a Solid or React twin: `bindAction` writes `disabled` from its own synchronous engine
 * subscriber, and the caller binds actions *after* `bindDialog` has returned, so that subscriber
 * is registered ahead of the focus coordinator's. The browser blurs a disabled element, so
 * reading who held focus when the action started finds nothing — and the retry lands on the
 * dialog instead of on the button.
 *
 * Nothing about that needs a shadow root or a second framework; it is plain markup here on
 * purpose, because the bug was never about either.
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

    // `focusOnOpen` on the *other* button, so "focus went back to the runner" cannot be confused
    // with "focus never moved": the opening focus is Cancel and the runner is Submit.
    const unbindCancel = bound.bindAction(cancel, 'cancel', { focusOnOpen: true });
    const unbindFail = bound.bindAction(fail, 'submit', {
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
 * A **contained** non-modal panel — `nonModal: true` without `portal`.
 *
 * The one variant that needs something from the caller beyond the dialog: it is positioned
 * `absolute` against a host, and a binding that owns no markup has to be pointed at one. The
 * default is the dialog's parent, which is what this harness exercises; the host is styled by the
 * library and so must sit inside a *sized, positioned* region, or the panel collapses to nothing
 * and every assertion about it passes vacuously.
 *
 * Nothing enters the top layer here, so the region behind the panel stays clickable — which is the
 * property `pointerEvents` on the host exists to preserve, and the one asserted below.
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

    const unbindClose = bound.bindAction(close, 'close');
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

      {/* The sized, positioned region the placement contract requires of the caller. */}
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
        {/* The host: the dialog's parent, which is what the binding defaults to. */}
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
 * The same variant, told explicitly which element to position against.
 *
 * The dialog's parent is a plain wrapper here and the host is its grandparent, so a passing
 * assertion cannot be the default branch answering by coincidence.
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
 * A contained dialog with nothing to position against — the branch that has to degrade rather
 * than throw.
 *
 * The dialog is never appended, so it has no parent and no host was named. The binding warns and
 * carries on: a controller that threw here would take down the caller's render over a positioning
 * problem, and one that silently styled `document.body` would be worse.
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

    // Detached *before* binding, because the host is resolved once at bind time: this is the
    // branch where `dialog.parentElement` is null and no `host` was named.
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
      {/* Read on demand rather than seeded from the effect: a controller that survived the
          missing host still answers, which is what "degrades rather than throws" has to mean. */}
      <button
        data-testid="probe"
        onClick={() => {
          setPhase(controller?.getSnapshot().phase ?? 'unbound');
        }}
      >
        Probe
      </button>
      {/* Rendered so React has an element to hand over; the effect detaches it immediately. */}
      <dialog ref={dialogRef}>
        <p>No host to position against</p>
      </dialog>
    </>
  );
}

/**
 * `destroy()` under the test's own control, rather than at unmount.
 *
 * It has to be a button on the page: the coverage fixture reads its counters after the test body
 * and before React's cleanup, so a teardown that only ever runs at unmount is a teardown no
 * assertion has watched. That is the same reason the Solid suite unmounts from inside the page.
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

    // A flag rather than a notification count: the open sequence settles over two transitions, so
    // any count read from the test is a race with the second one. What the assertion actually
    // wants is "did this listener hear anything *after* it was stopped", and that is a fact the
    // listener itself can record.
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
      // The subscription's own unsubscribe, then the controller's: two teardowns, and the point
      // is that neither leaves the other holding a reference. `destroy()` closes an open dialog,
      // so a leaked subscription has something to hear here.
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
      {/* Inside the dialog, because destroying it while it is *open* is the case worth watching
          and a `showModal()` dialog owns the top layer — a button outside it is unclickable. */}
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
 * The manager's asking door, through the controller.
 *
 * `onOpenRequest` is forwarded to the manager rather than handled here, so a request refused by
 * the owner is refused before anything opens — and `requestOpenAndWait` reports which.
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
    // Assigned right below: the handler is declared inside the options `bindDialog` is being
    // called with, and it is what has to do the opening — the manager never opens on the owner's
    // behalf, because acceptance is not something it can infer.
    let controller: Bound<'close'> | null = null;

    const bound = bindDialog<void, 'close'>({
      id: 'vanilla-request',
      dialog,
      ariaLabel: 'Vanilla open request',
      manager: instance,
      onOpenRequest: async (payload, request) => {
        // Refuse anything that is not the password, so both branches are reachable from the page.
        if (payload !== 'please') {
          request.refuse('wrong payload');
          return;
        }
        // Opening is the yes. Awaited so the accepted outcome cannot resolve ahead of the dialog.
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
 * A `<dialog>` inside a shadow root, which is the one tree the library cannot reach into.
 *
 * Two things it changes and both were wrong before: `adoptedStyleSheets` does not cross the
 * boundary, so the library's own `dialog::backdrop` never applied and the dialog fell back to the
 * UA's; and `document.activeElement` answers with the *host*, so every focus check concluded that
 * focus had left the dialog.
 *
 * React's only job is to make the host — everything inside is plain DOM, which is the shape a web
 * component has anyway.
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

    // `open` so the test can select into it — a closed root would also hide the dialog from the
    // assertions, and what is under test is the library's reach, not the tree's opacity.
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

    const unbindConfirm = bound.bindAction(confirm, 'confirm', { focusOnOpen: true });
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
 * What unbinding hands back.
 *
 * `bindAction` writes onto a button this binding did not create, and unlike the two hook bindings
 * it cannot rely on the button going away — the markup is the caller's and outlives the
 * controller. So the writes have to be undone, and *restored* rather than cleared: the second
 * button here is disabled in the markup before it is ever bound, which is the case a naive
 * `removeAttribute` gets wrong by switching it on.
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

    // Never resolves: the action stays running so the unbind lands mid-flight, which is the state
    // that used to weld `disabled` and `aria-busy` onto the caller's button for good.
    const unbindSlow = bound.bindAction(slow, 'save', {
      hotkey: 'Ctrl+s',
      onAction: async () => {
        await new Promise(() => {
          // Deliberately never settles.
        });
      },
    });
    const unbindOther = bound.bindAction(alreadyOff, 'other');

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
        {/* Disabled by the caller, before anything binds it. */}
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
 * `aria-busy` on a `<dialog>` the controller does not own — including the teardown that used to
 * leave it welded on.
 *
 * `destroy()` unsubscribes before it tears the store down, so a controller destroyed while
 * `prepare` is still running never gets the notification that would clear the attribute. The
 * element survives the controller here, which is what makes that observable at all.
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
 * The labelling diagnostic against markup the binding did not write.
 *
 * This is the binding it matters most in and the only one where the failure is *ordinary*: the
 * `id` and the `aria-labelledby` that references it are both hand-written, in two places, by
 * someone who will not see the result. Note that neither dialog below passes any aria option —
 * the check reads the element, which is the whole reason it can see these at all.
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

    setLogLevel('*');

    const manager = createDialogManager();
    const boundBroken = bindDialog<void, 'close'>({
      id: 'vanilla-broken-label',
      dialog: broken,
      manager,
    });
    const boundNameless = bindDialog<void, 'close'>({
      id: 'vanilla-nameless',
      dialog: nameless,
      manager,
    });

    setControllers({ broken: boundBroken, nameless: boundNameless });

    return () => {
      setLogLevel(false);
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
          void controllers?.broken.open();
        }}
      >
        Open broken
      </button>
      <button
        data-testid="open-nameless"
        onClick={() => {
          void controllers?.nameless.open();
        }}
      >
        Open nameless
      </button>

      {/* The id it names is nowhere in this tree — the ordinary hand-written mistake. */}
      <dialog ref={brokenRef} aria-labelledby="vanilla-broken-title">
        <h2 id="a-different-id">Broken reference</h2>
      </dialog>

      {/* No name at all, by either route. */}
      <dialog ref={namelessRef}>
        <p>Nothing names this one.</p>
      </dialog>
    </>
  );
}

/**
 * A shadow-root dialog and a light-DOM one, one manager, one stack policy.
 *
 * The composition of two harnesses above, and it exists to reach three things nothing else does.
 *
 * **The reclaim across a shadow boundary.** When something opens over the front dialog, that dialog
 * takes the focus back itself — and the only shadow-aware question in that path is `activeWithin`,
 * which asks the dialog's *own* root rather than the document. A dialog in a shadow root is where a
 * document-scoped answer would silently be "focus left" forever, and the microfrontend demo has one.
 *
 * **The native `close` event a raise fires.** Moving a modal dialog is `close()` + `showModal()`, so
 * the element emits a `close` nobody asked for. `close()` *queues* it, so it arrives with
 * `dialog.open` already back to `true` — which is the only way a listener can tell a raise from a
 * real close, and the counter below records both halves. It matters here and nowhere else: in
 * `umbra/vanilla` the `<dialog>` and every listener on it are the caller's.
 *
 * **`prioritize` through a binding that is not React.** The policy is core and all three bindings
 * inherit it without a line of their own, which is exactly why nothing would fail if one of them
 * stopped reaching it — `binding-parity.test.ts` compares export names, and `prioritize` is a method
 * on `DialogManager`.
 *
 * The manager is hoisted into a variable rather than constructed inline, because two controllers have
 * to share it. The policy toggle sits on the page and the tests dispatch its click directly: under
 * the policy the light-DOM dialog is the one underneath, so a real press would land on a backdrop.
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
  /** How many native `close` events the shadow dialog has emitted, and whether it was open then. */
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

    // A listener the *caller* owns, which is the situation the contract is written for.
    let seen = 0;
    const handleNativeClose = () => {
      seen += 1;
      setCloses(String(seen));
      // Read inside the listener, because that is when the answer is load-bearing: a raise has
      // already re-shown the dialog by the time this runs, and this is what tells the two apart.
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

    const unbindConfirm = shadow.bindAction(confirm, 'confirm', { focusOnOpen: true });

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
    // The shadow dialog outranks the one that opens over it.
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
 * `nonModal: true, portal: true` — the placement without the relocation.
 *
 * The other two bindings answer this option by *moving* the dialog to `document.body`; a controller
 * cannot, because the element is markup the caller wrote. So the option is a placement here and the
 * harness is built to prove which half arrived: the `<dialog>` sits inside a marked wrapper, and
 * that wrapper is inside a `transform`ed ancestor — which is the containing block `fixed` resolves
 * against instead of the viewport, and therefore the visible consequence a caller has to know about.
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

    const unbindClose = bound.bindAction(close, 'close');
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

      {/* The ancestor that hijacks a `fixed` containing block. Sized and offset so a panel
          resolving against it is unmistakably not resolving against the viewport. */}
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
 * The three options React's suite exercised and this binding's did not: `containFocus`,
 * `dismissOnClickOutside` and a custom `dismissKey`.
 *
 * Non-modal, because that is the variant all three belong to — `containFocus` is the Tab wrap
 * `show()` does not give a dialog, and the discriminated union would reject the dismissal option on a
 * modal one. The dialog is `portal: true` so it needs no host, which keeps the harness about the three
 * options and nothing else.
 *
 * The instant animation is load-bearing rather than cosmetic: with the default 200 ms exit a panel that
 * *is* closing still reports `isVisible` for that window, so "still open just after the press" would
 * match during a close and an assertion could hold either way.
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
      // Not Escape: a non-modal dialog gets no native `cancel`, so a panel closing on Escape here
      // could only mean the declared key was ignored.
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
 * `reconcileOpen` driven from the controller's own snapshot.
 *
 * The other two bindings read `phase` through `useLookup`; here it is on the snapshot the controller
 * already publishes — which is why `phase` is exposed on this binding and on neither of the others.
 * There is no render pass to be the clock, so the snapshot is the only one there is.
 *
 * The exit is 120 ms on purpose: the window where `phase` is `'closing'` and `isVisible` is still true
 * is the whole of what deciding on `phase` buys, and a zero-duration exit closes it.
 */
export function VanillaReconcileHarness() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [controller, setController] = useState<Bound<'close'> | null>(null);
  const [wanted, setWanted] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>('closed');
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
      setPhase(bound.getSnapshot().phase);
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
            // Both at once: the only way into the window where `phase` and `isVisible` disagree,
            // because `onClose` runs when the exit finishes.
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
 * A `<dialog open>` the server sent, adopted by `bindDialog` after the fact.
 *
 * The hydration gap an SSR page actually has: the markup is on screen before any script runs, and
 * the binding arrives to a dialog that is already open. `nonModal` is the harness's prop because
 * the two answers are different and both are correct — a non-modal dialog is adopted where it
 * stands, a modal one cannot be, since the top layer is only enterable from script.
 */
export function VanillaServerOpenHarness({ nonModal }: { readonly nonModal: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState('?');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    // What the server sent: an open dialog, before any binding existed.
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
 * A modal that claims no opening focus, with a non-modal panel opening underneath it.
 *
 * The claimless half of {@link VanillaShadowStackHarness}, and the distinction is the whole point:
 * that one binds `focusOnOpen` to its confirm button, so the reclaim has a marker to aim at and
 * never reaches the floor beneath it. Most dialogs claim nothing — including the shell warning the
 * arrangement came from — and for those the reclaim used to end at `dialog.focus()`, which an open
 * `<dialog>` refuses.
 *
 * Two focusable buttons, because with one "handed back to the first focusable" and "focus never
 * moved" are the same element and no assertion can tell them apart.
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
      // Viewport-anchored rather than contained: the contained path puts a library-owned
      // `inset: 0` wrapper over the nearest sized ancestor, which here is the page, and the
      // harness's own trigger ends up underneath it.
      portal: true,
      manager: instance,
      style: { width: '200px', height: '160px' },
    });

    // Bound without `focusOnOpen` on either, which is what puts this harness on the floor's path.
    const unbindCancel = modal.bindAction(cancel, 'cancel');
    const unbindConfirm = modal.bindAction(confirm, 'confirm');

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
