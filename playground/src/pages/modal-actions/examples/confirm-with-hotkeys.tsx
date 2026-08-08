import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Stack, Typography } from '@mui/material';
import { Key, useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

// ── Component ──────────────────────────────────────────────────────────────

export const MODAL_ID = 'confirm-hotkeys';

const resultStore = createResultStore();

export function ConfirmWithHotkeysExample() {
  const { result } = useStore(resultStore);

  const modal = useMessageModal<void, 'cancel' | 'confirm'>({
    id: MODAL_ID,
    render: ({ action, hasRunningAction, error }) => {
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
                declared on the action itself.
              </Typography>
              <Typography
                variant="caption"
                sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, display: 'block' }}
              >
                Status: {hasRunningAction ? 'Running...' : 'Idle'}
                {error ? ` | Error: ${error.message}` : ''}
              </Typography>
              {error && <Shared.AlertContent severity="error">{error.message}</Shared.AlertContent>}
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel', { hotkey: Key.Escape })}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="contained"
              {...action('confirm', {
                hotkey: Key.Enter,
                onAction: async (close) => {
                  // Deterministic on purpose: this card's subject is the keyboard, and a demo
                  // that fails a third of the time teaches the wrong thing about the key.
                  // The random failures live on the Delete card next to it.
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
      <Shared.Button
        variant="contained"
        size="small"
        disabled={modal.hasRunningAction}
        onClick={async () => {
          const [, closeResult] = await modal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Confirm Modal
      </Shared.Button>
    </ExampleLayout>
  );
}
