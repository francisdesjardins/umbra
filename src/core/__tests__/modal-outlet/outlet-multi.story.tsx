import { ModalOutlet } from '../../modal-outlet.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

// ── Harness: multiple modals in one outlet ─────────────────────────────────

function ModalA() {
  const { open, isOpen, dialogManager } = useModal<void, 'done-a'>({
    id: 'outlet-multi-a',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal A</p>
          <button
            onClick={() => {
              dialogManager.open('outlet-multi-b');
            }}
          >
            Open B from Here
          </button>
          <button
            onClick={() => {
              handle.close('done-a');
            }}
          >
            Close A
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open A
      </button>
      <span data-testid="is-open-a">{isOpen ? 'open' : 'closed'}</span>
    </div>
  );
}

function ModalB() {
  const { open, isOpen, dialogManager } = useModal<void, 'done-b'>({
    id: 'outlet-multi-b',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal B</p>
          <button
            onClick={() => {
              dialogManager.open('outlet-multi-a');
            }}
          >
            Open A from Here
          </button>
          <button
            onClick={() => {
              handle.close('done-b');
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
        onClick={async () => {
          await open();
        }}
      >
        Open B
      </button>
      <span data-testid="is-open-b">{isOpen ? 'open' : 'closed'}</span>
    </div>
  );
}

/**
 * Two modals inside one outlet — both render without {Modal} in JSX.
 */
export function OutletMultiHarness() {
  return (
    <ModalOutlet>
      <ModalA />
      <ModalB />
    </ModalOutlet>
  );
}
