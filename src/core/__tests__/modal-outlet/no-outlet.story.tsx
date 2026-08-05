import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * No outlet — standard behaviour. Modal must be placed in JSX.
 */
export function NoOutletHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isOpen, Modal } = useModal({
    id: 'no-outlet',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Standard content</p>
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
      setLastReason(result.reason);
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
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
