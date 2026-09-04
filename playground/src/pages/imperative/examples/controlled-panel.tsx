import { ExampleLayout } from '@/entities/example';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import * as SlideDialog from '@/entities/dialog-template/ui/vanilla/slide-dialog';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import { AppButton } from '@/shared/ui/AppButton';
import { useEffect, useState } from 'react';
import { dialogManager, reconcileOpen, useLookup, useSlideDialog } from 'umbra/react';

export const PANEL_ID = 'controlled-filters';

const resultStore = createResultStore();

/**
 * A dialog whose `open` is a prop — the component-library shape. It cannot close itself: the
 * boolean above it is still `true`, so the next render puts it back.
 *
 * - `onDismissRequest` reports the dismiss key instead of closing, leaving every gate above it the
 *   library's. By hand it is three implementations: a modal dialog hears Escape through its own
 *   `keydown` and the native `cancel`, a non-modal panel through neither. Returning `false`
 *   declines.
 * - `reconcileOpen` runs every pass rather than reacting, and decides on `phase` not `isVisible` —
 *   the difference is a cut animation.
 * - An action whose `onAction` never calls `close` leaves the dialog open, so `onClose` reports the
 *   owner's `'close'`. Non-modal is required: the top layer would block the switch.
 */
export function ControlledPanelExample() {
  const { result } = useStore(resultStore);
  /** The owner's state. In a real wrapper this is a prop, and this component is `<Filters open>`. */
  const [open, setOpen] = useState(false);

  const dialog = useSlideDialog({
    id: PANEL_ID,
    direction: 'right',
    nonModal: true,
    portal: true,
    ariaLabelledBy: `${PANEL_ID}-title`,
    onDismissRequest: () => {
      // Report, do not close. The switch going down is what closes it, one reconciliation later.
      setOpen(false);
      resultStore.setResult(
        'Escape reported to the owner — the switch went down, and the panel followed'
      );
    },
    render: ({ direction, action }) => {
      return (
        <SlideDialog.DefaultLayout direction={direction}>
          <SlideDialog.Header>
            <SlideDialog.Title id={`${PANEL_ID}-title`}>Filters</SlideDialog.Title>
          </SlideDialog.Header>
          <SlideDialog.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
              <Shared.Message>
                Escape, the button below, and the switch on the card all end in the same place: the
                owner&apos;s state.
              </Shared.Message>
              <Shared.Detail>
                Nothing in here calls <code>close()</code>.
              </Shared.Detail>
            </div>
          </SlideDialog.Content>
          <SlideDialog.Footer>
            <Shared.Button
              variant="primary"
              {...action('close', {
                // No `close` call, so the action settles and the dialog stays. The owner decides.
                onAction: () => {
                  setOpen(false);
                  resultStore.setResult('The action asked the owner too — same door as Escape');
                },
              })}
            >
              Close
            </Shared.Button>
          </SlideDialog.Footer>
        </SlideDialog.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(
        `Closed with reason: ${closeResult.reason} — the owner's, never the dialog's`
      );
    },
  });

  const { phase } = useLookup(PANEL_ID);

  // `dialog` is fresh every render; `reconcileOpen` answers `'none'` unless prop and phase disagree.
  useEffect(() => {
    const next = reconcileOpen(phase, open);
    if (next === 'open') {
      void dialog.open();
    } else if (next === 'close') {
      dialog.handle.close('close');
    }
  }, [phase, open, dialog]);

  return (
    <ExampleLayout result={result} dialogs={dialog.Dialog}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--app-space-2)',
          cursor: 'pointer',
          minHeight: 24,
        }}
      >
        <input
          type="checkbox"
          checked={open}
          onChange={(event) => {
            setOpen(event.target.checked);
            resultStore.setResult(
              event.target.checked ? 'The owner opened it' : 'The owner closed it'
            );
          }}
          style={{ accentColor: 'var(--app-flame)' }}
        />
        Filters open
      </label>
      {/* Outlined on purpose: this is the wrong door, visually demoted next to the switch. */}
      <AppButton
        variant="contained"
        size="small"
        onClick={() => {
          dialogManager.open(PANEL_ID);
          resultStore.setResult(
            'An instruction from outside — the reconciliation puts it back, because the switch says closed'
          );
        }}
      >
        Open it from outside
      </AppButton>
    </ExampleLayout>
  );
}
