import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { Stack, Typography } from '@mui/material';
import { useMessageModal, useStore } from 'umbra/react';
import { createImmerStore } from '@/shared/lib/immer-store';

export const MODAL_ID = 'delete-item-modal';

// ── Module-level store ────────────────────────────────────────────────────

const deleteItemStore = createImmerStore(
  { deleted: false, itemId: null as string | null, itemName: '' },
  ({ set, update }) => {
    return {
      prepareForItem(id: string, name: string) {
        set({ deleted: false, itemId: id, itemName: name });
      },
      markDeleted() {
        update((draft) => {
          draft.deleted = true;
        });
      },
    };
  }
);

// ── Result store ──────────────────────────────────────────────────────────

const resultStore = createResultStore();

// ── MFE-Level Hook ─────────────────────────────────────────────────────────

function useDeleteItemModal(options: { onDelete: (itemId: string) => Promise<void> }) {
  const { itemName } = useStore(deleteItemStore);

  const modal = useMessageModal<void, 'cancel' | 'delete'>({
    id: MODAL_ID,
    render: ({ action, isRunning, error }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type="error" sx={{ mb: 0 }} />
            <Typography variant="h6">Delete Item</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack spacing={2}>
              <Typography>
                Are you sure you want to delete <strong>&quot;{itemName}&quot;</strong>?
              </Typography>
              <Shared.AlertContent severity="warning">
                This action cannot be undone.
              </Shared.AlertContent>
              {error && <Shared.AlertContent severity="error">{error.message}</Shared.AlertContent>}
              <Typography
                variant="caption"
                sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, display: 'block' }}
              >
                Status: {isRunning ? 'Running...' : 'Idle'}
                {error && ` | Error: ${error.message}`}
              </Typography>
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel', { hotkey: 'Escape' })}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="contained"
              color="error"
              {...action('delete', {
                hotkey: 'Enter',
                onAction: async (close) => {
                  const { itemId } = deleteItemStore.getSnapshot();
                  if (!itemId) {
                    return;
                  }
                  await options.onDelete(itemId);
                  deleteItemStore.markDeleted();
                  close();
                },
              })}
            >
              Delete
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const openForItem = (id: string, name: string) => {
    deleteItemStore.prepareForItem(id, name);
    return modal.open();
  };

  return {
    openForItem,
    Modal: modal.Modal,
    waitForClose: modal.waitForClose,
  };
}

export function DeleteItemModalExample() {
  const { result } = useStore(resultStore);

  const deleteModal = useDeleteItemModal({
    onDelete: (itemId) => {
      return simulateApiCall(`Delete item ${itemId}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={deleteModal.Modal}>
      <Shared.Button
        variant="contained"
        color="error"
        onClick={async () => {
          await deleteModal.openForItem('item-123', 'Important Document.pdf');
          const [, closeResult] = await deleteModal.waitForClose();
          resultStore.setResult(
            `Closed: ${closeResult?.reason ?? 'unknown'}, deleted: ${String(deleteItemStore.getSnapshot().deleted)}`
          );
        }}
      >
        Delete Document
      </Shared.Button>
      <Shared.Button
        variant="contained"
        color="error"
        onClick={async () => {
          await deleteModal.openForItem('item-456', 'Project Files.zip');
          const [, closeResult] = await deleteModal.waitForClose();
          resultStore.setResult(
            `Closed: ${closeResult?.reason ?? 'unknown'}, deleted: ${String(deleteItemStore.getSnapshot().deleted)}`
          );
        }}
      >
        Delete Archive
      </Shared.Button>
    </ExampleLayout>
  );
}
