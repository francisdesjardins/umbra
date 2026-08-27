import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A handler that throws. The render args carry `error` so a caller can show the failure without
 * wrapping every handler in its own `try`.
 */
export function ErrorActionsHarness() {
  const { open, Dialog } = useDialog<void, 'bad' | 'ok'>({
    id: 'ctrl-error',
    render: ({ action, error }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="error-msg">{error?.message ?? ''}</span>
          <button
            {...action('bad', () => {
              throw new Error('boom');
            })}
          >
            Bad Action
          </button>
          <button
            {...action('ok', (close) => {
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
      {Dialog}
    </div>
  );
}
