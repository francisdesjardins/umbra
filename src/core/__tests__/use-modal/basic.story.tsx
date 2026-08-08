import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Tests open/close with confirm, cancel, and Escape. Tracks last close reason.
 */
export function BasicHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'basic-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal content</p>
          <button
            onClick={() => {
              handle.close('confirm');
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => {
              handle.close('cancel');
            }}
          >
            Cancel
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
