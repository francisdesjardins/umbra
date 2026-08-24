import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import { createOpenRequest, dialogManager, useMessageModal } from 'umbra/react';
import type { PayloadOf } from 'umbra/react';

const MODAL_ID = 'print-job';

/** Exported because the registry names it — a payload type becomes part of the app's vocabulary. */
export type PrintJob = { readonly copies: number; readonly colour: boolean };

/**
 * The other half of the registry: what a modal is *opened* with.
 *
 * `data` is what a modal closes with and `payload` is what it opens with, and `PayloadOf` reads the
 * second the way `DataOf` reads the first. The card beside this one — "an open the dialog may
 * refuse" — is the same door with the opposite trust: its payload is typed into a textarea, so it
 * arrives `unknown` and is parsed. This one is asked and answered inside the project, so the
 * compiler checks the ask.
 *
 * **The handler still receives `unknown`, deliberately.** `requestOpen` is the door a microfrontend
 * or a `postMessage` relay comes through, and those callers are not compiled here. What the
 * declaration buys the receiving side is a name to parse *to* — `PayloadOf<'print-job'>` below.
 */
function parsePrintJob(payload: unknown): PayloadOf<'print-job'> | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const { copies, colour } = payload as { copies?: unknown; colour?: unknown };
  if (typeof copies !== 'number' || typeof colour !== 'boolean') {
    return null;
  }
  return { copies, colour };
}

export function DeclaredPayloadExample() {
  const [copies, setCopies] = useState(2);
  const [colour, setColour] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [asked, setAsked] = useState<PayloadOf<'print-job'> | null>(null);

  const modal = useMessageModal({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    onOpenRequest: (payload) => {
      // `unknown` in, parsed to the declared shape. A refusal would be `request.refuse(reason)`.
      setAsked(parsePrintJob(payload));
      void modal.open();
    },
    onClose: (closed) => {
      setResult(closed.reason === 'print' ? 'sent to the printer' : `closed: ${closed.reason}`);
    },
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="info" />
            <MessageModal.Title id={`${MODAL_ID}-title`}>Confirm the print job</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>
              {asked === null
                ? 'Nothing parsed from the request.'
                : `${String(asked.copies)} ${asked.copies === 1 ? 'copy' : 'copies'}, ${asked.colour ? 'colour' : 'greyscale'}.`}
            </Shared.Message>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button {...action('print')} variant="primary">
              Print
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <AppButton
        onClick={() => {
          setCopies((n) => {
            return n === 5 ? 1 : n + 1;
          });
        }}
        variant="outlined"
      >
        Copies: {copies}
      </AppButton>
      <AppButton
        onClick={() => {
          setColour((on) => {
            return !on;
          });
        }}
        variant="outlined"
      >
        {colour ? 'Colour' : 'Greyscale'}
      </AppButton>
      <AppButton
        onClick={() => {
          // Checked against the contract: `{ copies: '2' }` or a stray key is a compile error here,
          // and no type argument is written anywhere — the id is what carries the shape.
          dialogManager.requestOpen(MODAL_ID, createOpenRequest({ copies, colour }));
        }}
      >
        Ask to print
      </AppButton>
    </ExampleLayout>
  );
}
