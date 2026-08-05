import { useState } from 'react';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';
import { useModal } from '../../../core/use-modal.js';
import { createStore, useStore } from '../../../store/index.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';

const countStore = createStore({ count: 0 }, ({ set, reset }) => {
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
});

/**
 * Tests action close reasons, standalone store state, and store snapshot after close.
 */
export function BasicActionsHarness() {
  const [lastReason, setLastReason] = useState('');
  const [lastCount, setLastCount] = useState('');

  const count = useStore(countStore, (s) => {
    return s.count;
  });

  const actions = useModalActions({
    cancel: defineAction(),
    confirm: defineAction(),
  });

  const { open, isOpen, Modal } = useModal({
    id: 'ctrl-basic',
    actions,
    render: () => {
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
            {...actions.confirm((close) => {
              close();
            })}
          >
            Confirm
          </button>
          <button
            {...actions.cancel((close) => {
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
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      <span data-testid="last-count">{lastCount}</span>
      {Modal}
    </div>
  );
}
