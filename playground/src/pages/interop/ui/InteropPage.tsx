import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { DomEventsExample } from '@/pages/interop/examples/dom-events';
import { SsrWorkerExample } from '@/pages/interop/examples/ssr-worker';
import { PageLayout } from '@/shared/ui/PageLayout';

export const InteropPage = () => {
  return (
    <PageLayout
      title="Interop"
      description="The library meeting something that is not your React tree: a script that imported nothing and watches the page anyway, and a renderer with no document to render into. Distributing one manager across independently-deployed frontends is the third case, and has its own page under Microfrontends."
    >
      <ExampleSection
        title="Watching from outside"
        description="Two observers, and neither of them holds a reference to the manager."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Watching from outside the bundle"
            description="modal:open and modal:close fire on document for every dialog on the page — including ones raised by a different copy of this library, in another bundle. That reach is the point: dialogManager.subscribe reports the same two moments and is the better tool inside one app, but it binds to one manager instance. These events are the observation half of what requestOpen opens on the way in, and a tag manager or a plain script can listen having imported nothing."
            codeKey="dom-events"
            example={<DomEventsExample />}
          />
          <ExampleCard
            title="Server rendering, with no server"
            description="A Worker has no document — the one thing that separates a Node render from a browser tab — so it can run react-dom/server over the real binding and hand back real markup. Press Render to see what comes out: a closed <dialog>, described with nothing to draw it on, which is the only honest answer since the top layer is enterable from showModal() alone. Press Hydrate and React adopts that markup rather than replacing it; the dialog opens from there. This is the whole reason useSyncExternalStore is given a server reader — without one it throws, and takes the render of any page mounting a modal with it."
            codeKey="ssr-worker"
            example={<SsrWorkerExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
