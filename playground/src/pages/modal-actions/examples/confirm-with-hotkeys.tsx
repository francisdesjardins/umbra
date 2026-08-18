import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import Button from '@mui/material/Button';
import { Key, useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

// ── Component ──────────────────────────────────────────────────────────────

export const MODAL_ID = 'confirm-hotkeys';

const resultStore = createResultStore();

export function ConfirmWithHotkeysExample() {
  const { result } = useStore(resultStore);

  const modal = useMessageModal<void, 'cancel' | 'confirm'>({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    // A plain dialog, not an `alertdialog`: this asks, it does not interrupt.
    render: ({ action, hasRunningAction, error }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="info" />
            <MessageModal.Title id={`${MODAL_ID}-title`}>Confirm Action</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Shared.Message>
                This will perform an important action. Are you sure you want to continue?
              </Shared.Message>
              <Shared.Hint>
                Press <kbd>Enter</kbd> to confirm or <kbd>Escape</kbd> to cancel. Hotkeys are
                declared on the action itself.
              </Shared.Hint>
              <span
                style={{
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid var(--modal-border)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--modal-text-secondary)',
                }}
              >
                Status: {hasRunningAction ? 'Running...' : 'Idle'}
                {error ? ` | Error: ${error.message}` : ''}
              </span>
              {error && <Shared.Alert severity="error">{error.message}</Shared.Alert>}
            </div>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('cancel', { hotkey: Key.Escape })}>Cancel</Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('confirm', {
                hotkey: Key.Enter,
                onAction: async (close) => {
                  // Deterministic: the subject is the keyboard; random failures live on Delete.
                  await new Promise((resolve) => {
                    setTimeout(resolve, 400);
                  });
                  close();
                },
              })}
            >
              Confirm
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Button
        variant="contained"
        size="small"
        disabled={modal.hasRunningAction}
        onClick={async () => {
          const [, closeResult] = await modal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Confirm Modal
      </Button>
    </ExampleLayout>
  );
}
