import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import * as SlideModal from '@/entities/modal-template/ui/vanilla/slide-modal';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { AppButton } from '@/shared/ui/AppButton';
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
 * One flow end to end: a panel that edits, a confirm inside it, an async action that can fail, a
 * typed payload back out, over a shopping list kept boring so no domain noun is in the way. The
 * confirm opens from the panel's render because a modal swallows outside clicks; the nested
 * `<dialog>`s each keep their own Escape and hotkey.
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
  const confirm = useMessageModal({
    id: 'grocery-confirm',
    ariaLabelledBy: 'grocery-confirm-title',
    render: ({ action, error }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="warning" />
            <MessageModal.Title id="grocery-confirm-title">Send the list?</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>
              {checked.length} item{checked.length === 1 ? '' : 's'} will be sent to the store.
            </Shared.Message>
            {error ? <Shared.Alert severity="error">{error.message}</Shared.Alert> : null}
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('cancel', { focusOnOpen: true })}>Keep editing</Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('send', {
                hotkey: Key.Enter,
                onAction: async (close) => {
                  // Fails about a third of the time, so the panel underneath must survive it.
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

  const list = useSlideModal({
    id: LIST_ID,
    direction: 'right',
    // Point at the heading rather than repeat its text in `ariaLabel` — the drift its doc warns of.
    ariaLabelledBy: `${LIST_ID}-title`,
    render: ({ direction, action, handle }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title id={`${LIST_ID}-title`}>Grocery list</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ITEMS.map((item) => {
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* The wrapping label names the checkbox, so no `aria-label` is repeated. */}
                    <SlideModal.CheckboxLabel>
                      <input
                        type="checkbox"
                        checked={checked.includes(item.id)}
                        onChange={() => {
                          toggle(item.id);
                        }}
                      />
                      <Shared.Detail>{item.name}</Shared.Detail>
                    </SlideModal.CheckboxLabel>
                    <span
                      style={{
                        marginLeft: 'auto',
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--slide-border)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--modal-text-secondary)',
                      }}
                    >
                      {item.aisle}
                    </span>
                  </div>
                );
              })}
            </div>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button {...action('close')}>Close</Shared.Button>
            {/* Inside the panel's render: what keeps it clickable once the confirm is open. */}
            <Shared.Button
              variant="primary"
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
          ? `Sent ${String(result.data)} items`
          : `List closed: ${result.reason}`
      );
    },
  });

  return (
    <ExampleLayout result={outcome} modals={list.Modal}>
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          setOutcome(null);
          setChecked([]);
          await list.open();
        }}
      >
        Open the list
      </AppButton>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--app-text-md)',
          lineHeight: 1.43,
          color: 'var(--app-text-secondary)',
          alignSelf: 'center',
        }}
      >
        panel → confirm → async send → typed payload back
      </p>
    </ExampleLayout>
  );
}
