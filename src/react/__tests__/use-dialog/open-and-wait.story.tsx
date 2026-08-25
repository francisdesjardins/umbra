import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests openAndWait(). Status reflects the resolved reason.
 */
export function OpenAndWaitHarness() {
  const [status, setStatus] = useState('idle');

  const { openAndWait, Dialog } = useDialog<void, 'done'>({
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
    const [, result] = await openAndWait();
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
      {Dialog}
    </>
  );
}
