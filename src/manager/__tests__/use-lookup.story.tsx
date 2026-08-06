import { useState } from 'react';
import { dialogStyle } from '../../core/__tests__/story-styles.js';
import { useModal } from '../../core/use-modal.js';
import { useLookup } from '../use-lookup.js';

/**
 * Tests useLookup(id) reactive behavior.
 * Displays ModalInfo reactively — values update without manual query buttons.
 */
export function UseLookupHarness() {
  const info = useLookup('reactive-modal');

  const { Modal, dialogManager } = useModal<void, 'done'>({
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
      <span data-testid="is-open">{String(info.isOpen)}</span>
      <span data-testid="phase">{info.phase}</span>
      <span data-testid="is-foreground">{String(info.isForeground)}</span>
      {Modal}
    </div>
  );
}

/**
 * Tests useLookup(id) for an unregistered modal id.
 * Should return null-object default reactively.
 */
export function UseLookupUnregisteredHarness() {
  const info = useLookup('ghost-modal');

  return (
    <div>
      <span data-testid="exists">{String(info.exists)}</span>
      <span data-testid="is-open">{String(info.isOpen)}</span>
      <span data-testid="is-preparing">{String(info.isPreparing)}</span>
      <span data-testid="phase">{info.phase}</span>
      <span data-testid="is-foreground">{String(info.isForeground)}</span>
    </div>
  );
}

/**
 * Tests that a watcher **outside** the modal can tell "open" from "ready".
 *
 * The question `phase` cannot answer. It describes the `<dialog>` element, so it reaches `'open'`
 * on the animation frame after the dialog is shown — `'opening'` is one frame wide however long
 * the modal actually takes to prepare. Something elsewhere in the app deciding whether to let an
 * action through wants the other axis, and `isPreparing` is it.
 *
 * `onOpen` is held on a promise this harness resolves from a button, rather than a timer, so the
 * preparing window is as long as the test needs and never a race. The button lives inside the
 * dialog because the top layer swallows clicks anywhere else.
 */
export function UseLookupPreparingHarness() {
  const info = useLookup('preparing-modal');

  // Built once, in the initializer, the way `useModal` builds its store: `arm` and `release` close
  // over one variable and never change identity. Re-armed per open rather than created once, so
  // reopening this modal prepares again instead of resolving instantly.
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

  const { Modal, dialogManager } = useModal<void, 'done'>({
    id: 'preparing-modal',
    onOpen: () => {
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
      <span data-testid="is-open">{String(info.isOpen)}</span>
      <span data-testid="is-preparing">{String(info.isPreparing)}</span>
      <span data-testid="phase">{info.phase}</span>
      {Modal}
    </div>
  );
}

/**
 * Tests useLookup(id) foreground tracking with two modals.
 */
export function UseLookupForegroundHarness() {
  const infoA = useLookup('fg-lookup-a');
  const infoB = useLookup('fg-lookup-b');

  const { Modal: Modal1, dialogManager } = useModal<void, 'done'>({
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

  const { Modal: Modal2 } = useModal<void, 'done'>({
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
      <span data-testid="a-open">{String(infoA.isOpen)}</span>
      <span data-testid="a-fg">{String(infoA.isForeground)}</span>
      <span data-testid="b-open">{String(infoB.isOpen)}</span>
      <span data-testid="b-fg">{String(infoB.isForeground)}</span>
      {Modal1}
      {Modal2}
    </div>
  );
}
