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
        description="A modal opened from inside another renders its <dialog> in that one's subtree, so every event bubbles through the modal underneath; the library scopes them back, which is what makes one Escape close one modal and a shared hotkey fire at one level only. Order is the other half, and it is not a z-index question — the top layer paints in the order elements were added and no z-index reaches between them, so deciding who is in front is a policy rather than a number."
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
            description="A session warning is up when a deep link raises a panel. The panel's showModal() lands last, so the platform paints it in front and the warning ends up under its backdrop — inert, dimmed, and lost, while the user carries on with the thing the app was interrupting. Nothing threw. dialogManager.prioritize() installs one project-wide rule that says which kind of dialog outranks which; flip the switch while both are open and the warning comes back without the panel closing. Moving a modal dialog means closing and re-showing it, since the top layer paints in the order elements were added and ignores z-index between them. Both dialogs here are modal, which is what makes the order a decision at all — between a modal dialog and a non-modal one the platform has already settled it, and no policy reaches across that line."
            codeKey="stack-priority"
            example={<StackPriorityExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
