import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';
import { createImmerStore } from '@/shared/lib/immer-store';

export const MODAL_ID = 'delete-item-modal';

// ── Module-level store ────────────────────────────────────────────────────

const deleteItemStore = createImmerStore(
  { deleted: false, itemId: null as string | null, itemName: '' },
  {
    builder: ({ set, update }) => {
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
    },
  }
);

// ── Result store ──────────────────────────────────────────────────────────

const resultStore = createResultStore();

// ── MFE-Level Hook ─────────────────────────────────────────────────────────

function useDeleteItemModal(options: { onDelete: (itemId: string) => Promise<void> }) {
  const { itemName } = useStore(deleteItemStore);

  const modal = useMessageModal<void, 'cancel' | 'delete'>({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    ariaDescribedBy: `${MODAL_ID}-body`,
    // A destructive confirm interrupts, and an alertdialog is announced with its description.
    role: 'alertdialog',
    render: ({ action, hasRunningAction, error, phase }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="error" />
            <MessageModal.Title id={`${MODAL_ID}-title`}>Delete Item</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
              <Shared.Message id={`${MODAL_ID}-body`}>
                Are you sure you want to delete <strong>&quot;{itemName}&quot;</strong>?
              </Shared.Message>
              <Shared.Alert severity="warning">This action cannot be undone.</Shared.Alert>
              {error && <Shared.Alert severity="error">{error.message}</Shared.Alert>}
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
                {error && ` | Error: ${error.message}`}
              </span>
            </div>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('cancel', { hotkey: 'Escape' })}>Cancel</Shared.Button>
            <Shared.Button
              variant="primary"
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

  // `openAndWait` registers the resolver before the open, so a close during `prepare` is not missed.
  const openForItem = (id: string, name: string) => {
    deleteItemStore.prepareForItem(id, name);
    return modal.openAndWait();
  };

  return {
    openForItem,
    Modal: modal.Modal,
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
      <AppButton
        variant="contained"
        color="error"
        onClick={async () => {
          const [, closeResult] = await deleteModal.openForItem(
            'item-123',
            'Important Document.pdf'
          );
          resultStore.setResult(
            `Closed: ${closeResult?.reason ?? 'unknown'}, deleted: ${String(deleteItemStore.getSnapshot().deleted)}`
          );
        }}
      >
        Delete Document
      </AppButton>
      <AppButton
        variant="contained"
        color="error"
        onClick={async () => {
          const [, closeResult] = await deleteModal.openForItem('item-456', 'Project Files.zip');
          resultStore.setResult(
            `Closed: ${closeResult?.reason ?? 'unknown'}, deleted: ${String(deleteItemStore.getSnapshot().deleted)}`
          );
        }}
      >
        Delete Archive
      </AppButton>
    </ExampleLayout>
  );
}
