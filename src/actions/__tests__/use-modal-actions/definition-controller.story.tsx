import { createStore, useStore } from '../../../store/index.js';
import { useState } from 'react';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';
import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';

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

  const actions = useModalActions({
    cancel: defineAction(),
    confirm: defineAction(),
  });

  const { open, isOpen, Modal } = useModal({
    id: 'ctrl-definition',
    actions,
    render: () => {
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
