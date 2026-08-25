import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

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
  const { open, Modal } = useDialog<void, 'cancel' | 'confirm'>({
    id: 'action-multi',
    render: ({ action, hasRunningAction }) => {
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
          <span data-testid="is-running">{String(hasRunningAction)}</span>
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
