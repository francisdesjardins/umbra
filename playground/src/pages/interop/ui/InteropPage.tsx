import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { DomEventsExample } from '@/pages/interop/examples/dom-events';
import { GamepadExample } from '@/pages/interop/examples/gamepad';
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
            description="dialog:open and dialog:close fire on document for every dialog on the page — including ones raised by another copy of this library, in another bundle. That reach is the point: dialogManager.subscribe is better inside one app, but it binds to one manager. A tag manager can listen having imported nothing."
            codeKey="dom-events"
            example={<DomEventsExample />}
          />
          <ExampleCard
            title="Server rendering, with no server"
            description="A Worker has no document, which is the one thing separating a Node render from a browser tab — so it can run react-dom/server over the real binding. Render, and you get a closed <dialog>: the only honest answer, since the top layer opens from showModal() alone. Hydrate, and React adopts that markup."
            codeKey="ssr-worker"
            example={<SsrWorkerExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="Input that is not a keyboard"
        description="A controller adapter written entirely against the public API."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Driving a dialog from a controller"
            description="The Gamepad API ships no events, so an adapter polls and reports edges itself. South — A on Xbox, Cross on PlayStation — clicks whatever holds the keyboard, so a dialog's own actions close it with their own reason; East calls handle.close directly. Both are plain public API. Walking the controls is the part that is not: a page-level adapter can only find what carries data-action-reason, and the reading region and the field are invisible to it."
            codeKey="gamepad"
            example={<GamepadExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
