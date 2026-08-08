import { useState } from 'react';
import { ModalOutlet } from '../../modal-outlet.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

// ── Harness: basic outlet renders modal without {Modal} in JSX ─────────────

function InnerModal({ onCloseReason }: { readonly onCloseReason: (r: string) => void }) {
  const { open, isVisible, isPreparing } = useModal<void, 'confirm'>({
    id: 'outlet-basic',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Outlet content</p>
          <button
            onClick={() => {
              handle.close('confirm');
            }}
          >
            Confirm
          </button>
        </div>
      );
    },
    onClose: (result) => {
      onCloseReason(result.reason);
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Modal
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="is-opening">{String(isPreparing)}</span>
    </div>
  );
}

/**
 * Modal renders via ModalOutlet — no {Modal} placed in JSX.
 */
export function OutletBasicHarness() {
  const [lastReason, setLastReason] = useState('');

  return (
    <ModalOutlet>
      <InnerModal onCloseReason={setLastReason} />
      <span data-testid="last-reason">{lastReason}</span>
    </ModalOutlet>
  );
}
