import { useState } from 'react';
import { DialogManagerProvider } from '../../dialog-manager-context.js';
import { useDialogManager } from '../../use-dialog-manager.js';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * A self-contained modal that registers with the nearest DialogManager
 * and exposes state via data-testid attributes scoped by `label`.
 */
function ScopedModal({ id, label }: { readonly id: string; readonly label: string }) {
  const [lastReason, setLastReason] = useState('');
  const { openDialogs } = useDialogManager();

  const { open, Modal } = useModal({
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
 * Two modals wrapped in separate DialogManagerProviders.
 * Each provider creates an isolated registry — opening a modal in one
 * scope must not affect the dialog count or state in the other.
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

/**
 * A modal without any provider — uses the static singleton.
 * Verifies backward compatibility: existing code without a provider still works.
 */
export function NoProviderHarness() {
  const [lastReason, setLastReason] = useState('');
  const { openDialogs } = useDialogManager();

  const { open, Modal } = useModal({
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
