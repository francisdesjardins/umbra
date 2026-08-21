import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { StackPriorityExample } from '@/pages/stacking/examples/stack-priority';
import { StackedModalsExample } from '@/pages/stacking/examples/stacked-modals';
import { PageLayout } from '@/shared/ui/PageLayout';

export const StackingPage = () => {
  return (
    <PageLayout
      title="Stacking"
      description="What a modal does once there is more than one of them: who is in front, and who owns the keyboard."
    >
      <ExampleSection
        title="Stacking, keyboard and focus"
        description="Two questions the platform answers badly on its own: which modal hears the keyboard, and which one is in front. Neither is a z-index problem."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="One Escape, one modal"
            description="Three modals of different kinds, each rendered inside the one below it — which is how stacking actually happens, since a dialog in the top layer swallows every click outside itself. All three declare Enter with a different meaning, and only the level in front hears it. Press Escape three times and watch the stack unwind one modal per press."
            codeKey="stacked-modals"
            example={<StackedModalsExample />}
          />
          <ExampleCard
            title="Who is in front is a decision, not a race"
            description="A session warning is up when a deep link raises a panel. The panel shows last, so the platform puts it in front and the warning goes under its backdrop — inert, dimmed, and lost. Nothing threw. Flip the switch to install a prioritize() rule and the warning comes back without the panel closing."
            codeKey="stack-priority"
            example={<StackPriorityExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
