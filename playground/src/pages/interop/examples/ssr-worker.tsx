import { ExampleLayout } from '@/entities/example';
import { AppButton } from '@/shared/ui/AppButton';
import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';
import { CheckCircleIcon } from '@/shared/ui/icons';
import styles from '@/pages/interop/examples/ssr-worker.module.css';
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
    // A second run starts from nothing, which means retiring the root the first one left. React
    // refuses `hydrateRoot` on a container that already has one, and the container is the same node
    // every time — so the reset belongs here rather than in `hydrate`, where the markup is already
    // in place and it would be too late to say what owns it.
    const previous = rootRef.current;
    rootRef.current = null;
    previous?.unmount();
    if (hostRef.current) {
      hostRef.current.innerHTML = '';
    }

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
      // The dialog belongs to the hydrated component, which renders its own `Dialog` inside the host
      // below — this example places none of its own.
      dialogs={null}
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--app-space-4)',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
          <AppButton variant="contained" size="small" onClick={renderOnTheServer}>
            Render in a worker
          </AppButton>
          <AppButton size="small" disabled={html === null || hydrated} onClick={hydrate}>
            Hydrate it
          </AppButton>
        </div>

        {workerHadDocument !== null && (
          /* The chip's `warning` state, said with weight and the flame's edge rather than an
             orange fill — colour alone would be the 1.4.1 trap. */
          <span
            style={{
              padding: '3px var(--app-space-2)',
              borderRadius: 'var(--app-radius-pill)',
              fontSize: 'var(--app-text-sm)',
              background: 'var(--app-hover)',
              color: 'var(--app-text)',
              border: `1px solid ${workerHadDocument ? 'var(--app-flame)' : 'var(--app-divider)'}`,
              fontWeight: workerHadDocument ? 600 : 400,
            }}
          >
            {workerHadDocument
              ? 'the worker had a document — this proves nothing'
              : 'the worker had no document'}
          </span>
        )}

        {html !== null && !hydrated && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--app-space-1)',
              width: '100%',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 'var(--app-text-xs)',
                lineHeight: 2.66,
                letterSpacing: '0.08333em',
                textTransform: 'uppercase',
                color: 'var(--app-text-secondary)',
              }}
            >
              What came back — a closed &lt;dialog&gt;, described with no DOM
            </span>
            <CodeBlock code={html} language="html" />
          </div>
        )}

        {hydrated && (
          <div className={styles['banner']}>
            <CheckCircleIcon className={styles['bannerIcon']} aria-hidden="true" />
            <p className={styles['bannerText']}>
              React adopted that markup rather than replacing it. Open the dialog: it is the same
              component, now with a document under it.
            </p>
          </div>
        )}

        {/*
          React owns this node once hydrated, so nothing else writes into it after that. The theme
          reaches the rendered component through these variables rather than through props: the
          worker emits the same markup either way, which is what keeps hydration silent.
        */}
        <div ref={hostRef} data-testid="ssr-worker-host" className={styles['host']} />
      </div>
    </ExampleLayout>
  );
}
