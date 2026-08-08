import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { createImmerStore } from '@/shared/lib/immer-store';
import { Alert, Box, Paper, Stack, TextField, Typography } from '@mui/material';
import { useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'reactive-demo';

// ── Module-level store ────────────────────────────────────────────────────

type Severity = 'info' | 'warning' | 'error';

type ReactiveState = { count: number; message: string; severity: Severity };

const INITIAL_STATE: ReactiveState = {
  count: 0,
  message: 'Initial message',
  severity: 'info',
};

const reactiveStore = createImmerStore(INITIAL_STATE, (api) => {
  return {
    reset() {
      api.reset();
    },
    setCount(count: number) {
      api.update((draft) => {
        draft.count = count;
      });
    },
    incrementCount() {
      api.update((draft) => {
        draft.count += 1;
      });
    },
    decrementCount() {
      api.update((draft) => {
        draft.count -= 1;
      });
    },
    setMessage(message: string) {
      api.update((draft) => {
        draft.message = message;
      });
    },
    setSeverity(severity: 'info' | 'warning' | 'error') {
      api.update((draft) => {
        draft.severity = severity;
      });
    },
  };
});

// ── Result store — separate from reactiveStore to avoid re-rendering LiveControls ──

const resultStore = createResultStore();

// ── Live Controls ─────────────────────────────────────────────────────────

function useLiveControls() {
  const { count, message, severity } = useStore(reactiveStore);

  const LiveControls = (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        p: 2,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ textAlign: 'left' }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }} align="left">
          Live Controls
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          align="left"
          sx={{ mb: 2, display: 'block' }}
        >
          Change values in real-time
        </Typography>
      </Box>

      <Stack direction="row" spacing={3} sx={{ width: '100%', alignItems: 'flex-start' }}>
        {/* Counter Controls */}
        <Stack direction="column" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
          <Typography
            variant="caption"
            gutterBottom
            align="left"
            sx={{ fontWeight: 500, display: 'block' }}
          >
            Counter: {count}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Shared.Button
              variant="outlined"
              size="small"
              onClick={() => {
                reactiveStore.decrementCount();
              }}
              sx={{ minWidth: 36, px: 0 }}
            >
              −
            </Shared.Button>
            <Shared.Button
              variant="outlined"
              size="small"
              onClick={() => {
                reactiveStore.incrementCount();
              }}
              sx={{ minWidth: 36, px: 0 }}
            >
              +
            </Shared.Button>
            <Shared.Button
              variant="outlined"
              size="small"
              onClick={() => {
                reactiveStore.setCount(0);
              }}
              sx={{ minWidth: 36, px: 0 }}
            >
              0
            </Shared.Button>
          </Stack>
        </Stack>

        {/* Message Input */}
        <Stack direction="column" spacing={1} sx={{ flex: 2, alignItems: 'center' }}>
          <Typography
            variant="caption"
            gutterBottom
            align="left"
            sx={{ fontWeight: 500, display: 'block' }}
          >
            Message
          </Typography>
          <TextField
            value={message}
            onChange={(e) => {
              reactiveStore.setMessage(e.target.value);
            }}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={{ flexGrow: 1, minWidth: 'min(220px, 100%)', maxWidth: 400 }}
          />
        </Stack>

        {/* Severity Controls */}
        <Stack direction="column" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
          <Typography
            variant="caption"
            gutterBottom
            align="left"
            sx={{ fontWeight: 500, display: 'block' }}
          >
            Severity
          </Typography>
          <Stack direction="column" spacing={1} sx={{ width: '100%' }}>
            <Shared.Button
              variant={severity === 'info' ? 'contained' : 'outlined'}
              size="medium"
              onClick={() => {
                reactiveStore.setSeverity('info');
              }}
              fullWidth
              sx={{ minHeight: 36 }}
            >
              Info
            </Shared.Button>
            <Shared.Button
              variant={severity === 'warning' ? 'contained' : 'outlined'}
              size="medium"
              onClick={() => {
                reactiveStore.setSeverity('warning');
              }}
              color="warning"
              fullWidth
              sx={{ minHeight: 36 }}
            >
              Warning
            </Shared.Button>
            <Shared.Button
              variant={severity === 'error' ? 'contained' : 'outlined'}
              size="medium"
              onClick={() => {
                reactiveStore.setSeverity('error');
              }}
              color="error"
              fullWidth
              sx={{ minHeight: 36 }}
            >
              Error
            </Shared.Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );

  return { LiveControls };
}

export function ReactiveDepsExample() {
  const { result } = useStore(resultStore);
  const { count, message, severity } = useStore(reactiveStore);

  const { LiveControls } = useLiveControls();

  const reactiveModal = useMessageModal<void, 'cancel' | 'confirm'>({
    id: MODAL_ID,
    dismissOnBackdropClick: false,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout
          slotProps={{ container: { sx: { width: 'min(600px, 92vw)' } } }}
        >
          <MessageModal.Header>
            <MessageModal.Icon type={severity} sx={{ mb: 0 }} />
            <Typography variant="h6">Reactive Dependencies Demo</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" gutterBottom>
                    {message}
                  </Typography>
                  <Alert severity={severity} sx={{ my: 2 }}>
                    Counter value: <strong>{count}</strong>
                  </Alert>
                  <Typography variant="caption" color="text.secondary">
                    This modal content updates automatically when count, message, or severity
                    change. Use the controls below to test reactivity!
                  </Typography>
                </Box>
              </Box>

              {LiveControls}
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                reactiveStore.reset();
              }}
              sx={{ mr: 1 }}
            >
              Reset
            </Shared.Button>
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
  });

  return (
    <ExampleLayout result={result} modals={reactiveModal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await reactiveModal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Modal & Test Reactivity
      </Shared.Button>
    </ExampleLayout>
  );
}
