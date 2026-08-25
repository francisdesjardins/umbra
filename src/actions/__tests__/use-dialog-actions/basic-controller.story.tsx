import { useState, useSyncExternalStore } from 'react';
import { dialogStyle } from '../../../__tests__/story-styles.js';
import { useDialog } from '../../../react/use-dialog.js';
import { createStore } from '../../../store/index.js';

const countStore = createStore(
  { count: 0 },
  {
    builder: ({ set, reset }) => {
      return {
        actions: {
          increment() {
            set((s) => {
              return { ...s, count: s.count + 1 };
            });
          },
          reset() {
            reset();
          },
        },
      };
    },
  }
);

/**
 * Tests action close reasons, standalone store state, and store snapshot after close.
 */
export function BasicActionsHarness() {
  const [lastReason, setLastReason] = useState('');
  const [lastCount, setLastCount] = useState('');

  const count = useSyncExternalStore(countStore.subscribe, () => {
    return countStore.getSnapshot().count;
  });

  const { open, isVisible, Modal } = useDialog<void, 'cancel' | 'confirm'>({
    id: 'ctrl-basic',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="count">{String(count)}</span>
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
      setLastCount(String(countStore.getSnapshot().count));
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
      <span data-testid="last-count">{lastCount}</span>
      {Modal}
    </div>
  );
}
