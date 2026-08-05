import { useModal } from '../../../core/use-modal.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests that an action handler throwing populates actions.error.
 */
export function ErrorActionsHarness() {
  const actions = useModalActions({
    bad: defineAction(),
    ok: defineAction(),
  });

  const { open, Modal } = useModal({
    id: 'ctrl-error',
    actions,
    render: () => {
      return (
        <div style={dialogStyle}>
          <span data-testid="error-msg">{actions.error?.message ?? ''}</span>
          <button
            {...actions.bad(() => {
              throw new Error('boom');
            })}
          >
            Bad Action
          </button>
          <button
            {...actions.ok((close) => {
              close();
            })}
          >
            Ok
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
