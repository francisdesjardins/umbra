import { useMessageModal } from '../../use-message-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests prepare with a 500 ms async delay. isPreparing state is exposed in render.
 */
export function AsyncOpenMessageHarness() {
  const { open, isVisible, Modal } = useMessageModal<void, 'close'>({
    id: 'msg-async',
    prepare: () => {
      return new Promise((resolve) => {
        return setTimeout(resolve, 500);
      });
    },
    render: ({ isPreparing, handle }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="is-opening">{String(isPreparing)}</span>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close
          </button>
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
        Open Modal
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      {Modal}
    </div>
  );
}
