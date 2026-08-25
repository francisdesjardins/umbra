import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageDialog } from 'umbra/react';

export const MODAL_ID = 'simple';

const resultStore = createResultStore();

export function SimpleDialogExample() {
  const { result } = useStore(resultStore);

  const simpleDialog = useMessageDialog({
    id: MODAL_ID,
    // Points at the heading rather than repeating it — a name written twice drifts; the id derives
    // from the modal's own, already unique.
    ariaLabelledBy: `${MODAL_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant="success" />
            <MessageDialog.Title id={`${MODAL_ID}-title`}>Simple Dialog</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.OverflowContainer style={{ maxHeight: '20vh' }}>
              {/* The paragraphs own their spacing — a vanilla template ships no layout to inherit. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
                <Shared.Message>
                  This modal uses MessageDialog.Content with a scrollable container to handle
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
          </MessageDialog.Content>
          <MessageDialog.Footer>
            {/* Claimed, because the container above overflows: `useScrollRegion` gives an
                overflowing scroller its own Tab stop, and first in the DOM it wins the opening
                focus — so the dialog would open on its reading area rather than its one button. */}
            <Shared.Button variant="primary" {...action('confirm', { focusOnOpen: true })}>
              OK
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
    <ExampleLayout result={result} modals={simpleDialog.Dialog}>
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await simpleDialog.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open
      </AppButton>
    </ExampleLayout>
  );
}
