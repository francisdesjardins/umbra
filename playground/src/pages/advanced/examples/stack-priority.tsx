import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import * as SlideModal from '@/entities/modal-template/ui/vanilla/slide-modal';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import { useEffect, useState } from 'react';
import {
  Key,
  useDialogManager,
  useMessageModal,
  useSlideModal,
  type StackPriority,
} from 'umbra/react';

export const WARNING_ID = 'stack-priority-warning';
const PANEL_ID = 'stack-priority-panel';

/**
 * The stack order as a policy rather than a race, with the race reproduced first. Position is the
 * order `showModal()` landed in, unscheduled across independent features (a timer, a deep link), so
 * losing leaves the warning inert behind the panel's backdrop; the switch raises it **while both
 * are open**, closing nothing. It is repeated inside both dialogs because a modal swallows clicks.
 */
const prioritizeAlerts: StackPriority = (modal) => {
  // Higher is nearer the user and ties keep open order. A real project keys this on
  // `modal.template`; scoped to one id here because the playground shares one manager.
  return modal.id === WARNING_ID ? 100 : 0;
};

function PolicySwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={enabled}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
        />
      }
      label="Priority policy"
    />
  );
}

/** The same control for the dialog interiors, on plain markup — the card keeps the MUI switch. */
function DialogPolicySwitch({
  enabled,
  onChange,
}: {
  readonly enabled: boolean;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontSize: 'var(--font-size-sm)',
      }}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        style={{
          width: 18,
          height: 18,
          margin: 0,
          flexShrink: 0,
          accentColor: 'var(--color-primary)',
        }}
      />
      Priority policy
    </label>
  );
}

export function StackPriorityExample() {
  const [enabled, setEnabled] = useState(false);
  const { openDialogs, foreground } = useDialogManager();

  const panel = useSlideModal<void, 'close'>({
    id: PANEL_ID,
    direction: 'right',
    ariaLabelledBy: `${PANEL_ID}-title`,
    style: { width: 380 },
    render: ({ direction, action }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title id={`${PANEL_ID}-title`}>Order #4812</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <Shared.Message>
                This panel opened last, so the platform paints it in front — the warning is under
                its backdrop right now. Turn the policy on and the warning comes back, without this
                panel closing.
              </Shared.Message>
              <DialogPolicySwitch enabled={enabled} onChange={setEnabled} />
              <Shared.Hint>
                Moving a modal dialog means closing and re-showing it: the top layer paints in the
                order elements were added and ignores z-index between them entirely.
              </Shared.Hint>
            </div>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button {...action('close', { hotkey: Key.Escape })}>Close panel</Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
  });

  // The context-aware instance, not the static singleton — every hook here returns the same one.
  const { dialogManager } = panel;

  const warning = useMessageModal<void, 'acknowledge'>({
    id: WARNING_ID,
    ariaLabelledBy: `${WARNING_ID}-title`,
    ariaDescribedBy: `${WARNING_ID}-body`,
    // It interrupts, and the description travels with the role.
    role: 'alertdialog',
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="warning" />
            <MessageModal.Title id={`${WARNING_ID}-title`}>
              Your session expires in 2 minutes
            </MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message id={`${WARNING_ID}-body`}>
              Now let something else raise a panel, the way a deep link would. With the policy off
              it lands on top of this warning and you lose it.
            </Shared.Message>
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <Shared.Button
                onClick={() => {
                  // `open(id)`, not `panel.open()` — the door a router guard would use.
                  dialogManager.open(PANEL_ID);
                }}
              >
                A deep link opens a panel
              </Shared.Button>
              <DialogPolicySwitch enabled={enabled} onChange={setEnabled} />
            </div>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button
              variant="primary"
              {...action('acknowledge', { focusOnOpen: true, hotkey: Key.Enter })}
            >
              Extend my session
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    // The disposer restores open order and reorders what is on screen, so the switch works both ways.
    return dialogManager.prioritize(prioritizeAlerts);
  }, [enabled, dialogManager]);

  const shortName = (id: string) => {
    return id.replace('stack-priority-', '');
  };
  const mine = openDialogs.filter((dialog) => {
    return dialog.id === WARNING_ID || dialog.id === PANEL_ID;
  });

  return (
    <ExampleLayout
      result={
        mine.length > 0
          ? `bottom → top: ${mine
              .map((dialog) => {
                return shortName(dialog.id);
              })
              .join(' → ')}`
          : null
      }
      modals={
        <>
          {warning.Modal}
          {panel.Modal}
        </>
      }
    >
      <Stack sx={{ gap: 1.5, alignItems: 'flex-start' }}>
        <Button
          variant="contained"
          size="small"
          onClick={async () => {
            await warning.open();
          }}
        >
          Session warning fires
        </Button>
        <PolicySwitch enabled={enabled} onChange={setEnabled} />
        <Chip
          size="small"
          color={foreground?.id === WARNING_ID ? 'success' : 'default'}
          label={`in front: ${foreground ? shortName(foreground.id) : 'nothing open'}`}
        />
      </Stack>
    </ExampleLayout>
  );
}
