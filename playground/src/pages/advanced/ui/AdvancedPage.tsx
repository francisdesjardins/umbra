import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  GATE_ID as COSMIC_GATE_ID,
  CosmicOverrideExample,
} from '@/pages/advanced/examples/cosmic-override';
import { DomEventsExample } from '@/pages/advanced/examples/dom-events';
import {
  LIST_ID as GROCERY_LIST_ID,
  GroceryListExample,
} from '@/pages/advanced/examples/grocery-list';
import { ImperativeExample } from '@/pages/advanced/examples/imperative';
import { MicrofrontendsExample } from '@/pages/advanced/examples/microfrontends';
import { OpenRequestExample } from '@/pages/advanced/examples/open-request';
import {
  MODAL_ID as OUTLET_DEMO_ID,
  ModalOutletExample,
} from '@/pages/advanced/examples/modal-outlet';
import { MODAL_ID as PANEL_MODAL_ID, MuiPanelExample } from '@/pages/advanced/examples/mui-panel';
import { ServiceLayerExample } from '@/pages/advanced/examples/service-layer';
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
  { id: 'microfrontends', label: 'Microfrontends' },
  { id: 'showcases', label: 'Showcases' },
] as const;

export const AdvancedPage = () => {
  return (
    <PageLayout
      title="Advanced Patterns"
      description="What a modal does once there is more than one of them: stacking and the keyboard that goes with it, control from outside React, outlet rendering, DOM events — and two showcases that combine them."
    >
      <SectionNav sections={SECTIONS} />

      <ExampleSection
        id="stacking"
        title="Stacking, keyboard and focus"
        description="Stacked modals manage their own z-index — and their own keyboard. A modal opened from inside another renders its <dialog> in that one's subtree, so every event bubbles through the modal underneath; the library scopes them back, which is what makes one Escape close one modal and a shared hotkey fire at one level only."
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
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        id="microfrontends"
        title="Microfrontends"
        description="One manager, distributed to independently-deployed frontends. The frame below loads a plain HTML page whose only wiring is an import map naming umbra once: dialogManager is a module-level singleton, so pointing both microfrontends at that one module is what makes them share a registry — two copies would be two registries. Everything here happens inside the frame, which is a separate document and a separate realm; the playground around it hears nothing."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Two microfrontends asking each other for dialogs"
            description="Checkout is React and owns checkout:receipt. Billing is plain JavaScript, binds its own <dialog> to the store engine, and owns billing:confirm. Neither imports the other. Each asks the other with requestOpenAndWait, and the owner decides: send more than 500$ and Billing refuses through request.refuse — nothing opens, nothing flashes, and Checkout hears the reason instead of being left guessing. Different frameworks, one manager, because what they share is the manager and not the renderer."
            codeKey="microfrontends"
            example={<MicrofrontendsExample />}
          />
          <ExampleCard
            title="host.html — the distribution, all of it"
            description="No bundler runs on this page. An import map names umbra once, two <script type=module> tags load the microfrontends, and the browser resolves the rest. This is the file that decides whether the two share a manager."
            codeKey="mfe-host-html"
          />
          <ExampleCard
            title="mfa1.js — Checkout, the React side"
            description="createElement rather than JSX, because nothing compiles this file. It imports umbra from umbra and react from react — three specifiers the host's map happens to resolve to one file, which is how there comes to be one manager and one React rather than two of each. onOpenRequest lets Billing raise its dialog; requestOpen sends the other way. Its Enter hotkey and its opening focus work on a bare <button> with no wrapper — the props carry aria-keyshortcuts and data-focus-on-open, which is all either mechanism needs."
            codeKey="mfe-checkout"
          />
          <ExampleCard
            title="mfa2.js — Billing, and no React at all"
            description="A payload that crossed an ownership boundary is unknown until this side says otherwise, so it validates before it opens and logs a refusal when it will not. Ordinary DOM listeners drive the rest."
            codeKey="mfe-billing"
          />
          <ExampleCard
            title="binding.js — a second binding in forty lines"
            description="What it takes to drive a native <dialog> from the framework-agnostic root: a store, dialogManager.register, and a cancel listener keeping the two in step. The React binding does considerably more, but this is the floor — and it is the argument for the core owning everything that does not need a renderer."
            codeKey="mfe-binding"
          />
          <ExampleCard
            title="shared.ts — what the host actually serves"
            description="The entry a Vite plugin bundles into the single browser-loadable module behind the import map: the library, its React binding, and React itself. One file on purpose — a second copy would come with a second registry."
            codeKey="mfe-shared-entry"
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
            description="A panel that edits something, a confirm raised from inside it, an async action that fails about a third of the time, and a typed payload coming back out. The confirm is opened from inside the panel's render — not a style choice: a blocking dialog swallows every click outside itself, so a trigger that must work while a modal is open has to live in that modal's tree. Both dialogs keep their own Escape and their own Enter."
            codeKey="grocery-list"
            modalId={GROCERY_LIST_ID}
            tryLabel="Open the list"
            example={<GroceryListExample />}
          />
          <ExampleCard
            title="Panel modal with steps"
            description="A large, content-heavy dialog: a composable header whose title truncates when the actions beside it grow, step navigation in a space-between footer, and — the part worth reading — two actions that do not close the modal at all. An action is a named intent, not necessarily a dismissal."
            codeKey="mui-panel"
            modalId={PANEL_MODAL_ID}
            example={<MuiPanelExample />}
          />
          <ExampleCard
            title="Cosmic Override — everything you see is yours"
            description="The library contributes a <dialog>, a phase to animate on, a place to put it and a typed way out. Nothing else. This one overrides all of it: a restyled ::backdrop, custom entrance and exit transforms, a contained non-modal dialog answering to a sector of the page instead of the viewport (placed by dialogPlacement, read here as data), an Enter hotkey declared on the action, and an action error rendered in your own markup."
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
