import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Tests open() then waitForClose(). Status reflects the resolved reason.
 */
export function WaitForCloseHarness() {
  const [status, setStatus] = useState('idle');

  const { open, waitForClose, Modal } = useModal<void, 'done'>({
    id: 'wait-modal',
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
        onClick={async () => {
          await handleOpen();
        }}
      >
        Open and Wait
      </button>
      <span data-testid="status">{status}</span>
      {Modal}
    </>
  );
}
