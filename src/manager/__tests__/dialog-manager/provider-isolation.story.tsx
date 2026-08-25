import { useState } from 'react';
import { DialogManagerProvider } from '../../../react/dialog-manager-context.js';
import { useDialogManager } from '../../../react/use-dialog-manager.js';
import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/** A modal registering with the nearest manager, exposing state via `label`-scoped testids. */
function ScopedModal({ id, label }: { readonly id: string; readonly label: string }) {
  const [lastReason, setLastReason] = useState('');
  const { openDialogs } = useDialogManager();

  const { open, Modal } = useDialog<void, 'confirm'>({
    id,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>{label} content</p>
          <button
            onClick={() => {
              handle.close('confirm');
            }}
          >
            Close {label}
          </button>
        </div>
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  return (
    <div data-testid={`scope-${label}`}>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open {label}
      </button>
      <span data-testid={`count-${label}`}>{openDialogs.length}</span>
      <span data-testid={`has-open-${label}`}>{openDialogs.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid={`last-reason-${label}`}>{lastReason}</span>
      {Modal}
    </div>
  );
}

/**
 * Two modals in separate `DialogManagerProvider`s: each registry is isolated, so opening in one
 * scope must not move the other's dialog count or state.
 */
export function ProviderIsolationHarness() {
  return (
    <div>
      <DialogManagerProvider>
        <ScopedModal id="isolated-a" label="A" />
      </DialogManagerProvider>
      <DialogManagerProvider>
        <ScopedModal id="isolated-b" label="B" />
      </DialogManagerProvider>
    </div>
  );
}

/** No provider at all — the static singleton, so existing code without one still works. */
export function NoProviderHarness() {
  const [lastReason, setLastReason] = useState('');
  const { openDialogs } = useDialogManager();

  const { open, Modal } = useDialog<void, 'done'>({
    id: 'no-provider-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Singleton modal</p>
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
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Modal
      </button>
      <span data-testid="has-open">{openDialogs.length > 0 ? 'yes' : 'no'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
