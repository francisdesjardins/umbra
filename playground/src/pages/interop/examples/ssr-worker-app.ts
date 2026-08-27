// The component both sides run — a worker renders it to a string, the page hydrates it back.
//
// **Written with `createElement` and free of MUI.** Vite's React plugin
// injects a Fast Refresh preamble into any module exporting a component, and it reaches for
// `window`, which a Worker has not got.
import { createElement as h } from 'react';
import { useDialog } from 'umbra/react';

export const SSR_DIALOG_ID = 'ssr-worker-demo';

// Colours arrive as CSS variables the page sets on the host, never as values computed here: the
// worker and the page have to emit byte-identical markup or hydration reports a mismatch. The
// fallbacks are what the worker's own markup shows before any page adopts it.
const surface = {
  padding: 16,
  background: 'var(--ssr-surface, #ffffff)',
  color: 'var(--ssr-ink, #1a1a1a)',
  border: '1px solid var(--ssr-line, rgba(0, 0, 0, 0.23))',
  borderRadius: 8,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxWidth: 'min(360px, 80vw)',
} as const;

const column = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'flex-start',
} as const;

/**
 * A dialog declared the ordinary way, and that is the whole claim: nothing here is written for the
 * server. `useDialog` closes over its own store, `Dialog` is a `<dialog>` React can describe without a
 * document, and what comes back is a **closed** dialog — the only honest answer, since the top layer
 * is enterable from `showModal()` alone and no served HTML can hand one back open.
 */
export function SsrWorkerApp({ renderedAt }: { readonly renderedAt: string }) {
  const dialog = useDialog({
    id: SSR_DIALOG_ID,
    ariaLabel: 'Rendered without a DOM',
    render: ({ action }) => {
      return h(
        'div',
        { style: surface },
        h('strong', null, 'This dialog was described before it existed.'),
        h(
          'p',
          { style: { margin: 0 } },
          'Its markup came out of a Worker, where there is no document at all. The page hydrated it, and only then did it become something you can open.'
        ),
        h('button', { ...action('close'), 'data-testid': 'ssr-worker-close' }, 'Close')
      );
    },
  });

  return h(
    'div',
    { style: column },
    h(
      'p',
      { style: { margin: 0 }, 'data-testid': 'ssr-worker-stamp' },
      `Rendered at ${renderedAt}`
    ),
    h(
      'button',
      {
        type: 'button',
        'data-testid': 'ssr-worker-open',
        onClick: () => {
          void dialog.open();
        },
      },
      'Open the hydrated dialog'
    ),
    dialog.Dialog
  );
}
