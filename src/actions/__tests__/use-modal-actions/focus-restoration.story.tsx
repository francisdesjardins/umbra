import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests focus restoration to the autofocus target after a failed action.
 * The bad action throws so focus (which escapes when the button is disabled)
 * should be restored to the first focused element (Ok button, autofocused).
 */
export function FocusRestorationHarness() {
  const { open, Modal } = useModal<void, 'bad' | 'ok'>({
    id: 'ctrl-focus',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            data-testid="ok-btn"
            {...action('ok', (close) => {
              close();
            })}
          >
            Ok
          </button>
          <button
            data-testid="bad-btn"
            {...action('bad', () => {
              throw new Error('boom');
            })}
          >
            Bad Action
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
        Open
      </button>
      {Modal}
    </div>
  );
}
