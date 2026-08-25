import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { CosmicOverrideExample } from '@/pages/showcases/examples/cosmic-override';
import { GroceryListExample } from '@/pages/showcases/examples/grocery-list';
import { VanillaPanelExample } from '@/pages/showcases/examples/vanilla-panel';
import { PageLayout } from '@/shared/ui/PageLayout';

export const ShowcasesPage = () => {
  return (
    <PageLayout
      title="Showcases"
      description="Every other route teaches one thing at a time. These three are what the pieces look like assembled — the closest code here to something you would ship."
    >
      <ExampleSection
        title="Whole flows"
        description="A panel that asks before it commits, a three-step wizard, and one demo that pulls every lever the library has."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="One flow, end to end"
            description="A panel that edits something, a confirm raised from inside it, an async action that fails about a third of the time, and a typed payload on the way out. The confirm lives in the panel's own render because it has to: a modal dialog swallows every click outside itself."
            codeKey="grocery-list"
            example={<GroceryListExample />}
          />
          <ExampleCard
            title="A three-step wizard"
            description="The panel-dialog family, and the heaviest layout here: a truncating title, a jump-to dropdown, step navigation in a space-between footer, and two actions that deliberately do not close the dialog."
            codeKey="vanilla-panel"
            example={<VanillaPanelExample />}
          />
          <ExampleCard
            title="Cosmic Override — everything you see is yours"
            description="The library contributes a <dialog>, a phase to animate on, somewhere to put it and a typed way out. This one overrides all of it: a restyled ::backdrop, custom transforms, a contained non-modal dialog answering to a sector of the page, an Enter hotkey on the action, and the error rendered in your own markup."
            codeKey="cosmic-override"
            example={<CosmicOverrideExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
