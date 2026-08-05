import { useState } from 'react';
import { useMessageModal } from '../../use-message-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests open() then waitForClose(). Status reflects the resolved reason.
 */
export function WaitForCloseMessageHarness() {
  const [status, setStatus] = useState('idle');

  const { open, waitForClose, Modal } = useMessageModal({
    id: 'msg-wait',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Done
          </button>
        </div>
      );
    },
  });

  const handleOpen = async () => {
    setStatus('waiting');
    await open();
    const [, result] = await waitForClose();
    setStatus(`resolved:${String(result?.reason)}`);
  };

  return (
    <>
      <button
        onClick={() => {
          void handleOpen();
        }}
      >
        Open and Wait
      </button>
      <span data-testid="status">{status}</span>
      {Modal}
    </>
  );
}
