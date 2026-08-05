import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  MODAL_ID as SLIDE_ASYNC_OPEN_ID,
  SlideAsyncOpenExample,
} from '@/pages/slide-modal/examples/async-open';
import {
  MODAL_ID as SLIDE_CORNER_TOAST_ID,
  SlideCornerToastExample,
} from '@/pages/slide-modal/examples/corner-toast';
import { SlideModalConfiguratorExample } from '@/pages/slide-modal/examples/slide-modal-configurator';
import { PageLayout } from '@/shared/ui/PageLayout';

export const SlideModalPage = () => {
  return (
    <PageLayout
      title="Slide Modals"
      description="Panels that slide in from any edge. Direction, alignment, modality, portalling and dismiss policy are all independent options."
    >
      <ExampleSection
        title="Configurator"
        description="Every slide option in one panel — change a control and reopen to see the effect."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Slide Modal Configurator"
            description="Toggle direction, align, modal/non-modal, portal, dismiss key, click-outside policy, size units and async open delay — live."
            codeKey="slide-modal-configurator"
            example={<SlideModalConfiguratorExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="Patterns"
        description="Recipes the configurator can't express as a single toggle."
      >
        <ExampleGrid>
          <ExampleCard
            title="Async Open"
            description="Simulate data fetching via onOpen — panel slides in immediately, content fades in once loading completes."
            codeKey="slide-async-open"
            modalId={SLIDE_ASYNC_OPEN_ID}
            example={<SlideAsyncOpenExample />}
          />
          <ExampleCard
            title="Corner Toast (align: start)"
            description="align: 'start' pins a content-sized panel to the top of the cross axis instead of stretching full-height. Non-modal + portal keeps the page interactive while it is open."
            codeKey="slide-corner-toast"
            modalId={SLIDE_CORNER_TOAST_ID}
            example={<SlideCornerToastExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
