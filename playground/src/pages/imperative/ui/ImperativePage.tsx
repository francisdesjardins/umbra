import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { ControlledPanelExample } from '@/pages/imperative/examples/controlled-panel';
import { DeclaredPayloadExample } from '@/pages/imperative/examples/declared-payload';
import { DeferredOpenExample } from '@/pages/imperative/examples/deferred-open';
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
            description="requestOpen() asks instead of instructing: the payload crossed an ownership boundary, so the dialog validates it and decides. A refusal moves nothing — no flash, no open/close pair for anything watching. The second button uses open(), which does not ask."
            codeKey="open-request"
            example={<OpenRequestExample />}
          />
          <ExampleCard
            title="An open that lands on nothing"
            description="A modal joins the registry when its component mounts, so an open from a service or a deep link can arrive before the dialog behind a code-split route exists. open() answers whether it landed, and the register event is what lets a caller hold the ask until it does — ten lines, in user-land, because how long to wait is the application's question."
            codeKey="deferred-open"
            example={<DeferredOpenExample />}
          />
          <ExampleCard
            title="A payload the contract declares"
            description="The other direction of the registry: data is what a modal closes with, payload is what it opens with. The ask is checked against the contract with no type argument written anywhere — while the handler still receives unknown, because this is the door a microfrontend comes through and the declaration is what to parse to."
            codeKey="declared-payload"
            example={<DeclaredPayloadExample />}
          />
          <ExampleCard
            title="When the open is a prop"
            description="The shape most component-library call sites take, and the one where a dialog must not close itself — the boolean above it is still true, so the next render puts it straight back. Escape reports through onDismissRequest instead; the switch stays the only truth."
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
            description="Wrap a subtree with ModalOutlet — inner useDialog calls render automatically, no {modal.Modal} needed."
            codeKey="modal-outlet"
            example={<ModalOutletExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
