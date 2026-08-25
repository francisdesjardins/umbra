import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests open/close with confirm, cancel, and Escape. Tracks last close reason.
 */
export function BasicHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Dialog } = useDialog<void, 'cancel' | 'confirm'>({
    id: 'basic-dialog',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Dialog content</p>
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
        Open Dialog
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Dialog}
    </div>
  );
}
