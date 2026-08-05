import { useModal } from '../../../core/use-modal.js';
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
  const { open, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'action-multi',
    render: ({ action, isRunning }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('confirm', async (close) => {
              await delay(500);
              close();
            })}
            data-testid="confirm-btn"
          >
            Confirm
          </button>
          <button {...action('cancel')} data-testid="cancel-btn">
            Cancel
          </button>
          <span data-testid="is-running">{String(isRunning)}</span>
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
