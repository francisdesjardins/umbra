import { useRef, useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests dismissWhilePreparing: false — ESC is blocked while prepare is running.
 * The "Resolve" button inside the modal resolves the prepare promise so the
 * test can verify that ESC works again once loading completes.
 */
export function DismissWhilePreparingDisabledHarness() {
  const [lastReason, setLastReason] = useState('');
  const resolveRef = useRef<(() => void) | null>(null);

  const { open, isVisible, Modal } = useModal<void, 'confirm'>({
    id: 'dismiss-while-preparing-modal',
    dismissWhilePreparing: false,
    prepare: () => {
      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
      });
    },
    render: ({ isPreparing, handle }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="loading-state">{isPreparing ? 'loading' : 'ready'}</span>
          <button
            data-testid="resolve-loading"
            onClick={() => {
              resolveRef.current?.();
            }}
          >
            Resolve
          </button>
          <button
            onClick={() => {
              handle.close('confirm');
            }}
          >
            Confirm
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}

/**
 * Tests dismissWhilePreparing: true (default) — ESC closes the modal even while
 * prepare is still running.
 */
export function DismissWhilePreparingDefaultHarness() {
  const [lastReason, setLastReason] = useState('');
  const resolveRef = useRef<(() => void) | null>(null);

  const { open, isVisible, Modal } = useModal<void, 'confirm'>({
    id: 'dismiss-while-preparing-default',
    prepare: () => {
      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
      });
    },
    render: ({ isPreparing, handle }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="loading-state">{isPreparing ? 'loading' : 'ready'}</span>
          <button
            onClick={() => {
              handle.close('confirm');
            }}
          >
            Confirm
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
