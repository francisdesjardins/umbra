import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * `prepare` is handed an `AbortSignal` that fires when the modal closes. Without it a request
 * outlives what asked for it — landing on a closed modal, or still in flight when the next open
 * starts its own, which is how a reopened dialog shows the previous attempt's answer. The work here
 * only settles through the signal; a real call site passes it to `fetch`.
 */
export function OnOpenAbortHarness() {
  const [outcome, setOutcome] = useState('idle');
  const [aborts, setAborts] = useState(0);

  const { open, Modal, handle } = useDialog<void, 'done'>({
    id: 'on-open-abort',
    prepare: (signal) => {
      setOutcome('loading');
      return new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => {
          setAborts((count) => {
            return count + 1;
          });
          setOutcome('aborted');
          resolve();
        });
      });
    },
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>Chargement…</p>
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
        onClick={() => {
          void open();
        }}
      >
        Open
      </button>
      <span data-testid="outcome">{outcome}</span>
      <span data-testid="aborts">{aborts}</span>
      {Modal}
    </div>
  );
}
