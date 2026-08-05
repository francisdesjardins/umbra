import { useState } from 'react';
import { useDialogManager } from '../../use-dialog-manager.js';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests imperative open/close and open-state derivation via useDialogManager.
 * "Force Close via Manager" is inside the modal because the native top layer
 * backdrop makes outside elements un-clickable while the dialog is open.
 */
export function ImperativeHarness() {
  const [lastReason, setLastReason] = useState('');
  const { openDialogs } = useDialogManager();

  const { Modal, dialogManager } = useModal({
    id: 'dm-imperative',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Imperative modal</p>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close
          </button>
          <button
            onClick={() => {
              dialogManager.close('dm-imperative', 'forced');
            }}
          >
            Force Close via Manager
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
        onClick={() => {
          dialogManager.open('dm-imperative');
        }}
      >
        Open via Manager
      </button>
      <span data-testid="has-open">{openDialogs.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
