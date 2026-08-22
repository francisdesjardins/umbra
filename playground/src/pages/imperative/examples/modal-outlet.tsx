import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';
import { AppButton } from '@/shared/ui/AppButton';
import { ModalOutlet, useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'outlet-demo';

// ── Module-level store — accessible by both inner and outer components ─────

const resultStore = createResultStore();

// ── Inner component — no {Modal} in JSX ────────────────────────────────────

function ConfirmDialog() {
  const confirmModal = useMessageModal({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="info" />
            <MessageModal.Title id={`${MODAL_ID}-title`}>Outlet Modal</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>
              This modal renders via <code>{'<ModalOutlet>'}</code> — there is no{' '}
              <code>{'{modal.Modal}'}</code> in the component JSX.
            </Shared.Message>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button variant="primary" {...action('confirm')}>
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

// ── Example wraps everything in ModalOutlet ────────────────────────────────

export function ModalOutletExample() {
  const { result } = useStore(resultStore);

  return (
    <ModalOutlet>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
        <ConfirmDialog />
        <ResultDisplay result={result} />
      </div>
    </ModalOutlet>
  );
}
