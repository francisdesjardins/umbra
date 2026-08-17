import { useState } from 'react';
import { useDialogManagerContext, useLookup, useModal, type OpenRequest } from '../../react.js';

/**
 * A dialog asked to open by code that does not own it: the owner declares `onOpenRequest` and
 * validates (a petty numeric-`id` schema — the refusal is the interesting case), the caller knows
 * only an id. A controlled dialog's `open` cannot be instructed without being put straight back,
 * which is the microfrontend shape the option exists for.
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
    onOpenRequest: (payload: unknown, { context }: OpenRequest) => {
      const from = context?.source ?? 'anonyme';
      if (
        typeof payload !== 'object' ||
        payload === null ||
        typeof (payload as { id?: unknown }).id !== 'number'
      ) {
        note(`refusée (${from})`);
        return;
      }
      setAccepted((payload as { id: number }).id);
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

/** The other side, holding only an id — `requestOpen` returns nothing, so it reads `useLookup`. */
function Caller() {
  const info = useLookup('asked');
  // Context, not the singleton: every CT mount gets its own registry. `useDialogManagerContext` is
  // the imperative one — `useDialogManager` returns a snapshot.
  const dialogManager = useDialogManagerContext();

  return (
    <div>
      <span data-testid="phase">{info.phase}</span>
      <button
        data-testid="ask-valid"
        onClick={() => {
          dialogManager.requestOpen('asked', { payload: { id: 42 }, context: { source: 'mfa1' } });
        }}
        type="button"
      >
        Demander (valide)
      </button>
      <button
        data-testid="ask-invalid"
        onClick={() => {
          dialogManager.requestOpen('asked', { payload: 'oups', context: { source: 'mfa1' } });
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

/** The same dialog with no handler declared — every request is refused. */
export function RefusesEverythingHarness() {
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
          dialogManager.requestOpen('unasked', { payload: { id: 1 } });
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
