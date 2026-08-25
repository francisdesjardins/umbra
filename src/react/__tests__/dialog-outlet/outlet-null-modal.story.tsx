import { DialogOutlet } from '../../dialog-outlet.js';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

// ── Harness: modal.Dialog is null when outlet is present ────────────────────

function DialogNullChecker() {
  const { open, Dialog } = useDialog<void, 'done'>({
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
        Open Dialog
      </button>
      <span data-testid="dialog-is-null">{Dialog === null ? 'yes' : 'no'}</span>
    </div>
  );
}

/**
 * Verifies modal.Dialog is null when inside an outlet.
 */
export function OutletNullDialogHarness() {
  return (
    <DialogOutlet>
      <DialogNullChecker />
    </DialogOutlet>
  );
}
