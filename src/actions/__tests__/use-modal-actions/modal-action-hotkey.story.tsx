import { useState } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests callable actions with hotkeys — verifies aria-keyshortcuts is forwarded.
 */
export function ModalActionHotkeyHarness() {
  const [lastReason, setLastReason] = useState('');

  const actions = useModalActions({
    cancel: defineAction({ hotkey: Key.Escape }),
    confirm: defineAction({ hotkey: Key.Enter }),
  });

  const { open, isOpen, Modal } = useModal({
    id: 'action-hotkey',
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
