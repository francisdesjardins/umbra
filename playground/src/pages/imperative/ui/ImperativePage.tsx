import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { ControlledPanelExample } from '@/pages/imperative/examples/controlled-panel';
import { ImperativeExample } from '@/pages/imperative/examples/imperative';
import { ModalOutletExample } from '@/pages/imperative/examples/modal-outlet';
import { OpenRequestExample } from '@/pages/imperative/examples/open-request';
import { ServiceLayerExample } from '@/pages/imperative/examples/service-layer';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SectionNav } from '@/shared/ui/SectionNav';

const SECTIONS = [
  { id: 'imperative-control', label: 'Imperative control' },
  { id: 'rendering-elsewhere', label: 'Rendering it elsewhere' },
] as const;

export const ImperativePage = () => {
  return (
    <PageLayout
      title="Imperative Control"
      description="Opening a modal from somewhere that is not the component holding it — a service, a router guard, a worker, or a boolean prop one level up. Where the dialog's markup ends up is the same question asked about the render rather than the open, so it is here too."
    >
      <SectionNav sections={SECTIONS} />

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
        id="rendering-elsewhere"
        title="Rendering it elsewhere"
        description="The same decoupling on the other axis: not who opens the dialog, but where its markup is published."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="ModalOutlet"
            description="Wrap a subtree with ModalOutlet — inner useModal calls render automatically, no {modal.Modal} needed."
            codeKey="modal-outlet"
            example={<ModalOutletExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
