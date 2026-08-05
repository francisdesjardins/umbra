import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Checkbox, FormControlLabel, Stack } from '@mui/material';
import { defineAction, useModalActions, useSlideModal, useStore } from 'umbra/react';

export const MODAL_ID = 'mui-slide-example';

const resultStore = createResultStore();

export function MuiSlideExample() {
  const { result } = useStore(resultStore);

  const actions = useModalActions({
    cancel: defineAction(),
    save: defineAction(),
  });

  const panel = useSlideModal({
    id: MODAL_ID,
    direction: 'right',
    actions,
    render: ({ direction }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title>Settings Panel</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <Stack spacing={3}>
              <Shared.Section title="General">
                <Shared.Message>This is a Material UI slide panel example.</Shared.Message>
                <Shared.Detail>
                  Built with Material UI components for a polished look and feel.
                </Shared.Detail>
              </Shared.Section>

              <Shared.Section title="Notifications">
                <Stack>
                  <FormControlLabel
                    control={<Checkbox defaultChecked size="small" />}
                    label="Enable email notifications"
                  />
                  <FormControlLabel
                    control={<Checkbox size="small" />}
                    label="Enable push notifications"
                  />
                  <FormControlLabel
                    control={<Checkbox size="small" />}
                    label="Enable SMS notifications"
                  />
                </Stack>
              </Shared.Section>

              <Shared.Section title="Appearance">
                <Stack>
                  <FormControlLabel control={<Checkbox size="small" />} label="Dark mode" />
                  <FormControlLabel
                    control={<Checkbox defaultChecked size="small" />}
                    label="Compact layout"
                  />
                </Stack>
              </Shared.Section>
            </Stack>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="outlined" {...actions.cancel()}>
              Cancel
            </Shared.Button>
            <Shared.Button variant="contained" {...actions.save()}>
              Save Changes
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Panel closed with reason: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={panel.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          void panel.open();
          const [, closeResult] = await panel.waitForClose();
          resultStore.setResult(`Panel closed with reason: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open MUI Panel
      </Shared.Button>
    </ExampleLayout>
  );
}
