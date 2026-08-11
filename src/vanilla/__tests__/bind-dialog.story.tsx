import { useEffect, useRef, useState } from 'react';
import { createDialogManager } from '../../manager/dialog-manager.js';
import { bindDialog } from '../bind-dialog.js';
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
