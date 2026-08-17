import { ExampleLayout } from '@/entities/example';
import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';
import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { createElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { SsrWorkerApp } from './ssr-worker-app';
import type { RenderReply, RenderRequest } from './ssr-worker.worker';

/**
 * Server-side rendering, demonstrated by a page that has no server.
 *
 * A Worker has no `document`, which is the one thing a Node render and a browser tab differ by — so
 * it can run `react-dom/server` over the real binding and hand back real markup. The page then does
 * what a hydrating app does: put that HTML in a container and call `hydrateRoot` on it. A mismatch
 * would be reported in the console, which is what makes this a test of the claim and not a picture
 * of it.
 */
export function SsrWorkerExample() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);

  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workerHadDocument, setWorkerHadDocument] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [renderedAt, setRenderedAt] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Unmounted asynchronously: React refuses a root torn down during its own commit.
      const root = rootRef.current;
      rootRef.current = null;
      if (root) {
        setTimeout(() => {
          root.unmount();
        }, 0);
      }
    };
  }, []);

  const renderOnTheServer = () => {
    setError(null);
    setHydrated(false);
    setHtml(null);

    const stamp = new Date().toLocaleTimeString();
    setRenderedAt(stamp);

    // `new URL(…, import.meta.url)` is what lets Vite build the worker as its own bundle, in dev and
    // in the static `build:file` output alike — there is no server here to serve it any other way.
    const worker = new Worker(new URL('./ssr-worker.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.addEventListener('message', (event: MessageEvent<RenderReply>) => {
      const reply = event.data;
      if (reply.ok) {
        setHtml(reply.html);
        setWorkerHadDocument(reply.hasDocument);
      } else {
        setError(reply.error);
      }
      worker.terminate();
    });

    const request: RenderRequest = { renderedAt: stamp };
    worker.postMessage(request);
  };

  const hydrate = () => {
    const host = hostRef.current;
    if (!host || html === null || renderedAt === null) {
      return;
    }
    // The markup goes in first and React is asked to *adopt* it — `hydrateRoot`, not `createRoot`.
    // Getting this the other way round would replace the markup and prove nothing.
    host.innerHTML = html;
    rootRef.current = hydrateRoot(host, createElement(SsrWorkerApp, { renderedAt }));
    setHydrated(true);
  };

  return (
    <ExampleLayout
      // The dialog belongs to the hydrated component, which renders its own `Modal` inside the host
      // below — this example places none of its own.
      modals={null}
      result={
        error !== null
          ? `The worker refused: ${error}`
          : hydrated
            ? 'Hydrated — the dialog below is live'
            : html !== null
              ? 'Rendered without a DOM; not yet hydrated'
              : null
      }
    >
      <Stack sx={{ gap: 2, alignItems: 'flex-start' }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" size="small" onClick={renderOnTheServer}>
            Render in a worker
          </Button>
          <Button size="small" disabled={html === null || hydrated} onClick={hydrate}>
            Hydrate it
          </Button>
        </Stack>

        {workerHadDocument !== null && (
          <Chip
            size="small"
            color={workerHadDocument ? 'warning' : 'default'}
            label={
              workerHadDocument
                ? 'the worker had a document — this proves nothing'
                : 'the worker had no document'
            }
          />
        )}

        {html !== null && !hydrated && (
          <Stack sx={{ gap: 0.5, width: '100%', minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              What came back — a closed &lt;dialog&gt;, described with no DOM
            </Typography>
            <CodeBlock code={html} language="html" />
          </Stack>
        )}

        {hydrated && (
          <Alert severity="success" sx={{ width: '100%' }}>
            React adopted that markup rather than replacing it. Open the dialog: it is the same
            component, now with a document under it.
          </Alert>
        )}

        {/* React owns this node once hydrated, so nothing else writes into it after that. */}
        <div ref={hostRef} data-testid="ssr-worker-host" />
      </Stack>
    </ExampleLayout>
  );
}
