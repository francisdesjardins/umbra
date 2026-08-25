import { useState } from 'react';
import { dialogStyle } from '../../__tests__/story-styles.js';
import { useDialog } from '../use-dialog.js';
import { useLookup } from '../use-lookup.js';

/** `useLookup(id)` reactivity: ModalInfo values update with no manual query. */
export function UseLookupHarness() {
  const info = useLookup('reactive-modal');

  const { Modal, dialogManager } = useDialog<void, 'done'>({
    id: 'reactive-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Reactive modal</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('reactive-modal');
        }}
      >
        Open
      </button>
      <span data-testid="exists">{String(info.exists)}</span>
      <span data-testid="is-visible">{String(info.isVisible)}</span>
      <span data-testid="phase">{info.phase}</span>
      <span data-testid="is-foreground">{String(info.isForeground)}</span>
      {Modal}
    </div>
  );
}

/** An unregistered id: the null-object default, reactively. */
export function UseLookupUnregisteredHarness() {
  const info = useLookup('ghost-modal');

  return (
    <div>
      <span data-testid="exists">{String(info.exists)}</span>
      <span data-testid="is-visible">{String(info.isVisible)}</span>
      <span data-testid="is-preparing">{String(info.isPreparing)}</span>
      <span data-testid="phase">{info.phase}</span>
      <span data-testid="is-foreground">{String(info.isForeground)}</span>
    </div>
  );
}

/**
 * A watcher outside the modal telling "open" from "ready". `phase` describes the `<dialog>`, so
 * `'opening'` is one frame wide however long prepare takes; `isPreparing` is the other axis.
 * `prepare` is held on a promise released from a button inside the dialog — the top layer swallows
 * clicks anywhere else — so the preparing window is as long as the test needs and never a race.
 */
export function UseLookupPreparingHarness() {
  const info = useLookup('preparing-modal');

  // Built in the initializer so `arm`/`release` never change identity; re-armed per open, so
  // reopening prepares again instead of resolving instantly.
  const [gate] = useState(() => {
    let release: () => void = () => {
      return undefined;
    };
    return {
      arm: (): Promise<void> => {
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      },
      release: (): void => {
        release();
      },
    };
  });

  const { Modal, dialogManager } = useDialog<void, 'done'>({
    id: 'preparing-modal',
    prepare: () => {
      return gate.arm();
    },
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Preparing modal</p>
          <button
            onClick={() => {
              gate.release();
            }}
          >
            Finish preparing
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('preparing-modal');
        }}
      >
        Open
      </button>
      <span data-testid="is-visible">{String(info.isVisible)}</span>
      <span data-testid="is-preparing">{String(info.isPreparing)}</span>
      <span data-testid="phase">{info.phase}</span>
      {Modal}
    </div>
  );
}

/** Foreground tracking across two modals. */
export function UseLookupForegroundHarness() {
  const infoA = useLookup('fg-lookup-a');
  const infoB = useLookup('fg-lookup-b');

  const { Modal: Modal1, dialogManager } = useDialog<void, 'done'>({
    id: 'fg-lookup-a',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal A</p>
          <button
            onClick={() => {
              dialogManager.open('fg-lookup-b');
            }}
          >
            Open B
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close A
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useDialog<void, 'done'>({
    id: 'fg-lookup-b',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal B</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close B
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('fg-lookup-a');
        }}
      >
        Open A
      </button>
      <span data-testid="a-open">{String(infoA.isVisible)}</span>
      <span data-testid="a-fg">{String(infoA.isForeground)}</span>
      <span data-testid="b-open">{String(infoB.isVisible)}</span>
      <span data-testid="b-fg">{String(infoB.isForeground)}</span>
      {Modal1}
      {Modal2}
    </div>
  );
}
