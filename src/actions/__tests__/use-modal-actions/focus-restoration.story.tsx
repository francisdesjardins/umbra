import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests focus restoration to the autofocus target after a failed action.
 * The bad action throws so focus (which escapes when the button is disabled)
 * should be restored to the first focused element (Ok button, autofocused).
 */
export function FocusRestorationHarness() {
  const actions = useModalActions({
    bad: defineAction(),
    ok: defineAction(),
  });

  const { open, Modal } = useModal({
    id: 'ctrl-focus',
    actions,
    render: () => {
      return (
        <div style={dialogStyle}>
          <button
            data-testid="ok-btn"
            {...actions.ok((close) => {
              close();
            })}
          >
            Ok
          </button>
          <button
            data-testid="bad-btn"
            {...actions.bad(() => {
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
