import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  GATE_ID as COSMIC_GATE_ID,
  CosmicOverrideExample,
} from '@/pages/advanced/examples/cosmic-override';
import { DomEventsExample } from '@/pages/advanced/examples/dom-events';
import { ImperativeExample } from '@/pages/advanced/examples/imperative';
import {
  MODAL_ID as OUTLET_DEMO_ID,
  ModalOutletExample,
} from '@/pages/advanced/examples/modal-outlet';
import { MODAL_ID as PANEL_MODAL_ID, MuiPanelExample } from '@/pages/advanced/examples/mui-panel';
import {
  MODAL_ID as PHARMACY_RX_ID,
  PharmacyRxExample,
} from '@/pages/advanced/examples/pharmacy-rx';
import { ServiceLayerExample } from '@/pages/advanced/examples/service-layer';
import { StackedModalsExample } from '@/pages/advanced/examples/stacked-modals';
import {
  MODAL_ID as TEXT_MODAL_ID,
  TextMessageModalExample,
} from '@/pages/advanced/examples/text-message-modal';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SectionNav } from '@/shared/ui/SectionNav';

const SECTIONS = [
  { id: 'stacking', label: 'Stacking' },
  { id: 'imperative-control', label: 'Imperative control' },
  { id: 'rendering-events', label: 'Rendering & events' },
  { id: 'showcases', label: 'Showcases' },
] as const;

export const AdvancedPage = () => {
  return (
    <PageLayout
      title="Advanced Patterns"
      description="Stacking, imperative control from outside React, outlet rendering, DOM events — and two end-to-end showcases that combine them."
    >
      <SectionNav sections={SECTIONS} />

      <ExampleSection
        id="stacking"
        title="Stacking"
        description="Nested modals manage their own z-index. Any button that must stay clickable while a modal is open has to live inside that modal's render callback."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Three-Level Stack"
            description="SlideModal → MessageModal → MessageModal — automatic z-index management across nested modals."
            codeKey="stacked-modals"
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
            title="Text Message Modal Builder"
            description="createTextMessageModal — builder pattern for a constrained confirm/cancel modal. Chain setTitle, setMessage, confirm, and cancel, then open it via dialogManager.open()."
            codeKey="text-message-modal"
            modalId={TEXT_MODAL_ID}
            tryLabel="Open via dialogManager"
            example={<TextMessageModalExample />}
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
            title="DOM Events (modal:open / modal:close)"
            description="document.addEventListener('modal:open') and 'modal:close' fire at the start and end of each modal lifecycle. The detail includes id, modalType ('modal' | 'slide'), reason, openedAt, and duration."
            codeKey="dom-events"
            example={<DomEventsExample />}
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
            title="Wizard Panel Modal"
            description="PanelModal template for large, content-heavy dialogs. Composable header with HeaderActionLayout — title on the left uses OverflownTypography (truncates when actions are wide), actions on the right. Wizard step navigation with a space-between footer."
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
          <ExampleCard
            title="Pharmacy Prescription Review"
            description="A slide panel driving nested message modals over a scoped store: async state via runAsync/safeAwait, a mutex and single-flight guard around the submit action, and createStoreContext for per-prescription isolation."
            codeKey="pharmacy-rx"
            modalId={PHARMACY_RX_ID}
            tryLabel="Open Review"
            example={<PharmacyRxExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
