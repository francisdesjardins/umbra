import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Regression: open() must always settle. Calling open() while the dialog is
 * already open resolves immediately instead of hanging forever (and calling
 * it during the opening sequence joins the in-flight open).
 */
export function ReopenSettlesHarness() {
  const [settleCount, setSettleCount] = useState(0);

  const { open, Dialog } = useDialog<void, 'done'>({
    id: 'reopen',
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
        Open Dialog
      </button>
      <span data-testid="settle-count">{settleCount}</span>
      {Dialog}
    </div>
  );
}
