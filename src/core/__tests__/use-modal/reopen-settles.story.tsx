import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Regression: open() must always settle. Calling open() while the modal is
 * already open resolves immediately instead of hanging forever (and calling
 * it during the opening sequence joins the in-flight open).
 */
export function ReopenSettlesHarness() {
  const [settleCount, setSettleCount] = useState(0);

  const { open, Modal } = useModal<void, 'done'>({
    id: 'reopen-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Reopen content</p>
          <button
            onClick={async () => {
              await open();
              setSettleCount((c) => {
                return c + 1;
              });
            }}
          >
            Reopen
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
          setSettleCount((c) => {
            return c + 1;
          });
        }}
      >
        Open Modal
      </button>
      <span data-testid="settle-count">{settleCount}</span>
      {Modal}
    </div>
  );
}
