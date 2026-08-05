import { useState } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

const delay = (ms: number) => {
  return new Promise<void>((resolve) => {
    return setTimeout(resolve, ms);
  });
};

/**
 * Tests a callable action with a custom async handler — verifies loading/disabled states.
 */
export function ModalActionCustomHandlerHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isOpen, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'action-custom',
    render: ({ action }) => {
      const confirmProps = action('confirm', async (close) => {
        await delay(200);
        close();
      });
      const cancelProps = action('cancel');
      return (
        <div style={dialogStyle}>
          <button
            {...confirmProps}
            data-testid="confirm-btn"
            data-loading={String(confirmProps.loading)}
          >
            {confirmProps.loading ? 'Loading...' : 'Confirm'}
          </button>
          <button
            {...cancelProps}
            data-testid="cancel-btn"
            data-disabled={String(cancelProps.disabled)}
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
        Open
      </button>
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
