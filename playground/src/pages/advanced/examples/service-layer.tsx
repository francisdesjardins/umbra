import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import {
  CONFIRM_MODAL_ID,
  FAILURE_MODAL_ID,
  deploymentService,
} from '@/pages/advanced/examples/deployment-service';
import { Box, Stack, Typography } from '@mui/material';
import { useMessageModal } from 'umbra/react';
import { useSyncExternalStore } from 'react';

export const MODAL_ID = CONFIRM_MODAL_ID;

/**
 * The React half is deliberately thin: it registers the two modals the service opens by id
 * and mirrors the service's state. It orchestrates nothing — no flow logic lives here.
 */
export function ServiceLayerExample() {
  // The service exposes subscribe + getters, which is exactly useSyncExternalStore's
  // contract — no adapter needed for a store the library did not provide.
  const activity = useSyncExternalStore(deploymentService.subscribe, deploymentService.getActivity);
  const target = useSyncExternalStore(deploymentService.subscribe, deploymentService.getTarget);
  const lastError = useSyncExternalStore(
    deploymentService.subscribe,
    deploymentService.getLastError
  );

  const confirmModal = useMessageModal<void, 'cancel' | 'confirm'>({
    id: CONFIRM_MODAL_ID,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <MessageModal.Icon type="warning" sx={{ mb: 0 }} />
              <Typography variant="h6">Confirm deployment</Typography>
            </Stack>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>
              Deploy the current build to <strong>{target}</strong>?
            </Shared.Message>
            <Shared.Hint>
              The service is awaiting this dialog&apos;s close reason before it calls the API.
            </Shared.Hint>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel')}>
              Cancel
            </Shared.Button>
            <Shared.Button variant="contained" {...action('confirm')}>
              Deploy
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const failureModal = useMessageModal({
    id: FAILURE_MODAL_ID,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <MessageModal.Icon type="error" sx={{ mb: 0 }} />
              <Typography variant="h6">Deployment failed</Typography>
            </Stack>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>{lastError}</Shared.Message>
            <Shared.Hint>
              Raised by the service after the API call rejected — no component was involved.
            </Shared.Hint>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('dismiss')}>
              Dismiss
            </Shared.Button>
            <Shared.Button
              variant="contained"
              onClick={() => {
                void deploymentService.retry();
              }}
            >
              Retry
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  return (
    <Stack sx={{ gap: 2 }}>
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          fontFamily: 'monospace',
          fontSize: '0.8125rem',
          minHeight: 96,
          maxHeight: 180,
          overflow: 'auto',
        }}
      >
        {activity.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No activity — start a deploy to watch the service drive the flow.
          </Typography>
        ) : (
          activity.map((entry) => {
            return (
              <div key={`${entry.at}-${entry.text}`} style={{ marginBottom: 2 }}>
                [{entry.at}] {entry.text}
              </div>
            );
          })
        )}
      </Box>

      <ExampleLayout
        result={null}
        modals={
          <>
            {confirmModal.Modal}
            {failureModal.Modal}
          </>
        }
      >
        <Shared.Button
          variant="contained"
          size="small"
          onClick={() => {
            void deploymentService.deploy('staging');
          }}
        >
          Deploy to staging
        </Shared.Button>
        <Shared.Button
          variant="contained"
          size="small"
          color="error"
          onClick={() => {
            void deploymentService.deploy('production');
          }}
        >
          Deploy to production
        </Shared.Button>
      </ExampleLayout>
    </Stack>
  );
}
