import { useState } from 'react';
import { dialogStyle } from '../../__tests__/story-styles.js';
import { useDialog } from '../use-dialog.js';
import { useLookup } from '../use-lookup.js';

/** `useLookup(id)` reactivity: DialogInfo values update with no manual query. */
export function UseLookupHarness() {
  const info = useLookup('reactive-dialog');

  const { Dialog, dialogManager } = useDialog<void, 'done'>({
    id: 'reactive-dialog',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Reactive dialog</p>
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
          dialogManager.open('reactive-dialog');
        }}
      >
        Open
      </button>
      <span data-testid="exists">{String(info.exists)}</span>
      <span data-testid="is-visible">{String(info.isVisible)}</span>
      <span data-testid="phase">{info.phase}</span>
      <span data-testid="is-foreground">{String(info.isForeground)}</span>
      {Dialog}
    </div>
  );
}

/** An unregistered id: the null-object default, reactively. */
export function UseLookupUnregisteredHarness() {
  const info = useLookup('ghost-dialog');

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
 * A watcher outside the dialog telling "open" from "ready". `phase` describes the `<dialog>`, so
 * `'opening'` is one frame wide however long prepare takes; `isPreparing` is the other axis.
 * `prepare` is held on a promise released from a button inside the dialog — the top layer swallows
 * clicks anywhere else — so the preparing window is as long as the test needs and never a race.
 */
export function UseLookupPreparingHarness() {
  const info = useLookup('preparing-dialog');

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

  const { Dialog, dialogManager } = useDialog<void, 'done'>({
    id: 'preparing-dialog',
    prepare: () => {
      return gate.arm();
    },
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Preparing dialog</p>
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
          dialogManager.open('preparing-dialog');
        }}
      >
        Open
      </button>
      <span data-testid="is-visible">{String(info.isVisible)}</span>
      <span data-testid="is-preparing">{String(info.isPreparing)}</span>
      <span data-testid="phase">{info.phase}</span>
      {Dialog}
    </div>
  );
}

/** Foreground tracking across two dialogs. */
export function UseLookupForegroundHarness() {
  const infoA = useLookup('fg-lookup-a');
  const infoB = useLookup('fg-lookup-b');

  const { Dialog: Dialog1, dialogManager } = useDialog<void, 'done'>({
    id: 'fg-lookup-a',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Dialog A</p>
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

  const { Dialog: Dialog2 } = useDialog<void, 'done'>({
    id: 'fg-lookup-b',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Dialog B</p>
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
      {Dialog1}
      {Dialog2}
    </div>
  );
}
