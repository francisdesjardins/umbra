import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';
import { Stack, Typography } from '@mui/material';
import { ModalOutlet, useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'outlet-demo';

// ── Module-level store — accessible by both inner and outer components ─────

const resultStore = createResultStore();

// ── Inner component — no {Modal} in JSX ────────────────────────────────────

function ConfirmDialog() {
  const confirmModal = useMessageModal<void, 'cancel' | 'confirm'>({
    id: MODAL_ID,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <MessageModal.Icon type="info" sx={{ mb: 0 }} />
              <MessageModal.Title>Outlet Modal</MessageModal.Title>
            </Stack>
          </MessageModal.Header>
          <MessageModal.Content>
            <Typography>
              This modal renders via <code>{'<ModalOutlet>'}</code> — there is no{' '}
              <code>{'{modal.Modal}'}</code> in the component JSX.
            </Typography>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel')}>
              Cancel
            </Shared.Button>
            <Shared.Button variant="contained" {...action('confirm')}>
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

  // Notice: no {confirmModal.Modal} anywhere!
  return (
    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await confirmModal.open();
          const [, closeResult] = await confirmModal.waitForClose();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open
      </Shared.Button>
    </Stack>
  );
}

// ── Example wraps everything in ModalOutlet ────────────────────────────────

export function ModalOutletExample() {
  const { result } = useStore(resultStore);

  return (
    <ModalOutlet>
      <Stack direction="column" sx={{ gap: 2 }}>
        <ConfirmDialog />
        <ResultDisplay result={result} />
      </Stack>
    </ModalOutlet>
  );
}
