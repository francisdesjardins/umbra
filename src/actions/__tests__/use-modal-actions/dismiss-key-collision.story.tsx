import { useState } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests that when a actions action's hotkey matches the modal's dismissKey,
 * the action fires instead of the built-in dismiss. Here both use Key.Delete.
 */
export function DismissKeyActionCollisionHarness() {
  const [lastReason, setLastReason] = useState('');

  const actions = useModalActions({
    remove: defineAction({ hotkey: Key.Delete }),
  });

  const { open, isOpen, Modal } = useModal({
    id: 'ctrl-dismiss-collision',
    dismissKey: Key.Delete,
    actions,
    render: () => {
      return (
        <div style={dialogStyle}>
          <button
            {...actions.remove((close) => {
              close();
            })}
          >
            Remove
          </button>
        </div>
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
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
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
