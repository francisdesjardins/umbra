import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  MODAL_ID as ASYNC_OPEN_ID,
  AsyncOpenExample,
} from '@/pages/getting-started/examples/async-open';
import {
  MODAL_ID as NO_TRANSITION_MESSAGE_ID,
  NoTransitionMessageExample,
} from '@/pages/getting-started/examples/no-transition-message';
import {
  MODAL_ID as PREPARE_FAILURE_ID,
  PrepareFailureExample,
} from '@/pages/getting-started/examples/prepare-failure';
import {
  MODAL_ID as SIMPLE_ID,
  SimpleModalExample,
} from '@/pages/getting-started/examples/simple-modal';
import { PageLayout } from '@/shared/ui/PageLayout';

export const GettingStartedPage = () => {
  return (
    <PageLayout
      title="Getting Started"
      description="The core loop — open a modal, render its content, read how it closed, and hear about it when your own callback throws. Every other page builds on these."
    >
      <ExampleSection
        title="Core patterns"
        description="Start here. Each card is a self-contained file you can copy as-is."
      >
        <ExampleGrid>
          <ExampleCard
            title="Simple Modal"
            description="Basic modal with open, close, and openAndWait."
            codeKey="simple-modal"
            modalId={SIMPLE_ID}
            tryLabel="Open"
            example={<SimpleModalExample />}
          />
          <ExampleCard
            title="Async Open"
            description="prepare awaits a query, so open() resolves when the data is there. A warm cache opens instantly; refetching while open shows isFetching without isPreparing."
            codeKey="async-open"
            modalId={ASYNC_OPEN_ID}
            tryLabel="Open"
            example={<AsyncOpenExample />}
          />
          <ExampleCard
            title="When prepare fails"
            description="The same shape when the fetch throws. prepare runs after the dialog is shown, so a throw does not stop it opening — without onError the modal announces itself ready with nothing in it."
            codeKey="prepare-failure"
            modalId={PREPARE_FAILURE_ID}
            tryLabel="Open"
            example={<PrepareFailureExample />}
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
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
