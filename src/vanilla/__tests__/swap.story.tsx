import { useEffect, useRef, useState } from 'react';
import { createDialogManager } from '../../manager/dialog-manager.js';
import { bindDialog } from '../bind-dialog.js';
import type { DialogController } from '../types.js';

/**
 * A `<dialog>` that arrives as server-written markup and is later replaced wholesale — the shape
 * every hypermedia library swaps in (htmx `hx-swap`, Turbo's stream, Unpoly's fragment). React is
 * only the harness here: it renders an empty host and writes strings into it, because a fragment
 * from a server is exactly a string nobody's renderer owns.
 *
 * The question it exists to answer is what a controller bound to the old element does once that
 * element is gone, and what the caller has to do about it.
 */

const FRAGMENT = (label: string) => {
  // No `data-testid` of its own: `bindDialog` stamps `modal-{id}`, which is what the tests ask for.
  return `<dialog aria-label="Swapped panel">
    <p data-testid="swap-label">${label}</p>
    <button data-testid="swap-ok">OK</button>
  </dialog>`;
};

export function VanillaSwapHarness() {
  const hostRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<ReturnType<typeof createDialogManager> | null>(null);
  const controllerRef = useRef<DialogController<void, 'ok'> | null>(null);

  const [label, setLabel] = useState('first fragment');
  const [phase, setPhase] = useState('closed');
  const [binds, setBinds] = useState(0);
  const [registered, setRegistered] = useState(0);

  managerRef.current ??= createDialogManager();

  /** Bind whatever `<dialog>` is in the host right now. */
  const bindWhatIsThere = () => {
    const host = hostRef.current;
    const manager = managerRef.current;
    const dialog = host?.querySelector('dialog');
    if (!host || !manager || !(dialog instanceof HTMLDialogElement)) {
      return;
    }
    const bound = bindDialog<void, 'ok'>({
      id: 'vanilla-swap',
      dialog,
      manager,
      ariaLabel: 'Swapped panel',
      // Viewport-anchored, so the harness owes no sized host — placement is not what this asks.
      nonModal: true,
      portal: true,
    });
    const ok = dialog.querySelector('[data-testid="swap-ok"]');
    if (ok instanceof HTMLButtonElement) {
      bound.bindAction(ok, { reason: 'ok' });
    }
    bound.subscribe(() => {
      setPhase(bound.getSnapshot().phase);
    });
    controllerRef.current = bound;
    setBinds((count) => {
      return count + 1;
    });
    setRegistered(manager.lookup().getRegisteredCount());
  };

  useEffect(() => {
    const host = hostRef.current;
    if (host) {
      host.innerHTML = FRAGMENT('first fragment');
      bindWhatIsThere();
    }
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only: the host is written once here and by the swaps below
  }, []);

  /** What a hypermedia library does: the fragment is replaced and nothing is told. */
  const swapNaively = () => {
    const host = hostRef.current;
    if (host) {
      setLabel('second fragment');
      host.innerHTML = FRAGMENT('second fragment');
    }
  };

  /** The same swap, with the controller retired first and rebuilt over what arrived. */
  const swapAndRebind = () => {
    controllerRef.current?.destroy();
    controllerRef.current = null;
    swapNaively();
    bindWhatIsThere();
  };

  return (
    <div>
      <button
        data-testid="swap-open"
        onClick={() => {
          void controllerRef.current?.open();
        }}
      >
        Open
      </button>
      <button data-testid="swap-naive" onClick={swapNaively}>
        Swap only
      </button>
      <button data-testid="swap-rebind" onClick={swapAndRebind}>
        Swap and rebind
      </button>
      <span data-testid="swap-phase">{phase}</span>
      <span data-testid="swap-binds">{binds}</span>
      <span data-testid="swap-registered">{registered}</span>
      <span data-testid="swap-current">{label}</span>
      <div data-testid="swap-host" ref={hostRef} />
    </div>
  );
}
