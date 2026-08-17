// The component both sides run: a worker renders it to a string, the page hydrates that string back
// into it.
//
// **Written with `createElement` and kept out of a `.tsx`**, which is not a style choice. Vite's
// React plugin injects its Fast Refresh preamble into any module it sees exporting a component, and
// that preamble reaches for `window` — which a Worker has not got, so the worker died on import
// before rendering anything. The same reason `public/mfe/` uses `createElement`: a file that has to
// run where nothing compiled it cannot afford a transform's assumptions.
//
// Free of MUI too: a worker bundle pulls in whatever this imports, and the point is that a modal
// needs no DOM to be *described*.
import { createElement as h } from 'react';
import { useModal } from 'umbra/react';

export const SSR_MODAL_ID = 'ssr-worker-demo';

// Colours arrive as CSS variables the page sets on the host, never as values computed here: the
// worker and the page have to emit byte-identical markup or hydration reports a mismatch, and a
// theme is exactly the sort of thing the worker cannot know. The fallbacks are what the worker's own
// markup shows before any page adopts it.
//
// The library ships no UI, so a dialog with no background is a transparent one over the backdrop —
// this is the consumer's half, front page included.
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
 * A modal declared the ordinary way, and that is the whole claim: nothing here is written for the
 * server. `useModal` closes over its own store, `Modal` is a `<dialog>` React can describe without a
 * document, and what comes back is a **closed** dialog — the only honest answer, since the top layer
 * is enterable from `showModal()` alone and no served HTML can hand one back open.
 */
export function SsrWorkerApp({ renderedAt }: { readonly renderedAt: string }) {
  const modal = useModal<void, 'close'>({
    id: SSR_MODAL_ID,
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
          void modal.open();
        },
      },
      'Open the hydrated dialog'
    ),
    modal.Modal
  );
}
