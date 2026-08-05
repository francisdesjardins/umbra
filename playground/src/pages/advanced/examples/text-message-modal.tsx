import {
  createTextMessageModal,
  useTextMessageModal,
} from '@/entities/modal-template/ui/mui/create-text-message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';
import { Stack } from '@mui/material';
import { ModalOutlet, dialogManager, useStore } from 'umbra/react';

export const MODAL_ID = 'text-message-modal-demo';

// ── Module-level store — accessible by both inner and outer components ─────

const resultStore = createResultStore();

// ── Inner component — no {Modal} in JSX ────────────────────────────────────

function ConfirmAction() {
  const def = createTextMessageModal(MODAL_ID, {
    createModal: (b) => {
      return b
        .setTitle('Confirm Action')
        .setMessage('Are you sure you want to proceed? This action cannot be undone.')
        .confirm(async () => {
          await simulateApiCall('Confirm Action');
        })
        .cancel()
        .onClose(({ reason }) => {
          resultStore.setResult(`Closed: ${reason}`);
        });
    },
  });

  // Notice: no {Modal} anywhere — ModalOutlet renders it automatically
  useTextMessageModal(def);

  return (
    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={() => {
          dialogManager.open(MODAL_ID);
        }}
      >
        Open via dialogManager
      </Shared.Button>
    </Stack>
  );
}

// ── Example wraps everything in ModalOutlet ────────────────────────────────

export function TextMessageModalExample() {
  const { result } = useStore(resultStore);

  return (
    <ModalOutlet>
      <Stack direction="column" sx={{ gap: 2 }}>
        <ConfirmAction />
        <ResultDisplay result={result} />
      </Stack>
    </ModalOutlet>
  );
}
