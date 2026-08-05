import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import * as VanillaSlideModal from '@/entities/modal-template/ui/vanilla/slide-modal';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Button } from '@mui/material';
import { useSlideModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'vanilla-slide-example';

const resultStore = createResultStore();

export function VanillaSlideExample() {
  const { result } = useStore(resultStore);

  const panel = useSlideModal<void, 'close'>({
    id: MODAL_ID,
    direction: 'right',
    render: ({ direction, action }) => {
      return (
        <VanillaSlideModal.DefaultLayout direction={direction}>
          <VanillaSlideModal.Header>
            <VanillaSlideModal.Title>Settings Panel</VanillaSlideModal.Title>
          </VanillaSlideModal.Header>
          <VanillaSlideModal.Content>
            <Shared.Section title="General">
              <Shared.Message>This is a vanilla slide panel example.</Shared.Message>
              <Shared.Detail>
                Built with HTML and CSS modules, no UI framework required.
              </Shared.Detail>
            </Shared.Section>

            <VanillaSlideModal.SectionGroup>
              <Shared.Section title="Notifications">
                <VanillaSlideModal.CheckboxLabel>
                  <input type="checkbox" defaultChecked />
                  <Shared.Detail>Enable email notifications</Shared.Detail>
                </VanillaSlideModal.CheckboxLabel>
                <VanillaSlideModal.CheckboxLabel>
                  <input type="checkbox" />
                  <Shared.Detail>Enable push notifications</Shared.Detail>
                </VanillaSlideModal.CheckboxLabel>
              </Shared.Section>
            </VanillaSlideModal.SectionGroup>
          </VanillaSlideModal.Content>
          <VanillaSlideModal.Footer>
            <Shared.Button variant="primary" {...action('close')}>
              Close
            </Shared.Button>
          </VanillaSlideModal.Footer>
        </VanillaSlideModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Panel closed with reason: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={panel.Modal}>
      <Button
        variant="contained"
        size="small"
        onClick={async () => {
          void panel.open();
          const [, closeResult] = await panel.waitForClose();
          resultStore.setResult(`Panel closed with reason: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Vanilla Panel
      </Button>
    </ExampleLayout>
  );
}
