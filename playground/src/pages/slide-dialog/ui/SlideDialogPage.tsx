import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { SlideCornerToastExample } from '@/pages/slide-dialog/examples/corner-toast';
import { SlidePresetsExample } from '@/pages/slide-dialog/examples/slide-presets';
import { PageLayout } from '@/shared/ui/PageLayout';

export const SlideDialogPage = () => {
  return (
    <PageLayout
      title="Slide Dialogs"
      description="A panel that slides in from an edge. Two options decide the shape — the edge it comes from, and whether it fills the axis across that edge — and everything else is the same modal you already know."
    >
      <ExampleSection
        title="The four shapes"
        description="Each one is its own hook with its own options, printed on the panel it opens. Copy the block, change the edge, and you have the next shape."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Drawer, sheet, palette, contained panel"
            description="A right drawer is the default; a bottom sheet is the same options with one word changed. A command palette adds align: 'center', which content-sizes the panel across the slide. The contained one is non-modal with no portal, so it answers to the dashed box rather than the viewport."
            codeKey="slide-presets"
            example={<SlidePresetsExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="A toast is not a dialog"
        description="The one case where the element and the intent disagree — and what to do about it."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Corner toast"
            description="The one case where the element and the intent disagree. align: 'start' pins a content-sized panel to the top; non-modal keeps the page live, which the pointer-pauses-the-countdown behaviour proves. It carries role='status' to announce itself and a name for the reader who finds it later."
            codeKey="slide-corner-toast"
            example={<SlideCornerToastExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
