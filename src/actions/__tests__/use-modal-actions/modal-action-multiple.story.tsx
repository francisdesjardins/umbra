import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

const delay = (ms: number) => {
  return new Promise<void>((resolve) => {
    return setTimeout(resolve, ms);
  });
};

/**
 * Tests multiple callable actions — when one action runs,
 * the sibling receives disabled: true.
 */
export function ModalActionMultipleHarness() {
  const actions = useModalActions({
    cancel: defineAction(),
    confirm: defineAction(),
  });

  const { open, Modal } = useModal({
    id: 'action-multi',
    actions,
    render: () => {
      return (
        <div style={dialogStyle}>
          <button
            {...actions.confirm(async (close) => {
              await delay(500);
              close();
            })}
            data-testid="confirm-btn"
          >
            Confirm
          </button>
          <button {...actions.cancel()} data-testid="cancel-btn">
            Cancel
          </button>
          <span data-testid="is-running">{String(actions.isRunning)}</span>
        </div>
      );
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
      {Modal}
    </div>
  );
}
