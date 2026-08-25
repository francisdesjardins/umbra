import { DialogManagerProvider } from '../../../react/dialog-manager-context.js';
import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/** The nested manager's own modal, opened from inside the outer one. */
function InnerModal() {
  const { open, Modal, isVisible } = useDialog<void, 'done'>({
    id: 'both-open-inner',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal dialog (manager B)</p>
          <button
            data-testid="close-inner"
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Inner
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <span data-testid="inner-visible">{isVisible ? 'open' : 'closed'}</span>
      {/* Rendered inside the outer modal's subtree, so it is clickable while that one owns the
          top layer — the documented way to stack. */}
      <button
        data-testid="open-inner"
        onClick={async () => {
          await open();
        }}
      >
        Open Inner
      </button>
      {Modal}
    </div>
  );
}

/**
 * Two managers, two open modal dialogs, one body — what the `Set` of owners exists for: a shared
 * boolean would let the first to let go release the other's lock. Claims are idempotent per owner.
 */
export function ScrollLockBothOpenHarness() {
  const { open, Modal } = useDialog<void, 'done'>({
    id: 'both-open-outer',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal dialog (manager A)</p>
          <DialogManagerProvider>
            <InnerModal />
          </DialogManagerProvider>
          <button
            data-testid="close-outer"
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Outer
          </button>
        </div>
      );
    },
  });

  return (
    <div style={{ minHeight: '200vh' }}>
      <button
        data-testid="open-outer"
        onClick={async () => {
          await open();
        }}
      >
        Open Outer
      </button>
      {Modal}
    </div>
  );
}
