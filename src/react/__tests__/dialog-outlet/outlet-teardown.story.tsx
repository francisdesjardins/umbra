import { useState } from 'react';
import { DialogOutlet } from '../../dialog-outlet.js';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

// ── Harness: a dialog unmounting out from under its outlet ──────────────────

function TeardownDialog({ onRemove }: { readonly onRemove: () => void }) {
  const { open, isVisible } = useDialog<void, 'close'>({
    id: 'outlet-teardown',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Teardown</p>
          {/* Inside the dialog, because the top layer swallows clicks outside it — and because
              unmounting while *open* is the case worth watching: the outlet is holding a node
              whose owner is about to go away. */}
          <button
            data-testid="remove"
            onClick={() => {
              onRemove();
            }}
          >
            Remove me
          </button>
          <button
            data-testid="close"
            onClick={() => {
              handle.close('close');
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
        data-testid="open"
        onClick={async () => {
          await open();
        }}
      >
        Open
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
    </div>
  );
}

/**
 * A dialog that can unmount while the outlet is still rendering it.
 *
 * The outlet keeps a map of registered nodes, and registration is the half every other test here
 * exercises. This is the other half: a dialog whose component goes away has to be dropped from that
 * map, or the outlet goes on rendering a `<dialog>` for a hook that no longer exists — visible on
 * screen, registered with the manager, and answerable by nothing.
 */
export function OutletTeardownHarness() {
  const [mounted, setMounted] = useState(true);

  return (
    <DialogOutlet>
      <span data-testid="mounted">{mounted ? 'yes' : 'no'}</span>
      {mounted ? (
        <TeardownDialog
          onRemove={() => {
            setMounted(false);
          }}
        />
      ) : null}
    </DialogOutlet>
  );
}
