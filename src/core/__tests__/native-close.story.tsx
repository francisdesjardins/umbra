import { useDialog } from '../../react.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * A dialog carrying the platform's own way of closing itself: `<form method="dialog">`.
 *
 * Submitting it calls the element's close steps directly — no action, no handle, nothing the
 * library was told about — which is the shape any `dialog.close()` from user land has.
 */
export function NativeFormCloseHarness() {
  const dialog = useDialog<void, 'ok'>({
    id: 'native-form-close',
    ariaLabel: 'Native form close',
    render: () => {
      return (
        <div style={dialogStyle}>
          <form method="dialog">
            <button data-testid="submit" type="submit" value="ok">
              Close natively
            </button>
          </form>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="visible">{dialog.isVisible ? 'open' : 'closed'}</span>
      <span data-testid="phase">{dialog.phase}</span>
      {dialog.Dialog}
    </div>
  );
}
