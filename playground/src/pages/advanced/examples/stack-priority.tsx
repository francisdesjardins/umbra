import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { Chip, FormControlLabel, Stack, Switch } from '@mui/material';
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
 * The stack order as a policy rather than a race — with the race reproduced first.
 *
 * A dialog's place in the stack is the order its `showModal()` landed in, and in an app assembled
 * from independent features nobody schedules that order: the session warning is on a timer, the
 * panel is on a deep link, and neither knows the other exists. Lose the race and the warning is
 * *behind* the panel — under its backdrop, inert, dimmed — while the user carries on with exactly
 * the thing the app was trying to interrupt.
 *
 * Run it with the switch off to see that, then turn the switch on **while both are open**: the
 * warning comes to the front, the panel stays where it was, and nothing closed. A policy applies to
 * what is already on screen, not only to the next open.
 *
 * The switch is repeated inside both dialogs because it has to be — a modal dialog is in the top
 * layer and swallows every click outside itself, so the only reachable control is one inside the
 * dialog that is currently in front. Which is the problem being demonstrated.
 */
const prioritizeAlerts: StackPriority = (modal) => {
  // Higher is nearer the user, and a tie keeps open order — so a policy only says where it
  // disagrees with "whoever opened last wins".
  //
  // A real project keys this on `modal.template`, because the rule is about *kinds* of dialog and
  // then covers every alert added later. Scoped to one id here for a boring reason: the playground
  // shares one manager with every other example on the page, and a demo should not quietly reorder
  // the cards below it.
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
            <Stack sx={{ gap: 2, alignItems: 'flex-start' }}>
              <Shared.Message>
                This panel opened last, so the platform paints it in front — the warning is under
                its backdrop right now. Turn the policy on and the warning comes back, without this
                panel closing.
              </Shared.Message>
              <PolicySwitch enabled={enabled} onChange={setEnabled} />
              <Shared.Hint>
                Moving a modal dialog means closing and re-showing it: the top layer paints in the
                order elements were added and ignores z-index between them entirely.
              </Shared.Hint>
            </Stack>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="outlined" {...action('close', { hotkey: Key.Escape })}>
              Close panel
            </Shared.Button>
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
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <MessageModal.Icon type="warning" sx={{ mb: 0 }} />
              <MessageModal.Title id={`${WARNING_ID}-title`}>
                Your session expires in 2 minutes
              </MessageModal.Title>
            </Stack>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message id={`${WARNING_ID}-body`}>
              Now let something else raise a panel, the way a deep link would. With the policy off
              it lands on top of this warning and you lose it.
            </Shared.Message>
            <Stack sx={{ mt: 2, gap: 1, alignItems: 'flex-start' }}>
              <Shared.Button
                variant="outlined"
                onClick={() => {
                  // `open(id)` rather than `panel.open()`: the point is that the panel is raised by
                  // code which knows nothing about this dialog, which is the door a router guard or
                  // another feature would use.
                  dialogManager.open(PANEL_ID);
                }}
              >
                A deep link opens a panel
              </Shared.Button>
              <PolicySwitch enabled={enabled} onChange={setEnabled} />
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button
              variant="contained"
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
    // One rule for the whole manager, installed in one place. The disposer restores plain open
    // order — and reorders what is on screen to match, which is what makes the switch work both
    // ways rather than only on the way in.
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
        <Shared.Button
          variant="contained"
          size="small"
          onClick={async () => {
            await warning.open();
          }}
        >
          Session warning fires
        </Shared.Button>
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
