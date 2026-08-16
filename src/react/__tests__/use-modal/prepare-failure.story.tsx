import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';
import type { ModalErrorSource } from '../../../core/types.js';

/**
 * A `prepare` that throws, and the `onError` that is the only way to hear about it.
 *
 * The failure this covers is a silent one, which is why the harness reports so much: the dialog is
 * already on screen when `prepare` runs, `isPreparing` settles either way, and `aria-busy` flips
 * back to `false`. A modal whose content failed to load presents as one that loaded fine — the
 * throw reaches `log.error`, which is silent unless `setLogLevel` is on.
 *
 * So the assertions are about **both halves**: that the failure is reported, with its `source`, and
 * that everything else still settles. `onError` is a report and not a veto, and a test that only
 * checked the report would pass on an implementation that left the modal stuck at `aria-busy`.
 *
 * The reason is read through `ModalErrorSource` rather than compared as a string, which is the
 * annotation a consumer writes — and which is only possible because the type reaches the root.
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
