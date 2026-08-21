import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import {
  CONFIRM_MODAL_ID,
  FAILURE_MODAL_ID,
  deploymentService,
} from '@/pages/imperative/examples/deployment-service';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageModal } from 'umbra/react';
import { useSyncExternalStore } from 'react';

export const MODAL_ID = CONFIRM_MODAL_ID;

/** The React half registers the two modals the service opens by id and mirrors its state. */
export function ServiceLayerExample() {
  // The service's subscribe + getters are already `useSyncExternalStore`'s contract.
  const activity = useSyncExternalStore(deploymentService.subscribe, deploymentService.getActivity);
  const target = useSyncExternalStore(deploymentService.subscribe, deploymentService.getTarget);
  const lastError = useSyncExternalStore(
    deploymentService.subscribe,
    deploymentService.getLastError
  );

  const confirmModal = useMessageModal<void, 'cancel' | 'confirm'>({
    id: CONFIRM_MODAL_ID,
    ariaLabelledBy: `${CONFIRM_MODAL_ID}-title`,
    // A dialog, not an alertdialog: the user pressed the button that raised it.
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="warning" />
            <MessageModal.Title id={`${CONFIRM_MODAL_ID}-title`}>
              Confirm deployment
            </MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Shared.Message>
                Deploy the current build to <strong>{target}</strong>?
              </Shared.Message>
              <Shared.Hint>
                The service is awaiting this dialog&apos;s close reason before it calls the API.
              </Shared.Hint>
            </div>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button variant="primary" {...action('confirm')}>
              Deploy
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const failureModal = useMessageModal<void, 'acknowledge'>({
    id: FAILURE_MODAL_ID,
    ariaLabelledBy: `${FAILURE_MODAL_ID}-title`,
    ariaDescribedBy: `${FAILURE_MODAL_ID}-body`,
    // `alertdialog`: a blocking error raised unasked, announced with its description (the error).
    role: 'alertdialog',
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="error" />
            <MessageModal.Title id={`${FAILURE_MODAL_ID}-title`}>
              Deployment failed
            </MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Shared.Message id={`${FAILURE_MODAL_ID}-body`}>{lastError}</Shared.Message>
              <Shared.Hint>
                Raised by the service after the API call rejected — no component was involved.
              </Shared.Hint>
            </div>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('acknowledge')}>Dismiss</Shared.Button>
            <Shared.Button
              variant="primary"
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
      <div
        style={{
          padding: 'var(--app-space-4)',
          background: 'var(--app-paper)',
          borderRadius: 'var(--app-radius)',
          border: '1px solid var(--app-divider)',
          fontFamily: 'monospace',
          fontSize: 'var(--app-text-sm)',
          minHeight: 96,
          maxHeight: 180,
          overflow: 'auto',
        }}
      >
        {activity.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: 'var(--app-text-md)',
              lineHeight: 1.43,
              color: 'var(--app-text-secondary)',
            }}
          >
            No activity — start a deploy to watch the service drive the flow.
          </p>
        ) : (
          activity.map((entry) => {
            return (
              <div key={`${entry.at}-${entry.text}`} style={{ marginBottom: 2 }}>
                [{entry.at}] {entry.text}
              </div>
            );
          })
        )}
      </div>

      <ExampleLayout
        result={null}
        modals={
          <>
            {confirmModal.Modal}
            {failureModal.Modal}
          </>
        }
      >
        <AppButton
          variant="contained"
          size="small"
          onClick={() => {
            void deploymentService.deploy('staging');
          }}
        >
          Deploy to staging
        </AppButton>
        <AppButton
          variant="contained"
          size="small"
          color="error"
          onClick={() => {
            void deploymentService.deploy('production');
          }}
        >
          Deploy to production
        </AppButton>
      </ExampleLayout>
    </div>
  );
}
