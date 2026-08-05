import { useState } from 'react';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';
import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';

/** What the `save` action closes with. Declared on the marker, checked at the modal. */
type SaveResult = { readonly id: number };

/**
 * The config key is the action's close reason, and a marker's declared payload is what its
 * `close(data)` accepts — end to end, through the bridge, into `onClose`.
 */
export function ReasonSourceHarness() {
  const [lastReason, setLastReason] = useState('');
  const [lastId, setLastId] = useState('');

  const actions = useModalActions({
    save: defineAction<SaveResult>(),
    dismiss: defineAction(),
  });

  const { open, Modal } = useModal<SaveResult>({
    id: 'ctrl-reason-source',
    actions,
    render: () => {
      return (
        <div style={dialogStyle}>
          <button
            {...actions.save((close) => {
              close({ id: 42 });
            })}
          >
            Save
          </button>
          <button {...actions.dismiss()}>Dismiss</button>
        </div>
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
      setLastId(result.data ? String(result.data.id) : 'none');
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open
      </button>
      <span data-testid="reason-source-last">{lastReason}</span>
      <span data-testid="reason-source-id">{lastId}</span>
      {Modal}
    </div>
  );
}
