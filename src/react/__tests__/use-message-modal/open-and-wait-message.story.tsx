import { useState } from 'react';
import { useMessageModal } from '../../templates/use-message-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests openAndWait(). Status reflects the resolved reason.
 */
export function OpenAndWaitMessageHarness() {
  const [status, setStatus] = useState('idle');

  const { openAndWait, Modal } = useMessageModal<void, 'done'>({
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
    const [, result] = await openAndWait();
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
