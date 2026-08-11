import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { Checkbox, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Key, useMessageModal, useSlideModal } from 'umbra/react';

export const LIST_ID = 'grocery-list';

type Item = { readonly id: string; readonly name: string; readonly aisle: string };

const ITEMS: readonly Item[] = [
  { id: 'i1', name: 'Milk', aisle: 'Dairy' },
  { id: 'i2', name: 'Bread', aisle: 'Bakery' },
  { id: 'i3', name: 'Apples', aisle: 'Produce' },
  { id: 'i4', name: 'Coffee', aisle: 'Pantry' },
];

/**
 * One flow, end to end: a panel that edits something, a confirm raised from inside it, an async
 * action that can fail, and a typed payload coming back out.
 *
 * A plain shopping list on purpose. The subject is the modal — every noun a reader has to learn
 * first is a noun standing between them and it.
 *
 * The confirm is opened from *inside* the panel's render, which is not a style choice: the panel
 * is non-modal here, but a modal dialog swallows every click outside itself, so a trigger
 * that must work while a modal is open has to live in that modal's tree. The confirm's `<dialog>`
 * therefore nests inside the panel's, and both keep their own Escape and their own hotkey.
 */
export function GroceryListExample() {
  const [checked, setChecked] = useState<readonly string[]>([]);
  const [outcome, setOutcome] = useState<string | null>(null);

  const toggle = (id: string) => {
    setChecked((current) => {
      return current.includes(id)
        ? current.filter((x) => {
            return x !== id;
          })
        : [...current, id];
    });
  };

  // The confirm: it closes with the number of items it sent, and the panel reads that back.
  const confirm = useMessageModal<number, 'cancel' | 'send'>({
    id: 'grocery-confirm',
    ariaLabelledBy: 'grocery-confirm-title',
    render: ({ action, error }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type="warning" sx={{ mb: 0 }} />
            <Typography id="grocery-confirm-title" variant="h6">
              Send the list?
            </Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>
              {checked.length} item{checked.length === 1 ? '' : 's'} will be sent to the store.
            </Shared.Message>
            {error ? (
              <Shared.AlertContent severity="error">{error.message}</Shared.AlertContent>
            ) : null}
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel', { focusOnOpen: true })}>
              Keep editing
            </Shared.Button>
            <Shared.Button
              variant="contained"
              {...action('send', {
                hotkey: Key.Enter,
                onAction: async (close) => {
                  // Fails about a third of the time: the panel underneath must survive that,
                  // and the error has to land somewhere a reader can see.
                  await simulateApiCall('Send list', 900);
                  close(checked.length);
                },
              })}
            >
              Send
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const list = useSlideModal<number, 'close' | 'sent'>({
    id: LIST_ID,
    direction: 'right',
    // Was `ariaLabel: 'Grocery list'`, next to a heading reading "Grocery list" — the name written
    // twice, which is the drift the option's own doc warns about. One of them is now the other.
    ariaLabelledBy: `${LIST_ID}-title`,
    render: ({ direction, action, handle }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title id={`${LIST_ID}-title`}>Grocery list</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <Stack sx={{ gap: 0.5 }}>
              {ITEMS.map((item) => {
                return (
                  <Stack key={item.id} direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    <Checkbox
                      size="small"
                      checked={checked.includes(item.id)}
                      onChange={() => {
                        toggle(item.id);
                      }}
                      slotProps={{ input: { 'aria-label': item.name } }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {item.name}
                    </Typography>
                    <Chip size="small" label={item.aisle} />
                  </Stack>
                );
              })}
            </Stack>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="outlined" {...action('close')}>
              Close
            </Shared.Button>
            {/* Inside the panel's render — which is what keeps it clickable once the confirm
                is open, and what nests the two dialogs. */}
            <Shared.Button
              variant="contained"
              disabled={checked.length === 0}
              onClick={async () => {
                const [, result] = await confirm.openAndWait();
                if (result?.reason === 'send') {
                  handle.close('sent', result.data);
                }
              }}
            >
              Send…
            </Shared.Button>
            {confirm.Modal}
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
    onClose: (result) => {
      setOutcome(
        result.reason === 'sent'
          ? `Sent ${String(result.data ?? 0)} items`
          : `List closed: ${result.reason}`
      );
    },
  });

  return (
    <ExampleLayout result={outcome} modals={list.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          setOutcome(null);
          setChecked([]);
          await list.open();
        }}
      >
        Open the list
      </Shared.Button>
      <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
        panel → confirm → async send → typed payload back
      </Typography>
    </ExampleLayout>
  );
}
