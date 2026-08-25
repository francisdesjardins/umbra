import { useDialogManager } from '../../../react/use-dialog-manager.js';
import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests the modal / non-modal split derived from the snapshot's `openDialogs`.
 *
 * Registers one modal dialog (`showModal()`) and one non-modal (`show()`), opens them
 * independently and together, and verifies the snapshot tells the two apart.
 */
export function ModalVariantHarness() {
  const { openDialogs } = useDialogManager();
  const modal = openDialogs.filter((d) => {
    return !d.nonModal;
  });
  const nonModal = openDialogs.filter((d) => {
    return d.nonModal;
  });

  const { Modal: Modal1, dialogManager } = useDialog<void, 'done'>({
    id: 'variant-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Modal
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useDialog<void, 'done'>({
    id: 'variant-non-modal',
    nonModal: true,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Non-Modal</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Non-Modal
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('variant-modal');
        }}
      >
        Open Modal
      </button>
      <button
        onClick={() => {
          dialogManager.open('variant-non-modal');
        }}
      >
        Open Non-Modal
      </button>
      <span data-testid="has-any-open">{openDialogs.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid="open-count">{openDialogs.length}</span>
      <span data-testid="has-modal">{modal.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid="dialog-count">{modal.length}</span>
      <span data-testid="has-non-modal">{nonModal.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid="non-modal-count">{nonModal.length}</span>
      {Modal1}
      {Modal2}
    </div>
  );
}

/**
 * Tests the getOpen() filter argument on the DialogLookup API.
 */
export function ModalVariantLookupHarness() {
  const { Modal: Modal1, dialogManager } = useDialog<void, 'done'>({
    id: 'lookup-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal</p>
          <button
            onClick={() => {
              const q = dialogManager.lookup();
              const modalOpen = q.getOpen('modal');
              const nonModalOpen = q.getOpen('non-modal');
              const el = document.getElementById('lookup-result');
              if (el) {
                el.textContent = [
                  `modal:${String(modalOpen.length > 0)}`,
                  `modalCount:${String(modalOpen.length)}`,
                  `dialogIds:${modalOpen
                    .map((m) => {
                      return m.id;
                    })
                    .join(',')}`,
                  `nonModal:${String(nonModalOpen.length > 0)}`,
                  `nonModalCount:${String(nonModalOpen.length)}`,
                  `nonModalIds:${nonModalOpen
                    .map((m) => {
                      return m.id;
                    })
                    .join(',')}`,
                ].join('|');
              }
            }}
          >
            Query
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Modal
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useDialog<void, 'done'>({
    id: 'lookup-non-modal',
    nonModal: true,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Non-Modal</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Non-Modal
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('lookup-modal');
        }}
      >
        Open Modal
      </button>
      <button
        onClick={() => {
          dialogManager.open('lookup-non-modal');
        }}
      >
        Open Non-Modal
      </button>
      <span data-testid="lookup-result" id="lookup-result" />
      {Modal1}
      {Modal2}
    </div>
  );
}
