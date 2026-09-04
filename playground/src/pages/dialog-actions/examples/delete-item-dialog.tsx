import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageDialog } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';
import { createImmerStore } from '@/shared/lib/immer-store';

export const DIALOG_ID = 'delete-item-dialog';

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

function useDeleteItemDialog(options: { onDelete: (itemId: string) => Promise<void> }) {
  const { itemName } = useStore(deleteItemStore);

  const dialog = useMessageDialog({
    id: DIALOG_ID,
    ariaLabelledBy: `${DIALOG_ID}-title`,
    ariaDescribedBy: `${DIALOG_ID}-body`,
    // A destructive confirm interrupts, and an alertdialog is announced with its description.
    role: 'alertdialog',
    render: ({ action, hasRunningAction, error, phase }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant="error" />
            <MessageDialog.Title id={`${DIALOG_ID}-title`}>Delete Item</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
              <Shared.Message id={`${DIALOG_ID}-body`}>
                Are you sure you want to delete <strong>&quot;{itemName}&quot;</strong>?
              </Shared.Message>
              <Shared.Alert severity="warning">This action cannot be undone.</Shared.Alert>
              {error && <Shared.Alert severity="error">{error.message}</Shared.Alert>}
              <span
                style={{
                  padding: 'var(--app-space-2)',
                  borderRadius: 4,
                  border: '1px solid var(--dialog-border)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--dialog-text-secondary)',
                }}
              >
                {/* An action stops running before the exit ends, so the flag alone reads Idle
                    against a panel still on screen. */}
                Status: {hasRunningAction || phase === 'closing' ? 'Running...' : 'Idle'}
                {error && ` | Error: ${error.message}`}
              </span>
            </div>
          </MessageDialog.Content>
          <MessageDialog.Footer>
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
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
  });

  // `openAndWait` registers the resolver before the open, so a close during `prepare` is not missed.
  const openForItem = (id: string, name: string) => {
    deleteItemStore.prepareForItem(id, name);
    return dialog.openAndWait();
  };

  return {
    openForItem,
    Dialog: dialog.Dialog,
  };
}

export function DeleteItemDialogExample() {
  const { result } = useStore(resultStore);

  const deleteDialog = useDeleteItemDialog({
    onDelete: (itemId) => {
      return simulateApiCall(`Delete item ${itemId}`);
    },
  });

  return (
    <ExampleLayout result={result} dialogs={deleteDialog.Dialog}>
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await deleteDialog.openForItem(
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
        size="small"
        onClick={async () => {
          const [, closeResult] = await deleteDialog.openForItem('item-456', 'Project Files.zip');
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
