import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { CosmicOverrideExample } from '@/pages/showcases/examples/cosmic-override';
import { GroceryListExample } from '@/pages/showcases/examples/grocery-list';
import { PageLayout } from '@/shared/ui/PageLayout';

export const ShowcasesPage = () => {
  return (
    <PageLayout
      title="Showcases"
      description="Full flows rather than single features — the closest thing here to production code. Every other route teaches one thing at a time; these two are what the pieces look like once they are assembled."
    >
      <ExampleSection
        title="Whole flows"
        description="One panel that edits something and asks before it commits, and one that takes every lever the library offers and pulls all of them."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="One flow, end to end"
            description="A panel that edits something, a confirm raised from inside it, an async action that fails about a third of the time, and a typed payload coming back out. The confirm is opened from inside the panel's render — not a style choice: a modal dialog swallows every click outside itself, so a trigger that must work while a modal is open has to live in that modal's tree. Both dialogs keep their own Escape and their own Enter."
            codeKey="grocery-list"
            example={<GroceryListExample />}
          />
          <ExampleCard
            title="Cosmic Override — everything you see is yours"
            description="The library contributes a <dialog>, a phase to animate on, a place to put it and a typed way out. Nothing else. This one overrides all of it: a restyled ::backdrop, custom entrance and exit transforms, a contained non-modal dialog answering to a sector of the page instead of the viewport (placed by dialogPlacement, read here as data), an Enter hotkey declared on the action, and an action error rendered in your own markup. It also opts into containFocus — a non-modal dialog gets no Tab trap from the platform, so without it the keyboard walks off Close and into the page behind."
            codeKey="cosmic-override"
            example={<CosmicOverrideExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
