import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';
import type { ModalErrorSource } from '../../../core/types.js';

/**
 * A `prepare` that throws, and the `onError` that is the only way to hear about it. The failure is
 * silent: the dialog is already on screen, `isPreparing` settles either way, `aria-busy` flips back
 * to `false`, and the throw reaches `log.error`, silent unless `setLogLevel` is on. Both halves are
 * asserted — reported with its `source`, and everything else still settling, since `onError` is a
 * report not a veto. `source` is read through `ModalErrorSource`, which only the root can export.
 */
export function PrepareFailureHarness() {
  const [failures, setFailures] = useState<ModalErrorSource[]>([]);
  const [message, setMessage] = useState('none');

  const modal = useModal({
    id: 'prepare-failure',
    ariaLabel: 'Prepare that fails',
    prepare: async () => {
      await Promise.resolve();
      throw new Error('report is unavailable');
    },
    onError: ({ error, source }) => {
      setFailures((seen) => {
        return [...seen, source];
      });
      setMessage(error.message);
    },
    render: ({ isPreparing }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="pf-preparing">{isPreparing ? 'preparing' : 'ready'}</span>
          <p>The dialog is up either way.</p>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="pf-open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="pf-visible">{modal.isVisible ? 'open' : 'closed'}</span>
      <span data-testid="pf-sources">{failures.join(',') || 'none'}</span>
      <span data-testid="pf-message">{message}</span>
      {modal.Modal}
    </div>
  );
}
