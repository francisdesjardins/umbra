import { useEffect, useState } from 'react';
import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageDialog, type DialogHandle } from 'umbra/react';

const DIALOG_ID = 'gamepad-panel';

/** What the adapter reports each frame, so the page can show what a press did. */
type Press = 'east' | 'south' | 'up' | 'down';

/**
 * The standard-mapping indices this demo reads.
 *
 * Named by **position**, which is the API's own vocabulary and not pedantry: index 0 is the bottom
 * button of the right cluster — A on Xbox, Cross on PlayStation, and **B on Nintendo**, where the
 * letters are swapped. A constant called `A` would be wrong on a controller in the room.
 */
const BUTTON = { east: 1, south: 0, up: 12, down: 13 } as const;

/** What each one is called on the pad in your hands, for the legend below. */
const LABEL: Record<Press, string> = {
  down: 'D-pad down',
  east: 'East — B / Circle',
  south: 'South — A / Cross',
  up: 'D-pad up',
};

/**
 * Poll the Gamepad API and report edges.
 *
 * Polling rather than listening because the API ships no button events, and edges rather than
 * levels because a held button is re-read every frame — one press would otherwise close every
 * dialog on the stack. Runs only while the dialog is open, so no route pays for a loop it is not
 * using.
 */
function useGamepadEdges(active: boolean, onPress: (press: Press) => void) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let frame = 0;
    let held = new Set<Press>();

    const poll = () => {
      const pad = navigator.getGamepads().find((candidate) => {
        return candidate !== null;
      });
      const down = new Set<Press>();
      if (pad) {
        for (const [name, index] of Object.entries(BUTTON)) {
          if (pad.buttons[index]?.pressed === true) {
            down.add(name as Press);
          }
        }
      }
      for (const press of down) {
        if (!held.has(press)) {
          onPress(press);
        }
      }
      held = down;
      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [active, onPress]);
}

/** What a page-level adapter can find with no help from the library — the readout compares it. */
const reachableFromOutside = (dialog: HTMLElement): HTMLElement[] => {
  return [...dialog.querySelectorAll<HTMLElement>('[data-action-reason]')];
};

export function GamepadExample() {
  const [pad, setPad] = useState<string | null>(null);
  const [last, setLast] = useState<string>('—');
  const [reach, setReach] = useState<string>('—');
  const [result, setResult] = useState<string | null>(null);

  // Reasons declared, so `onClose` narrows and a controller closing through `handle.close` is
  // reported by the same door a button press comes through — which is the claim worth showing.
  const dialog = useMessageDialog<void, 'cancel' | 'confirm'>({
    id: DIALOG_ID,
    ariaLabelledBy: `${DIALOG_ID}-title`,
    onClose: (closeResult) => {
      setResult(`Closed: ${closeResult.reason}`);
    },
    render: ({ action, handle }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Title id={`${DIALOG_ID}-title`}>Controller input</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.OverflowContainer style={{ maxHeight: '9vh' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
                <Shared.Message>
                  East closes, South activates whatever holds the keyboard, and the d-pad walks the
                  controls. The close goes through `handle.close`, so it is the same path the
                  buttons take.
                </Shared.Message>
                <Shared.Message>
                  This region scrolls, so it carries a Tab stop of its own — one of the controls a
                  page-level adapter cannot see.
                </Shared.Message>
                <input aria-label="Notes" data-testid="gamepad-input" />
              </div>
            </Shared.OverflowContainer>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button variant="primary" {...action('confirm', { focusOnOpen: true })}>
              Confirm
            </Shared.Button>
          </MessageDialog.Footer>
          <GamepadDriver handle={handle} onPress={setLast} onReach={setReach} />
        </MessageDialog.DefaultLayout>
      );
    },
  });

  useEffect(() => {
    const read = () => {
      const found = navigator.getGamepads().find((candidate) => {
        return candidate !== null;
      });
      setPad(found?.id ?? null);
    };
    read();
    window.addEventListener('gamepadconnected', read);
    window.addEventListener('gamepaddisconnected', read);
    return () => {
      window.removeEventListener('gamepadconnected', read);
      window.removeEventListener('gamepaddisconnected', read);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
      <div data-testid="gamepad-status">
        {pad === null
          ? 'No controller detected — connect one and press a button.'
          : `Reading: ${pad}`}
      </div>
      <div data-testid="gamepad-legend">
        {Object.values(LABEL).join(' · ')} — South clicks whatever holds the keyboard, so the
        dialog&apos;s own actions close it with their own reason.
      </div>
      <div data-testid="gamepad-last">Last press: {last}</div>
      <div data-testid="gamepad-reason">Close reason: {result ?? '—'}</div>
      <div data-testid="gamepad-reach">Controls an outside adapter can reach: {reach}</div>

      <ExampleLayout dialogs={dialog.Dialog} result={result}>
        <AppButton
          variant="contained"
          size="small"
          onClick={() => {
            return void dialog.open();
          }}
        >
          Open
        </AppButton>
      </ExampleLayout>
    </div>
  );
}

/** Rendered inside the dialog, so the adapter starts and stops with the content it drives. */
function GamepadDriver({
  handle,
  onPress,
  onReach,
}: {
  readonly handle: DialogHandle<void, 'cancel' | 'confirm'>;
  readonly onPress: (press: string) => void;
  readonly onReach: (reach: string) => void;
}) {
  // No deps, so the count re-reads after the scroll region measures itself and grants its Tab
  // stop — a render later. Writing the same string back is a bail-out, not a loop.
  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>(`dialog[data-dialog-id="${DIALOG_ID}"]`);
    const found = dialog ? reachableFromOutside(dialog) : [];
    const focusable = dialog
      ? [...dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])')]
      : [];
    onReach(`${String(found.length)} of ${String(focusable.length)}`);
  });

  useGamepadEdges(true, (press) => {
    onPress(press);
    if (press === 'east') {
      handle.close('cancel');
      return;
    }
    if (press === 'south' && document.activeElement instanceof HTMLElement) {
      document.activeElement.click();
      return;
    }
    // The d-pad, and the one thing the adapter cannot write itself: a synthetic `Tab` moves no
    // focus, and a hand-rolled scan reaches only the two buttons the count above compares against.
    handle.moveFocus(press === 'down' ? 'forwards' : 'backwards');
  });

  return null;
}
