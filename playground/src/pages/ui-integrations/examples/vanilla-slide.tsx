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

  // The same three sections, the same controls and the same two reasons its MUI twin declares —
  // deliberately, and it is the whole point of the pair. What differs is the markup underneath and
  // the one line of prose naming the flavour; anything else differing turns a comparison into two
  // unrelated demos. Its `SectionGroup` is the counterpart of MUI's inner `<Stack>`: it groups the
  // checkboxes, not the section around them.
  const panel = useSlideModal<void, 'cancel' | 'save'>({
    id: MODAL_ID,
    direction: 'right',
    ariaLabelledBy: `${MODAL_ID}-title`,
    render: ({ direction, action }) => {
      return (
        <VanillaSlideModal.DefaultLayout direction={direction}>
          <VanillaSlideModal.Header>
            <VanillaSlideModal.Title id={`${MODAL_ID}-title`}>
              Settings Panel
            </VanillaSlideModal.Title>
          </VanillaSlideModal.Header>
          <VanillaSlideModal.Content>
            <Shared.Section title="General">
              <Shared.Message>This is a vanilla slide panel example.</Shared.Message>
              <Shared.Detail>
                Built with HTML and CSS modules, no UI framework required.
              </Shared.Detail>
            </Shared.Section>

            <Shared.Section title="Notifications">
              <VanillaSlideModal.SectionGroup>
                <VanillaSlideModal.CheckboxLabel>
                  <input type="checkbox" defaultChecked />
                  <Shared.Detail>Enable email notifications</Shared.Detail>
                </VanillaSlideModal.CheckboxLabel>
                <VanillaSlideModal.CheckboxLabel>
                  <input type="checkbox" />
                  <Shared.Detail>Enable push notifications</Shared.Detail>
                </VanillaSlideModal.CheckboxLabel>
                <VanillaSlideModal.CheckboxLabel>
                  <input type="checkbox" />
                  <Shared.Detail>Enable SMS notifications</Shared.Detail>
                </VanillaSlideModal.CheckboxLabel>
              </VanillaSlideModal.SectionGroup>
            </Shared.Section>

            <Shared.Section title="Appearance">
              <VanillaSlideModal.SectionGroup>
                <VanillaSlideModal.CheckboxLabel>
                  <input type="checkbox" />
                  <Shared.Detail>Dark mode</Shared.Detail>
                </VanillaSlideModal.CheckboxLabel>
                <VanillaSlideModal.CheckboxLabel>
                  <input type="checkbox" defaultChecked />
                  <Shared.Detail>Compact layout</Shared.Detail>
                </VanillaSlideModal.CheckboxLabel>
              </VanillaSlideModal.SectionGroup>
            </Shared.Section>
          </VanillaSlideModal.Content>
          <VanillaSlideModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button variant="primary" {...action('save')}>
              Save Changes
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
          const [, closeResult] = await panel.openAndWait();
          resultStore.setResult(`Panel closed with reason: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Vanilla Panel
      </Button>
    </ExampleLayout>
  );
}
