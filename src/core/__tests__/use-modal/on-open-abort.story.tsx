import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * `onOpen` is handed an `AbortSignal` that fires when the modal closes.
 *
 * A dialog dismissed while it is still loading is the ordinary case, not an edge one. Without a
 * signal the request outlives the thing that asked for it: it lands on a closed modal, and a slow
 * one can still be in flight when the next open starts its own — which is how a reopened dialog
 * ends up showing the *previous* attempt's answer.
 *
 * The work here is a promise that only ever settles through the signal, so "was it aborted" is the
 * only thing the outcome can report. A real call site passes the signal to `fetch`.
 */
export function OnOpenAbortHarness() {
  const [outcome, setOutcome] = useState('idle');
  const [aborts, setAborts] = useState(0);

  const { open, Modal, handle } = useModal<void, 'done'>({
    id: 'on-open-abort',
    onOpen: (signal) => {
      setOutcome('loading');
      return new Promise<void>((resolve) => {
        // Never resolves on its own: the only way out is the modal closing.
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
