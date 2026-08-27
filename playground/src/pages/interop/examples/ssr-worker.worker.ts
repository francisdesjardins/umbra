/// <reference lib="webworker" />
// The "server", and it is a Worker. `renderToString` needs a React tree and nothing else, so the
// one environment a browser offers with no `document` in it is a faithful stand-in for a Node
// render. Nothing here is a mock: the real `react-dom/server`, over the real binding.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { SsrWorkerApp } from './ssr-worker-app';

export type RenderRequest = { readonly renderedAt: string };
export type RenderReply =
  | { readonly ok: true; readonly html: string; readonly hasDocument: boolean }
  | { readonly ok: false; readonly error: string };

self.addEventListener('message', (event: MessageEvent<RenderRequest>) => {
  try {
    const html = renderToString(createElement(SsrWorkerApp, { renderedAt: event.data.renderedAt }));
    // Reported rather than asserted: the page shows it, so the claim "no DOM was involved" is the
    // worker's own answer instead of the demo's word for it.
    const reply: RenderReply = { ok: true, html, hasDocument: 'document' in globalThis };
    self.postMessage(reply);
  } catch (error) {
    const reply: RenderReply = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
  }
});
