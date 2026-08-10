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

    // Nothing re-renders the caller's markup, so state reaches the page the vanilla way.
    const stop = bound.subscribe(() => {
      setVisible(bound.getSnapshot().isVisible ? 'open' : 'closed');
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
