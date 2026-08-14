import { ExampleLayout } from '@/entities/example';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { dialogManager, reconcileOpen, useLookup, useSlideModal } from 'umbra/react';

export const PANEL_ID = 'controlled-filters';

const resultStore = createResultStore();

/**
 * A dialog whose `open` is a prop — the shape most component-library call sites take.
 *
 * The switch is the only truth on this card. Everything else *asks* it, and that is the whole
 * pattern: a controlled dialog cannot close itself, because the boolean above it would still be
 * `true` and the next render would put it straight back. What the user would see is a panel that
 * blinks.
 *
 * Two library pieces make it, and neither is much code — which is the point, since both are
 * written by hand in every wrapper that does not know they exist.
 *
 * **`onDismissRequest` turns the dismiss key into a report.** Every gate above it is unchanged
 * and still the library's: which key, whether an action claimed it, whether a `prepare` or a
 * running action forbids it, and — here, because the panel is non-modal — which dialog is
 * actually in front. Only the last step moves, from `close()` to a call to the owner. Written by
 * hand it is written three times and differently: a modal dialog hears Escape through its own
 * `keydown` and through the native `cancel`, and a non-modal panel hears it through neither, since
 * it is outside the top layer and the press is routinely made somewhere else on the page. Try it —
 * focus the switch, press Escape, and the panel still hears it.
 *
 * It can also **decline**, by returning `false`: the non-modal listener captures at the window, so
 * a press it takes is a press the page never sees, and an owner that decided not to act must not
 * cost the page its keyboard. Nothing here declines, because the interesting case is a condition
 * only a real application knows — another framework's modal sitting on top.
 *
 * **`reconcileOpen` puts the dialog back where the prop says it belongs.** Reconciled on every
 * pass rather than reacted to, which is what makes the prop *authoritative*: press "Open it from
 * outside" and the panel is closed again, because `dialogManager.open()` is an instruction and the
 * switch did not agree. It decides on `phase` and never on `isVisible` — the difference is a cut
 * animation, and the reasoning is on the function itself.
 *
 * **The Close button is an action that does not close.** `onAction` that never calls `close`
 * leaves the dialog exactly where it is; lowering the switch is what closes it. So the reason
 * every close carries is the owner's, which is why `onClose` below reports `'close'` and never
 * `'dismiss'` — the panel is never dismissed, it is always lowered.
 *
 * **Non-modal is a requirement, not a preference.** `showModal()` puts a dialog in the top layer
 * and the native backdrop blocks every click outside it, so the switch that drives this one would
 * be unreachable while it is open. A controlled surface whose control sits outside the dialog is
 * exactly the case that has to be non-modal.
 */
export function ControlledPanelExample() {
  const { result } = useStore(resultStore);
  /** The owner's state. In a real wrapper this is a prop, and this component is `<Filters open>`. */
  const [open, setOpen] = useState(false);

  const modal = useSlideModal<void, 'close'>({
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
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title id={`${PANEL_ID}-title`}>Filters</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <Stack sx={{ gap: 1.5, p: 2, minWidth: 0 }}>
              <Shared.Message>
                Escape, the button below, and the switch on the card all end in the same place: the
                owner&apos;s state.
              </Shared.Message>
              <Typography variant="body2" color="text.secondary">
                Nothing in here calls <code>close()</code>.
              </Typography>
            </Stack>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button
              variant="contained"
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
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(
        `Closed with reason: ${closeResult.reason} — the owner's, never the dialog's`
      );
    },
  });

  const { phase } = useLookup(PANEL_ID);

  // The reconciliation, and the whole of it. `modal` is a fresh object every render, so this runs
  // on every pass — which is what "reconciled, not reacted to" means and is free: `reconcileOpen`
  // answers `'none'` unless the prop and the phase actually disagree.
  useEffect(() => {
    const next = reconcileOpen(phase, open);
    if (next === 'open') {
      void modal.open();
    } else if (next === 'close') {
      modal.handle.close('close');
    }
  }, [phase, open, modal]);

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <FormControlLabel
        control={
          <Switch
            checked={open}
            onChange={(event) => {
              setOpen(event.target.checked);
              resultStore.setResult(
                event.target.checked ? 'The owner opened it' : 'The owner closed it'
              );
            }}
          />
        }
        label="Filters open"
      />
      <Shared.Button
        variant="outlined"
        size="small"
        onClick={() => {
          dialogManager.open(PANEL_ID);
          resultStore.setResult(
            'An instruction from outside — the reconciliation puts it back, because the switch says closed'
          );
        }}
      >
        Open it from outside
      </Shared.Button>
    </ExampleLayout>
  );
}
