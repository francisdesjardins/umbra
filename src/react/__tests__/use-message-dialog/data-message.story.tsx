import { useState } from 'react';
import { useMessageDialog } from '../../templates/use-message-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests close with a typed data payload. last-data is displayed after close.
 */
export function DataMessageHarness() {
  const [lastData, setLastData] = useState('');

  const { open, Dialog } = useMessageDialog<{ name: string }, 'submit'>({
    id: 'msg-data',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <button
            onClick={() => {
              handle.close('submit', { name: 'test-user' });
            }}
          >
            Submit
          </button>
        </div>
      );
    },
    onClose: (result) => {
      setLastData(result.data?.name ?? '');
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
      <span data-testid="last-data">{lastData}</span>
      {Dialog}
    </div>
  );
}
