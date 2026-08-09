import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests custom dismissKey: modal closes on Delete, not on Escape.
 */
export function CustomDismissKeyHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'close'>({
    id: 'custom-dismiss',
    dismissKey: Key.Delete,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Custom dismiss key modal</p>
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
