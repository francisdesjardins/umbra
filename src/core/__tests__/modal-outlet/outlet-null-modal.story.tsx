import { ModalOutlet } from '../../modal-outlet.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

// ── Harness: modal.Modal is null when outlet is present ────────────────────

function ModalNullChecker() {
  const { open, Modal } = useModal<void, 'done'>({
    id: 'outlet-null-check',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <button
            onClick={() => {
              handle.close('done');
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
      <span data-testid="modal-is-null">{Modal === null ? 'yes' : 'no'}</span>
    </div>
  );
}

/**
 * Verifies modal.Modal is null when inside an outlet.
 */
export function OutletNullModalHarness() {
  return (
    <ModalOutlet>
      <ModalNullChecker />
    </ModalOutlet>
  );
}
