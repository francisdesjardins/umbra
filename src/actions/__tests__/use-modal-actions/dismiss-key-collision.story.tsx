import { useState } from 'react';
import { useModal } from '../../../react/use-modal.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests that when a actions action's hotkey matches the modal's dismissKey,
 * the action fires instead of the built-in dismiss. Here both use Key.Delete.
 */
export function DismissKeyActionCollisionHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'remove'>({
    id: 'ctrl-dismiss-collision',
    dismissKey: Key.Delete,
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('remove', {
              hotkey: Key.Delete,
              onAction: (close) => {
                close();
              },
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
