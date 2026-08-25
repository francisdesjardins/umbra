import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { AsyncOpenExample } from '@/pages/getting-started/examples/async-open';
import { NoTransitionMessageExample } from '@/pages/getting-started/examples/no-transition-message';
import { PrepareFailureExample } from '@/pages/getting-started/examples/prepare-failure';
import { SimpleDialogExample } from '@/pages/getting-started/examples/simple-dialog';
import { PageLayout } from '@/shared/ui/PageLayout';

export const GettingStartedPage = () => {
  return (
    <PageLayout
      title="Getting Started"
      description="The core loop — open a dialog, render its content, read how it closed, and hear about it when your own callback throws. Every other page builds on these."
    >
      <ExampleSection
        title="Core patterns"
        description="Start here. Each card is a self-contained file you can copy as-is."
      >
        <ExampleGrid>
          <ExampleCard
            title="Simple Dialog"
            description="Basic dialog with open, close, and openAndWait."
            codeKey="simple-dialog"
            example={<SimpleDialogExample />}
          />
          <ExampleCard
            title="Async Open"
            description="prepare awaits a query, so open() resolves when the data is there. A warm cache opens instantly; refetching while open shows isFetching without isPreparing."
            codeKey="async-open"
            example={<AsyncOpenExample />}
          />
          <ExampleCard
            title="When prepare fails"
            description="The same shape when the fetch throws. prepare runs after the dialog is shown, so a throw does not stop it opening — without onError the dialog announces itself ready with nothing in it."
            codeKey="prepare-failure"
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
            title="Message Dialog — No Transition"
            description="Instant open/close with animation duration set to 0 — for when speed matters more than polish."
            codeKey="no-transition-message"
            example={<NoTransitionMessageExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
