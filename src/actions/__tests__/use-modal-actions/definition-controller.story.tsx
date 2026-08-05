import { createStore } from '../../../store/index.js';
import { useStore } from '../../../store/react/index.js';
import { useState } from 'react';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';
import { useModal } from '../../../core/use-modal.js';

const countStore = createStore({ count: 0 }, ({ set }) => {
  return {
    actions: {
      increment() {
        set((s) => {
          return { ...s, count: s.count + 1 };
        });
      },
      reset() {
        set({ count: 0 });
      },
    },
  };
});

/**
 * Tests a standalone store alongside useModalActions.
 */
export function DefinitionActionsHarness() {
  const [lastReason, setLastReason] = useState('');

  const count = useStore(countStore, (s) => {
    return s.count;
  });

  const { open, isOpen, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'ctrl-definition',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="def-count">{String(count)}</span>
          <button
            onClick={() => {
              countStore.actions.increment();
            }}
          >
            Increment
          </button>
          <button
            {...action('confirm', (close) => {
              close();
            })}
          >
            Confirm
          </button>
          <button
            {...action('cancel', (close) => {
              close();
            })}
          >
            Cancel
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
      <span data-testid="def-is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="def-last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
