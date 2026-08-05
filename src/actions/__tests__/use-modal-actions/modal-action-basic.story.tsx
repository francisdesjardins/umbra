import { useState } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests a callable action with no handler — auto-closes with the action's reason.
 */
export function ModalActionBasicHarness() {
  const [lastReason, setLastReason] = useState('');

  const actions = useModalActions({
    cancel: defineAction(),
    confirm: defineAction(),
  });

  const { open, isOpen, Modal } = useModal({
    id: 'action-basic',
    actions,
    render: () => {
      return (
        <div style={dialogStyle}>
          <button {...actions.confirm()}>Confirm</button>
          <button {...actions.cancel()}>Cancel</button>
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
