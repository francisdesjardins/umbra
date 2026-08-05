import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { Stack } from '@mui/material';
import { Key, defineAction, useMessageModal, useModalActions, useStore } from 'umbra/react';

export const MODAL_ID = 'mui-message-example';

const resultStore = createResultStore();

export function MuiMessageExample() {
  const { result } = useStore(resultStore);

  const actions = useModalActions({
    cancel: defineAction({ hotkey: Key.Escape }),
    delete: defineAction({ hotkey: Key.Enter }),
  });

  const modal = useMessageModal({
    id: MODAL_ID,
    actions,
    render: () => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <MessageModal.Icon type="warning" sx={{ mb: 0 }} />
              <MessageModal.Title>Delete Item?</MessageModal.Title>
            </Stack>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>
              Are you sure you want to delete this item? This action cannot be undone.
            </Shared.Message>
            <Shared.Hint>This is a Material UI modal example.</Shared.Hint>
            {actions.error && (
              <Shared.AlertContent severity="error" sx={{ mt: 2 }}>
                {actions.error.message}
              </Shared.AlertContent>
            )}
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...actions.cancel()}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="contained"
              color="error"
              {...actions.delete(async (close) => {
                await simulateApiCall('delete item', 1000);
                close();
              })}
            >
              Delete
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed with reason: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await modal.open();
          const [, closeResult] = await modal.waitForClose();
          resultStore.setResult(`Closed with reason: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open MUI Modal
      </Shared.Button>
    </ExampleLayout>
  );
}
