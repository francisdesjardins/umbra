import { useEffect, useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A non-modal panel that refuses to dismiss, over a page that has its own Escape handler.
 *
 * The panel's window-level listener claims the dismiss key so an underlying element cannot
 * also react to a keypress that closed the panel. The question this harness asks is what
 * happens when the panel *does not* close: the key was claimed by a dialog that then refused
 * to act on it, and the app's own handler never runs.
 */
export function KeyPassthroughHarness() {
  const [appEscapes, setAppEscapes] = useState(0);
  const [release, setRelease] = useState<(() => void) | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAppEscapes((n) => {
          return n + 1;
        });
      }
    };
    // Bubble phase on the document — where an application's own shortcut handling normally sits.
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const { open, Dialog } = useDialog({
    id: 'key-passthrough',
    nonModal: true,
    portal: true,
    // Dismissal is refused for as long as `prepare` is pending.
    dismissWhilePreparing: false,
    prepare: () => {
      return new Promise<void>((resolve) => {
        setRelease(() => {
          return resolve;
        });
      });
    },
    render: ({ isPreparing }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="panel-preparing">{isPreparing ? 'preparing' : 'ready'}</span>
          <button
            onClick={() => {
              release?.();
            }}
          >
            Finish Preparing
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
        Open Panel
      </button>
      <span data-testid="app-escapes">{appEscapes}</span>
      {Dialog}
    </div>
  );
}
