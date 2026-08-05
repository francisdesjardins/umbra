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
      <span data-testid="phase">{info.phase}</span>
      <span data-testid="is-foreground">{String(info.isForeground)}</span>
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
