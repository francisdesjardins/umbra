import { useDialog } from '../../react.js';

/**
 * A trigger and a non-modal panel, for measuring where the keyboard goes when the panel closes.
 *
 * The library does nothing here on purpose — no `focusOnOpen`, no restore of its own — because
 * what is under measurement is the platform: the close-the-dialog steps restore the previously
 * focused element for `show()` too, but only when focus is still inside the dialog at close time,
 * and the library unmounts the content in the same pass that closes the element. Whether the
 * trigger gets the keyboard back is exactly what the test asks.
 */
export function NonModalCloseRestoreHarness({
  closeVia,
}: {
  readonly closeVia: 'action' | 'handle';
}) {
  const modal = useDialog<void, 'done'>({
    id: 'nonmodal-close-restore',
    nonModal: true,
    ariaLabel: 'Closable panel',
    render: ({ action, handle }) => {
      return closeVia === 'action' ? (
        <button data-testid="panel-close" {...action('done')}>
          Close the panel
        </button>
      ) : (
        <button
          data-testid="panel-close"
          onClick={() => {
            handle.close('done');
          }}
          type="button"
        >
          Close the panel
        </button>
      );
    },
  });

  return (
    <>
      <button
        data-testid="trigger"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}
