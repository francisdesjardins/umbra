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
        description="One manager, distributed to independently-deployed frontends. The frame below loads a plain HTML page whose only wiring is an import map: dialogManager is a module-level singleton, so resolving umbra to one shared module is what makes three microfrontends share a registry — three copies would be three registries. Everything here happens inside the frame, which is a separate document and a separate realm; the playground around it hears nothing."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Three microfrontends, three frameworks, one manager"
            description="Checkout uses umbra/react and owns checkout:receipt. Support uses umbra/solid — the same call, the same options, the same return — and owns support:ticket. Billing uses umbra/vanilla, the controller binding, over a <dialog> written by hand in the host page, and owns billing:confirm. None of them imports another. Each asks the others with requestOpenAndWait, and the owner decides: send more than 500$ and Billing refuses through request.refuse, then hands the refusal on to Support — one request crossing React, plain JavaScript and Solid in a single trip, because what the three share is the manager and not the renderer."
            codeKey="microfrontends"
            example={<MicrofrontendsExample />}
          />
          <ExampleCard
            title="host.html — the distribution, all of it"
            description="No bundler runs on this page. An import map names the nine specifiers the three microfrontends write — umbra, its two bindings, React, Solid — three <script type=module> tags load them, and the browser resolves the rest. This is the file that decides whether the three share a manager."
            codeKey="mfe-host-html"
          />
          <ExampleCard
            title="mfa1.js — Checkout, on the React binding"
            description="createElement rather than JSX, because nothing compiles this file. It imports umbra from umbra, useModal from umbra/react and react from react — the package's real specifiers, which the host resolves to modules out of one build so there comes to be one manager and one React rather than several. onOpenRequest lets the others raise its dialog; requestOpen sends the other way. Its Enter hotkey and its opening focus work on a bare <button> with no wrapper — the props carry aria-keyshortcuts and data-focus-on-open, which is all either mechanism needs."
            codeKey="mfe-checkout"
          />
          <ExampleCard
            title="mfa3.js — Support, on the Solid binding"
            description="Put this beside Checkout: the useModal call is the same one. Same options object, same render callback, same action factory spread onto a bare <button>, same typed close travelling back to whoever asked. What differs is underneath — nothing re-renders, and the live fields of an action's props are getters Solid subscribes to individually. h() rather than JSX for the same reason Checkout uses createElement: no build step runs on this page, and Solid's JSX is one."
            codeKey="mfe-support"
          />
          <ExampleCard
            title="mfa2.js — Billing, on the vanilla binding"
            description="The third kind of binding: a controller, not a renderer. The <dialog> is written by hand in host.html and stays the page’s; umbra/vanilla drives its lifecycle and bindAction turns two existing buttons into actions — close path, hotkey, and the disabled/loading sync a hook binding gets from a spread. A payload that crossed an ownership boundary is unknown until this side says otherwise, so it validates before it opens, and over the limit it refuses and passes the conversation to Support, which it has never heard of."
            codeKey="mfe-billing"
          />
          <ExampleCard
            title="The build behind the import map"
            description="One rolldown build with eight entries, not eight builds: code-splitting hoists everything the microfrontends have in common — the manager included — into a shared chunk each of them imports. That is the mechanism the demo rests on, and separate builds would quietly break it."
            codeKey="mfe-distribution"
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
