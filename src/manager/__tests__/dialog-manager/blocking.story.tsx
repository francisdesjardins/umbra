import { useDialogManager } from '../../use-dialog-manager.js';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests blocking/nonBlocking derivation from the snapshot's openDialogs.
 *
 * Registers one blocking modal (showModal) and one nonModal (show).
 * Opens them independently and in combination, verifying the snapshot
 * correctly distinguishes between blocking and non-blocking dialogs.
 */
export function BlockingHarness() {
  const { openDialogs } = useDialogManager();
  const blocking = openDialogs.filter((d) => {
    return !d.nonModal;
  });
  const nonBlocking = openDialogs.filter((d) => {
    return d.nonModal;
  });

  const { Modal: Modal1, dialogManager } = useModal<void, 'done'>({
    id: 'blocking-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Blocking Modal</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Blocking
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useModal<void, 'done'>({
    id: 'non-blocking-modal',
    nonModal: true,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Non-Blocking Modal</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Non-Blocking
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('blocking-modal');
        }}
      >
        Open Blocking
      </button>
      <button
        onClick={() => {
          dialogManager.open('non-blocking-modal');
        }}
      >
        Open Non-Blocking
      </button>
      <span data-testid="has-any-open">{openDialogs.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid="open-count">{openDialogs.length}</span>
      <span data-testid="has-blocking">{blocking.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid="blocking-count">{blocking.length}</span>
      <span data-testid="has-non-blocking">{nonBlocking.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid="non-blocking-count">{nonBlocking.length}</span>
      {Modal1}
      {Modal2}
    </div>
  );
}

/**
 * Tests the getOpen() filter argument on the ModalLookup API.
 */
export function BlockingLookupHarness() {
  const { Modal: Modal1, dialogManager } = useModal<void, 'done'>({
    id: 'bl-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Blocking</p>
          <button
            onClick={() => {
              const q = dialogManager.lookup();
              const blockingOpen = q.getOpen('modal');
              const nonBlockingOpen = q.getOpen('non-modal');
              const el = document.getElementById('lookup-result');
              if (el) {
                el.textContent = [
                  `blocking:${String(blockingOpen.length > 0)}`,
                  `blockingCount:${String(blockingOpen.length)}`,
                  `blockingIds:${blockingOpen
                    .map((m) => {
                      return m.id;
                    })
                    .join(',')}`,
                  `nonBlocking:${String(nonBlockingOpen.length > 0)}`,
                  `nonBlockingCount:${String(nonBlockingOpen.length)}`,
                  `nonBlockingIds:${nonBlockingOpen
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
            Close Blocking
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useModal<void, 'done'>({
    id: 'bl-non-modal',
    nonModal: true,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Non-Blocking</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Non-Blocking
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('bl-modal');
        }}
      >
        Open Blocking
      </button>
      <button
        onClick={() => {
          dialogManager.open('bl-non-modal');
        }}
      >
        Open Non-Blocking
      </button>
      <span data-testid="lookup-result" id="lookup-result" />
      {Modal1}
      {Modal2}
    </div>
  );
}
