import { useState } from 'react';
import { useDialogManagerContext, useLookup, useModal, type OpenRequest } from '../../react.js';

/**
 * A dialog asked to open by code that does not own it.
 *
 * The two roles are deliberately kept apart on screen: the **owner** declares
 * `onOpenRequest` and decides, the **caller** only knows an id and a payload. That is the shape
 * across a microfrontend boundary, and it is the one the option exists for — a controlled dialog
 * whose `open` belongs to the component that renders it cannot be instructed without being
 * immediately put back, so it has to be asked instead.
 *
 * The owner validates. Here that is a deliberately petty schema — an object with a numeric `id` —
 * because the interesting case is the request it turns down, not the one it accepts.
 */
export function OpenRequestHarness() {
  const [accepted, setAccepted] = useState<number | null>(null);
  const [trail, setTrail] = useState<string[]>([]);
  const note = (what: string) => {
    setTrail((current) => {
      return [...current, what];
    });
  };

  const modal = useModal<void, 'ok'>({
    id: 'asked',
    onOpenRequest: ({ data, context }: OpenRequest) => {
      const from = context?.source ?? 'anonyme';
      if (
        typeof data !== 'object' ||
        data === null ||
        typeof (data as { id?: unknown }).id !== 'number'
      ) {
        note(`refusée (${from})`);
        return;
      }
      setAccepted((data as { id: number }).id);
      note(`acceptée (${from})`);
      void modal.open();
    },
    render: ({ action }) => {
      return (
        <div style={{ padding: '1rem', display: 'grid', gap: '.5rem' }}>
          <span data-testid="accepted">{accepted === null ? '—' : String(accepted)}</span>
          <button {...action('ok')} data-testid="close">
            Fermer
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <div data-testid="trail">{trail.join(' > ')}</div>
      <Caller />
      <button
        data-testid="own-open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        L’avertissement ouvre le sien
      </button>
      {modal.Modal}
    </div>
  );
}

/**
 * The other side, holding nothing but an id.
 *
 * Its readouts come from `useLookup`, which is how a caller learns what its request produced —
 * `requestOpen` returns nothing, because what the owner decides may not be synchronous.
 */
function Caller() {
  const info = useLookup('asked');
  // The manager from context, not the singleton: every CT mount gets its own, and a caller that
  // reached past the provider would be asking a registry this dialog never registered with.
  // `useDialogManagerContext` is the imperative one — `useDialogManager` returns a snapshot.
  const dialogManager = useDialogManagerContext();

  return (
    <div>
      <span data-testid="phase">{info.phase}</span>
      <button
        data-testid="ask-valid"
        onClick={() => {
          dialogManager.requestOpen('asked', { data: { id: 42 }, context: { source: 'mfa1' } });
        }}
        type="button"
      >
        Demander (valide)
      </button>
      <button
        data-testid="ask-invalid"
        onClick={() => {
          dialogManager.requestOpen('asked', { data: 'oups', context: { source: 'mfa1' } });
        }}
        type="button"
      >
        Demander (invalide)
      </button>
      <button
        data-testid="instruct"
        onClick={() => {
          dialogManager.open('asked');
        }}
        type="button"
      >
        Ordonner (l’autre porte)
      </button>
    </div>
  );
}

/** The same dialog with no handler declared — every request is declined. */
export function DeclinesEverythingHarness() {
  const info = useLookup('unasked');
  const dialogManager = useDialogManagerContext();
  const modal = useModal<void, 'ok'>({
    id: 'unasked',
    render: () => {
      return <p style={{ padding: '1rem' }}>Ouverte</p>;
    },
  });

  return (
    <div>
      <span data-testid="phase">{info.phase}</span>
      <button
        data-testid="ask"
        onClick={() => {
          dialogManager.requestOpen('unasked', { data: { id: 1 } });
        }}
        type="button"
      >
        Demander
      </button>
      <button
        data-testid="instruct"
        onClick={() => {
          dialogManager.open('unasked');
        }}
        type="button"
      >
        Ordonner
      </button>
      {modal.Modal}
    </div>
  );
}
