import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { MuiFormExample } from '@/pages/ui-integrations/examples/mui-form';
import { VanillaFormExample } from '@/pages/ui-integrations/examples/vanilla-form';
import { MuiIsland } from '@/shared/ui/MuiIsland';
import { PageLayout } from '@/shared/ui/PageLayout';

export const UIIntegrationsPage = () => {
  return (
    <PageLayout
      title="UI Integrations"
      description="The library exports no UI, so the only question worth a page is what happens when the chrome is someone else's. One dialog, built twice."
    >
      <ExampleSection
        title="The same dialog, two stacks"
        description="Both files call one useForm and one useDialog, declare the same actions and return the same typed payload. Everything they disagree about is markup. Material UI supplies Box, Stack, TextField and a theme; the <dialog>, the focus and the close reasons stay the library's."
      >
        <ExampleGrid>
          <ExampleCard
            title="Vanilla Form Dialog"
            description="Plain HTML and CSS modules, validation feedback included."
            codeKey="vanilla-form"
            example={<VanillaFormExample />}
          />
          {/* The island is scoped to the one surface that needs it: a provider around the page
              would theme the vanilla card too, and it answers to its own CSS. */}
          <MuiIsland>
            <ExampleCard
              title="MUI Form Dialog"
              description="The same dialog in MUI fields, inside its own ThemeProvider — the only place the vendor chunk is asked for."
              codeKey="mui-form"
              example={<MuiFormExample />}
            />
          </MuiIsland>
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
