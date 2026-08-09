import { useState } from 'react';
import { useModal } from '../../../react/use-modal.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests callable actions with hotkeys — verifies aria-keyshortcuts is forwarded.
 */
export function ModalActionHotkeyHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'action-hotkey',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button {...action('confirm', { hotkey: Key.Enter })}>Confirm</button>
          <button {...action('cancel', { hotkey: Key.Escape })}>Cancel</button>
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
