import { useState } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests a callable action with no handler — auto-closes with the action's reason.
 */
export function ModalActionBasicHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isOpen, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'action-basic',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button {...action('confirm')}>Confirm</button>
          <button {...action('cancel')}>Cancel</button>
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
        Open
      </button>
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
