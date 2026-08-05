import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Tests dismissKey: false — no key can dismiss the modal.
 */
export function DismissKeyDisabledHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isOpen, Modal } = useModal({
    id: 'dismiss-disabled',
    dismissKey: false,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>No dismiss key modal</p>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close
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
