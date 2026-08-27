import { createStore } from '../../../store/index.js';
import { useState, useSyncExternalStore } from 'react';
import { dialogStyle } from '../../../__tests__/story-styles.js';
import { useDialog } from '../../../react/use-dialog.js';

const countStore = createStore(
  { count: 0 },
  {
    builder: ({ set }) => {
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
    },
  }
);

/**
 * A store of the library's own, driven from inside a dialog: the action engine is not the only
 * state a `render` may read, and neither subscription interferes with the other.
 */
export function DefinitionActionsHarness() {
  const [lastReason, setLastReason] = useState('');

  const count = useSyncExternalStore(countStore.subscribe, () => {
    return countStore.getSnapshot().count;
  });

  const { open, isVisible, Dialog } = useDialog<void, 'cancel' | 'confirm'>({
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
      <span data-testid="def-is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="def-last-reason">{lastReason}</span>
      {Dialog}
    </div>
  );
}
