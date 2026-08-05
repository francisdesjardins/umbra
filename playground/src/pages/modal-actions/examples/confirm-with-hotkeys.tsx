import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { Stack, Typography } from '@mui/material';
import { Key, defineAction, useMessageModal, useModalActions, useStore } from 'umbra/react';

// ── Component ──────────────────────────────────────────────────────────────

export const MODAL_ID = 'confirm-hotkeys';

const resultStore = createResultStore();

export function ConfirmWithHotkeysExample() {
  const { result } = useStore(resultStore);

  const actions = useModalActions({
    cancel: defineAction({ hotkey: Key.Escape }),
    confirm: defineAction({ hotkey: Key.Enter }),
  });

  const modal = useMessageModal({
    id: MODAL_ID,
    actions,
    render: () => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type="info" sx={{ mb: 0 }} />
            <Typography variant="h6">Confirm Action</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack spacing={2}>
              <Typography>
                This will perform an important action. Are you sure you want to continue?
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Press <kbd>Enter</kbd> to confirm or <kbd>Escape</kbd> to cancel. Hotkeys are
                configured via <code>defineAction</code> options.
              </Typography>
              <Typography
                variant="caption"
                sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, display: 'block' }}
              >
                Status: {actions.isRunning ? 'Running...' : 'Idle'}
                {actions.error ? ` | Error: ${actions.error.message}` : ''}
              </Typography>
              {actions.error && (
                <Shared.AlertContent severity="error">{actions.error.message}</Shared.AlertContent>
              )}
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...actions.cancel()}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="contained"
              {...actions.confirm(async (close) => {
                await simulateApiCall('Confirm action');
                close();
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
      <Shared.Button
        variant="contained"
        size="small"
        disabled={actions.isRunning}
        onClick={async () => {
          await modal.open();
          const [, closeResult] = await modal.waitForClose();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Confirm Modal
      </Shared.Button>
    </ExampleLayout>
  );
}
