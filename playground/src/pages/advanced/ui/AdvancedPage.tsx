import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  GATE_ID as COSMIC_GATE_ID,
  CosmicOverrideExample,
} from '@/pages/advanced/examples/cosmic-override';
import {
  PANEL_ID as CONTROLLED_PANEL_ID,
  ControlledPanelExample,
} from '@/pages/advanced/examples/controlled-panel';
import { DomEventsExample } from '@/pages/advanced/examples/dom-events';
import {
  LIST_ID as GROCERY_LIST_ID,
  GroceryListExample,
} from '@/pages/advanced/examples/grocery-list';
import { ImperativeExample } from '@/pages/advanced/examples/imperative';
import { OpenRequestExample } from '@/pages/advanced/examples/open-request';
import {
  MODAL_ID as OUTLET_DEMO_ID,
  ModalOutletExample,
} from '@/pages/advanced/examples/modal-outlet';
import { ServiceLayerExample } from '@/pages/advanced/examples/service-layer';
import { SsrWorkerExample } from '@/pages/advanced/examples/ssr-worker';
import {
  WARNING_ID as STACK_PRIORITY_WARNING_ID,
  StackPriorityExample,
} from '@/pages/advanced/examples/stack-priority';
import {
  PANEL_ID as STACK_PANEL_ID,
  StackedModalsExample,
} from '@/pages/advanced/examples/stacked-modals';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SectionNav } from '@/shared/ui/SectionNav';

const SECTIONS = [
  { id: 'stacking', label: 'Stacking, keyboard and focus' },
  { id: 'imperative-control', label: 'Imperative control' },
  { id: 'rendering-events', label: 'Rendering & events' },
  { id: 'showcases', label: 'Showcases' },
] as const;

export const AdvancedPage = () => {
  return (
    <PageLayout
      title="Advanced Patterns"
      description="What a modal does once there is more than one of them: stacking and the keyboard that goes with it, control from outside React, outlet rendering, DOM events — and three showcases that combine them. Distributing one manager across independently-deployed frontends has its own page, under Microfrontends."
    >
      <SectionNav sections={SECTIONS} />

      <ExampleSection
        id="stacking"
        title="Stacking, keyboard and focus"
        description="Who is in front, and who owns the keyboard. A modal opened from inside another renders its <dialog> in that one's subtree, so every event bubbles through the modal underneath; the library scopes them back, which is what makes one Escape close one modal and a shared hotkey fire at one level only. Order is the other half, and it is not a z-index question — the top layer paints in the order elements were added and no z-index reaches between them, so deciding who is in front is a policy rather than a number."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="One Escape, one modal"
            description="Three modals of different kinds, each rendered inside the one below it — which is how stacking actually happens, since a dialog in the top layer swallows every click outside itself. All three declare Enter with a different meaning, and only the level in front hears it. Press Escape three times and watch the stack unwind one modal per press."
            codeKey="stacked-modals"
            modalId={STACK_PANEL_ID}
            tryLabel="Start the stack"
            example={<StackedModalsExample />}
          />
          <ExampleCard
            title="Who is in front is a decision, not a race"
            description="A session warning is up when a deep link raises a panel. The panel's showModal() lands last, so the platform paints it in front and the warning ends up under its backdrop — inert, dimmed, and lost, while the user carries on with the thing the app was interrupting. Nothing threw. dialogManager.prioritize() installs one project-wide rule that says which kind of dialog outranks which; flip the switch while both are open and the warning comes back without the panel closing. Moving a modal dialog means closing and re-showing it, since the top layer paints in the order elements were added and ignores z-index between them. Both dialogs here are modal, which is what makes the order a decision at all — between a modal dialog and a non-modal one the platform has already settled it, and no policy reaches across that line."
            codeKey="stack-priority"
            modalId={STACK_PRIORITY_WARNING_ID}
            tryLabel="Session warning fires"
            example={<StackPriorityExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        id="imperative-control"
        title="Imperative control"
        description="dialogManager drives modals by id from anywhere. It is the package root — plain TypeScript that never imports React — so a service, a router guard or a worker can raise a dialog without a component."
      >
        <ExampleGrid>
          <ExampleCard
            title="Imperative Open / Close"
            description="Open and close modals via dialogManager.open() / .close() — no React ref needed. Module-level createStore tracks open count across renders."
            codeKey="imperative"
            example={<ImperativeExample />}
          />
          <ExampleCard
            title="An open the dialog may refuse"
            description="requestOpen() asks instead of instructing. The request carries an unknown payload and a caller-declared source — both crossed an ownership boundary, so the dialog validates them and decides. A refusal moves nothing: no flash, no open/close pair for anything watching. That matters for a controlled dialog, whose open prop belongs to the component that renders it and would put an instruction straight back. The second button uses open(), which does not ask."
            codeKey="open-request"
            example={<OpenRequestExample />}
          />
          <ExampleCard
            title="When the open is a prop"
            description="The shape most component-library call sites take, and the one where a dialog must not close itself: the boolean above it would still be true and the next render would put it straight back. The switch is the only truth here — Escape reports through onDismissRequest instead of closing, the footer action asks the same way, and reconcileOpen puts the dialog wherever the switch says, which is why an instruction from outside is undone. Non-modal is a requirement rather than a preference: a modal dialog's backdrop would put the switch out of reach."
            codeKey="controlled-panel"
            modalId={CONTROLLED_PANEL_ID}
            tryLabel="Open the panel"
            example={<ControlledPanelExample />}
          />
          <ExampleCard
            title="Service Layer — the React half"
            description="Registers the two modals the service opens by id and mirrors its state through useSyncExternalStore. It orchestrates nothing: no flow logic lives in the component."
            codeKey="imperative-service-layer"
            example={<ServiceLayerExample />}
          />
          <ExampleCard
            title="deployment-service.ts"
            description="The service itself, and the half that matters. A plain .ts module importing the package root — not /react — so it compiles where React is not installed. It awaits the confirm dialog's close reason, calls the API, and raises the failure dialog itself. Code-only: it has no UI of its own."
            codeKey="imperative-deployment-service"
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        id="rendering-events"
        title="Rendering & events"
        description="Where the dialog markup gets published, and how the rest of the app observes its lifecycle."
      >
        <ExampleGrid>
          <ExampleCard
            title="ModalOutlet"
            description="Wrap a subtree with ModalOutlet — inner useModal calls render automatically, no {modal.Modal} needed."
            codeKey="modal-outlet"
            modalId={OUTLET_DEMO_ID}
            tryLabel="Open Modal"
            example={<ModalOutletExample />}
          />
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

      <ExampleSection
        id="showcases"
        title="Showcases"
        description="Full flows rather than single features — the closest thing here to production code."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="One flow, end to end"
            description="A panel that edits something, a confirm raised from inside it, an async action that fails about a third of the time, and a typed payload coming back out. The confirm is opened from inside the panel's render — not a style choice: a modal dialog swallows every click outside itself, so a trigger that must work while a modal is open has to live in that modal's tree. Both dialogs keep their own Escape and their own Enter."
            codeKey="grocery-list"
            modalId={GROCERY_LIST_ID}
            tryLabel="Open the list"
            example={<GroceryListExample />}
          />
          <ExampleCard
            title="Cosmic Override — everything you see is yours"
            description="The library contributes a <dialog>, a phase to animate on, a place to put it and a typed way out. Nothing else. This one overrides all of it: a restyled ::backdrop, custom entrance and exit transforms, a contained non-modal dialog answering to a sector of the page instead of the viewport (placed by dialogPlacement, read here as data), an Enter hotkey declared on the action, and an action error rendered in your own markup. It also opts into containFocus — a non-modal dialog gets no Tab trap from the platform, so without it the keyboard walks off Close and into the page behind."
            codeKey="cosmic-override"
            modalId={COSMIC_GATE_ID}
            tryLabel="Open the gate"
            example={<CosmicOverrideExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
