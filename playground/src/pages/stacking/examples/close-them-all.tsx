import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import { dialogManager, useMessageDialog } from 'umbra/react';

const PANELS = [
  { id: 'bulk-first', label: 'Unsaved draft' },
  { id: 'bulk-second', label: 'Share settings' },
  { id: 'bulk-third', label: 'Session expiring' },
] as const;

/**
 * Closing every open dialog at once — a route change, a sign-out, a workspace switch.
 *
 * **The library ships no `closeAll()`**, and this is why: it is the loop below, over a lookup the
 * manager already exposes, and every caller wants a different filter — all of them, all but the one
 * that asked, only the non-modal ones. Shipping one shape would be guessing which.
 *
 * `getOpen()` answers in stack order and hands back a snapshot rather than a live view, so closing
 * while iterating it is safe. Nothing here waits for an exit: a route change should not be gated on
 * three animations.
 */
function closeEveryOpenDialog(except?: string): number {
  const leaving = dialogManager
    .lookup()
    .getOpen()
    .filter((dialog) => {
      return dialog.id !== except;
    });

  for (const dialog of leaving) {
    dialogManager.close(dialog.id, 'dismiss');
  }
  return leaving.length;
}

export function CloseThemAllExample() {
  const [result, setResult] = useState<string | null>(null);

  // The controls that matter live *inside* the dialogs: three modal dialogs are in the top layer,
  // so the page underneath is inert and a "close them all" button on this card could not be
  // pressed. Whichever panel is in front is the one a user can reach.
  const panels = [
    usePanel(PANELS[0], setResult),
    usePanel(PANELS[1], setResult),
    usePanel(PANELS[2], setResult),
  ] as const;

  return (
    <ExampleLayout
      result={result}
      dialogs={
        <>
          {panels[0].Dialog}
          {panels[1].Dialog}
          {panels[2].Dialog}
        </>
      }
    >
      <AppButton
        onClick={() => {
          for (const panel of PANELS) {
            dialogManager.open(panel.id);
          }
          setResult('three open — the front one carries the controls');
        }}
      >
        Open three
      </AppButton>
    </ExampleLayout>
  );
}

/** Three dialogs differing only in their name, so the loop is the subject rather than the content. */
function usePanel(panel: (typeof PANELS)[number], setResult: (value: string) => void) {
  const { id, label } = panel;
  return useMessageDialog({
    id,
    ariaLabelledBy: `${id}-title`,
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant="info" />
            <MessageDialog.Title id={`${id}-title`}>{label}</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.Message>
              Three dialogs are up. Closing them one at a time is what a user does; closing them
              together is what a route change does.
            </Shared.Message>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button {...action('close')}>Close this one</Shared.Button>
            <Shared.Button
              {...action('close-others', () => {
                const closed = closeEveryOpenDialog(id);
                setResult(`closed ${String(closed)}, kept the one that asked`);
              })}
            >
              Close the others
            </Shared.Button>
            <Shared.Button
              {...action('close-all', () => {
                const closed = closeEveryOpenDialog();
                setResult(`closed ${String(closed)}`);
              })}
              variant="primary"
            >
              Close them all
            </Shared.Button>
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
  });
}
