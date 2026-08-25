import * as MessageDialog from '@/entities/modal-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';
import { AppButton } from '@/shared/ui/AppButton';
import { DialogOutlet, useMessageDialog } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'outlet-demo';

// ── Module-level store — accessible by both inner and outer components ─────

const resultStore = createResultStore();

// ── Inner component — no {Modal} in JSX ────────────────────────────────────

function ConfirmDialog() {
  const confirmModal = useMessageDialog({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant="info" />
            <MessageDialog.Title id={`${MODAL_ID}-title`}>Outlet Modal</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.Message>
              This modal renders via <code>{'<DialogOutlet>'}</code> — there is no{' '}
              <code>{'{modal.Modal}'}</code> in the component JSX.
            </Shared.Message>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button variant="primary" {...action('confirm')}>
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
    <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await confirmModal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open
      </AppButton>
    </div>
  );
}

// ── Example wraps everything in DialogOutlet ────────────────────────────────

export function ModalOutletExample() {
  const { result } = useStore(resultStore);

  return (
    <DialogOutlet>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
        <ConfirmDialog />
        <ResultDisplay result={result} />
      </div>
    </DialogOutlet>
  );
}
