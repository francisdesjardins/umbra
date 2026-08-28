import { useDialog } from '../../react.js';

/**
 * A trigger and a dialog that closes two ways, for measuring the *ring* rather than the element.
 *
 * Both variants and both close routes, because they reach the restore by opposite paths — a modal
 * close is handed back by the platform, an action-driven one strands the keyboard first — and the
 * reader is owed the same visible landing either way.
 */
export function CloseRestoreRingHarness({
  closeVia,
  nonModal,
}: {
  readonly closeVia: 'action' | 'handle';
  readonly nonModal: boolean;
}) {
  const dialog = useDialog<void, 'done'>({
    id: 'close-restore-ring',
    nonModal,
    ariaLabel: 'Closable dialog',
    render: ({ action, handle }) => {
      return closeVia === 'action' ? (
        <button data-testid="dialog-close" {...action('done')}>
          Close
        </button>
      ) : (
        <button
          data-testid="dialog-close"
          onClick={() => {
            handle.close('done');
          }}
          type="button"
        >
          Close
        </button>
      );
    },
  });

  return (
    <>
      <button
        data-testid="trigger"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      {dialog.Dialog}
    </>
  );
}
