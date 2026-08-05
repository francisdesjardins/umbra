import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  MODAL_ID as ASYNC_OPEN_ID,
  AsyncOpenExample,
} from '@/pages/getting-started/examples/async-open';
import {
  MODAL_ID as CONTENT_HELPERS_ID,
  ContentHelpersExample,
} from '@/pages/getting-started/examples/content-helpers';
import {
  MODAL_ID as NO_TRANSITION_MESSAGE_ID,
  NoTransitionMessageExample,
} from '@/pages/getting-started/examples/no-transition-message';
import {
  MODAL_ID as NO_TRANSITION_SLIDE_ID,
  NoTransitionSlideExample,
} from '@/pages/getting-started/examples/no-transition-slide';
import {
  MODAL_ID as SIMPLE_ID,
  SimpleModalExample,
} from '@/pages/getting-started/examples/simple-modal';
import { PageLayout } from '@/shared/ui/PageLayout';

export const GettingStartedPage = () => {
  return (
    <PageLayout
      title="Getting Started"
      description="The core loop — open a modal, render its content, read how it closed. Every other page builds on these three examples."
    >
      <ExampleSection
        title="Core patterns"
        description="Start here. Each card is a self-contained file you can copy as-is."
      >
        <ExampleGrid>
          <ExampleCard
            title="Simple Modal"
            description="Basic modal with open, close, and waitForClose."
            codeKey="simple-modal"
            modalId={SIMPLE_ID}
            tryLabel="Open"
            example={<SimpleModalExample />}
          />
          <ExampleCard
            title="Content Helpers"
            description="Composable content components for consistent modal layouts."
            codeKey="content-helpers"
            modalId={CONTENT_HELPERS_ID}
            tryLabel="Open"
            example={<ContentHelpersExample />}
          />
          <ExampleCard
            title="Async Open (à la useQuery)"
            description="onOpen awaits a query, so open() resolves when the data is there. A warm cache opens instantly; refetching while open shows isFetching without isPreparing."
            codeKey="async-open"
            modalId={ASYNC_OPEN_ID}
            tryLabel="Open"
            example={<AsyncOpenExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="Animation"
        description="Animations are user-land — set the duration to 0 to opt out entirely."
      >
        <ExampleGrid>
          <ExampleCard
            title="Message Modal — No Transition"
            description="Instant open/close with animation duration set to 0 — for when speed matters more than polish."
            codeKey="no-transition-message"
            modalId={NO_TRANSITION_MESSAGE_ID}
            tryLabel="Open"
            example={<NoTransitionMessageExample />}
          />
          <ExampleCard
            title="Slide Panel — No Transition"
            description="Instant open/close slide panel with animation duration set to 0."
            codeKey="no-transition-slide"
            modalId={NO_TRANSITION_SLIDE_ID}
            tryLabel="Open Panel"
            example={<NoTransitionSlideExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
