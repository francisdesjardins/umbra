import { useState } from 'react';
import { useMessageDialog } from '../../templates/use-message-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests open/close with confirm, cancel, and Escape. Tracks last close reason.
 */
export function BasicMessageHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useMessageDialog<void, 'cancel' | 'confirm'>({
    id: 'msg-basic',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Message content</p>
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
