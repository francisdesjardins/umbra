import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  MODAL_ID as SLIDE_CORNER_TOAST_ID,
  SlideCornerToastExample,
} from '@/pages/slide-modal/examples/corner-toast';
import { DRAWER_ID, SlidePresetsExample } from '@/pages/slide-modal/examples/slide-presets';
import { PageLayout } from '@/shared/ui/PageLayout';

export const SlideModalPage = () => {
  return (
    <PageLayout
      title="Slide Modals"
      description="A panel that slides in from an edge. Two options decide the shape — the edge it comes from, and whether it fills the axis across that edge — and everything else is the same modal you already know."
    >
      <ExampleSection
        title="The four shapes"
        description="Each one is its own hook with its own options, printed on the panel it opens. Copy the block, change the edge, and you have the next shape."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Drawer, sheet, palette, contained panel"
            description="A right drawer is the default. A bottom sheet is the same options with one word changed. A command palette adds align: 'center', which makes the panel content-sized across the slide instead of full-bleed. The contained one is non-modal with no portal, so it answers to the dashed box rather than the viewport — and the page stays clickable while it is open."
            codeKey="slide-presets"
            modalId={DRAWER_ID}
            tryLabel="Open the drawer"
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
            description="align: 'start' pins a content-sized panel to the top of the cross axis; non-modal + portal keeps the page interactive. The countdown pauses while the pointer is over it — which is both a courtesy and the proof that the panel really does receive the pointer. It is still named, and the two facts do not fight: role='status' with aria-live is what announces the toast without moving anyone, while the accessible name is for the other way in — the element stays in the accessibility tree, so a screen reader's virtual cursor can land on it minutes later, and an unnamed one is announced there as just a dialog."
            codeKey="slide-corner-toast"
            modalId={SLIDE_CORNER_TOAST_ID}
            tryLabel="Show the toast"
            example={<SlideCornerToastExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
