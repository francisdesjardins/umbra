import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'simple';

const resultStore = createResultStore();

export function SimpleModalExample() {
  const { result } = useStore(resultStore);

  const simpleModal = useMessageModal<void, 'confirm'>({
    id: MODAL_ID,
    // Points at the heading rather than repeating it — a name written twice drifts; the id derives
    // from the modal's own, already unique.
    ariaLabelledBy: `${MODAL_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="success" />
            <MessageModal.Title id={`${MODAL_ID}-title`}>Simple Modal</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.OverflowContainer style={{ maxHeight: '20vh' }}>
              {/* The paragraphs own their spacing — a vanilla template ships no layout to inherit. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Shared.Message>
                  This modal uses MessageModal.Content with a scrollable container to handle
                  overflow text. When the content exceeds the available height, the container
                  becomes scrollable while the title and footer remain fixed.
                </Shared.Message>
                <Shared.Message>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </Shared.Message>
                <Shared.Message>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                  fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                  culpa qui officia deserunt mollit anim id est laborum.
                </Shared.Message>
              </div>
            </Shared.OverflowContainer>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="primary" {...action('confirm')}>
              OK
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
    <ExampleLayout result={result} modals={simpleModal.Modal}>
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await simpleModal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open
      </AppButton>
    </ExampleLayout>
  );
}
