import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/modal-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { AppButton } from '@/shared/ui/AppButton';
import { Key, useMessageDialog } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

// ── Component ──────────────────────────────────────────────────────────────

export const MODAL_ID = 'confirm-hotkeys';

const resultStore = createResultStore();

export function ConfirmWithHotkeysExample() {
  const { result } = useStore(resultStore);

  const modal = useMessageDialog({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    // A plain dialog, not an `alertdialog`: this asks, it does not interrupt.
    render: ({ action, hasRunningAction, error, phase }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant="info" />
            <MessageDialog.Title id={`${MODAL_ID}-title`}>Confirm Action</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
              <Shared.Message>
                This will perform an important action. Are you sure you want to continue?
              </Shared.Message>
              <Shared.Hint>
                Press <kbd>Enter</kbd> to confirm or <kbd>Escape</kbd> to cancel. Hotkeys are
                declared on the action itself.
              </Shared.Hint>
              <span
                style={{
                  padding: 'var(--app-space-2)',
                  borderRadius: 4,
                  border: '1px solid var(--modal-border)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--modal-text-secondary)',
                }}
              >
                {/* An action stops running before the exit ends, so the flag alone reads Idle
                    against a panel still on screen. */}
                Status: {hasRunningAction || phase === 'closing' ? 'Running...' : 'Idle'}
                {error ? ` | Error: ${error.message}` : ''}
              </span>
              {error && <Shared.Alert severity="error">{error.message}</Shared.Alert>}
            </div>
          </MessageDialog.Content>
          <MessageDialog.Footer>
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
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Dialog}>
      <AppButton
        variant="contained"
        size="small"
        disabled={modal.hasRunningAction}
        onClick={async () => {
          const [, closeResult] = await modal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Confirm Dialog
      </AppButton>
    </ExampleLayout>
  );
}
