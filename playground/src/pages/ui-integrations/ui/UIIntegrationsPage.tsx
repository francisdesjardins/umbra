import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { MuiFormExample } from '@/pages/ui-integrations/examples/mui-form';
import { VanillaFormExample } from '@/pages/ui-integrations/examples/vanilla-form';
import { VanillaMessageExample } from '@/pages/ui-integrations/examples/vanilla-message';
import { VanillaPanelExample } from '@/pages/ui-integrations/examples/vanilla-panel';
import { VanillaSlideExample } from '@/pages/ui-integrations/examples/vanilla-slide';
import { MuiIsland } from '@/shared/ui/MuiIsland';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SectionNav } from '@/shared/ui/SectionNav';

const SECTIONS = [
  { id: 'the-claim', label: 'The claim' },
  { id: 'message', label: 'Message' },
  { id: 'slide-panel', label: 'Slide panel' },
  { id: 'panel-wizard', label: 'Panel wizard' },
] as const;

export const UIIntegrationsPage = () => {
  return (
    <PageLayout
      title="UI Integrations"
      description="The library exports no UI, so the question is what happens when the chrome is someone else's. One section answers it — the same form modal built twice, once in plain HTML/CSS and once in Material UI, over one hook. The rest of the page is the vanilla reference set: one worked example per template family."
    >
      <SectionNav sections={SECTIONS} />

      <ExampleSection
        id="the-claim"
        title="The claim, made literal"
        description="Both files call the same useForm and the same useModal, declare the same actions and return the same typed payload. Everything they disagree about is markup — which is the whole of what 'headless' buys you, stated as a diff you can read. Material UI supplies Box, Stack, TextField and a theme; the <dialog>, the focus, the close reasons and the action props stay the library's."
      >
        <ExampleGrid>
          <ExampleCard
            title="Vanilla Form Modal"
            description="Framework-free form modal with validation feedback."
            codeKey="vanilla-form"
            example={<VanillaFormExample />}
          />
          {/* The island is scoped to the one surface that needs it: a provider around the page
              would theme the vanilla examples too, and they answer to their own CSS. */}
          <MuiIsland>
            <ExampleCard
              title="MUI Form Modal"
              description="The same modal in MUI fields, inside its own ThemeProvider — the only place the vendor chunk is asked for."
              codeKey="mui-form"
              example={<MuiFormExample />}
            />
          </MuiIsland>
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        id="message"
        title="Message"
        description="Confirmation dialogs: the close reason is the return value, and the keyboard actions come from the hook rather than the markup."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Vanilla Message Modal"
            description="Plain HTML and CSS modules, dark mode included."
            codeKey="vanilla-message"
            example={<VanillaMessageExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        id="slide-panel"
        title="Slide panel"
        description="Edge-anchored panels — the direction and the dismiss policy come from the hook, the chrome from your stack."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Vanilla Slide Panel"
            description="A slide panel flow with no UI framework underneath it."
            codeKey="vanilla-slide"
            example={<VanillaSlideExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        id="panel-wizard"
        title="Panel wizard"
        description="The heavyweight case, and the only worked example of the panel-modal family: a three-step wizard in a full panel. A composable header with a truncating title and a jump-to dropdown, step navigation in a space-between footer, and two actions that do not close the modal at all."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Vanilla Panel Wizard"
            description="The vanilla panel-modal templates, native select/radio/checkbox, a self-drawn chevron, and a native title attribute where a component library would reach for a tooltip widget."
            codeKey="vanilla-panel"
            example={<VanillaPanelExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
