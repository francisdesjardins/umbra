import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { Stack, Typography } from '@mui/material';
import { dialogManager, useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';
import { createImmerStore } from '@/shared/lib/immer-store';

// ── Module-level store ────────────────────────────────────────────────────

const openCountStore = createImmerStore(
  { openCount: 0, result: null as string | null },
  ({ update }) => {
    return {
      increment() {
        update((draft) => {
          draft.openCount += 1;
        });
      },
      setResult(result: string | null) {
        update((draft) => {
          draft.result = result;
        });
      },
    };
  }
);

// ── Component ──────────────────────────────────────────────────────────────

export function ImperativeExample() {
  const { openCount, result } = useStore(openCountStore);

  const modal = useMessageModal<void, 'confirm' | 'imperative-demo'>({
    id: 'imperative-demo',
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type="success" sx={{ mb: 0 }} />
            <Typography variant="h6">Imperative Modal</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack spacing={2}>
              <Typography>
                Opened via <code>dialogManager.open()</code> — no React ref or state needed.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                State lives at module scope via <code>createStore</code>. React Compiler tracks
                dependencies automatically.
              </Typography>
              <Typography
                variant="caption"
                sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, display: 'block' }}
              >
                Total opens: {openCount}
              </Typography>
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button
              variant="outlined"
              size="small"
              onClick={() => {
                dialogManager.close('imperative-demo');
              }}
            >
              Close via dialogManager
            </Shared.Button>
            <Shared.Button variant="contained" {...action('confirm')}>
              Close
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
    onOpen: () => {
      openCountStore.increment();
    },
    onClose: (closeResult) => {
      openCountStore.setResult(
        `Closed: ${closeResult.reason} (opened ${String(openCountStore.getSnapshot().openCount)} times)`
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={() => {
          dialogManager.open('imperative-demo');
        }}
      >
        Open via dialogManager
      </Shared.Button>
    </ExampleLayout>
  );
}
