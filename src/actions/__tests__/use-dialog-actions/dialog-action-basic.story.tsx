import { useState } from 'react';
import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests a callable action with no handler — auto-closes with the action's reason.
 */
export function DialogActionBasicHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Dialog } = useDialog<void, 'cancel' | 'confirm'>({
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Dialog}
    </div>
  );
}
