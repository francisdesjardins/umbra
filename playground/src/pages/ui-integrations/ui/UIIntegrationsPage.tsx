import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { MODAL_ID as MUI_FORM_ID, MuiFormExample } from '@/pages/ui-integrations/examples/mui-form';
import {
  MODAL_ID as MUI_PANEL_ID,
  MuiPanelExample,
} from '@/pages/ui-integrations/examples/mui-panel';
import {
  MODAL_ID as MUI_MESSAGE_ID,
  MuiMessageExample,
} from '@/pages/ui-integrations/examples/mui-message';
import {
  MODAL_ID as MUI_SLIDE_ID,
  MuiSlideExample,
} from '@/pages/ui-integrations/examples/mui-slide';
import {
  MODAL_ID as VANILLA_FORM_ID,
  VanillaFormExample,
} from '@/pages/ui-integrations/examples/vanilla-form';
import {
  MODAL_ID as VANILLA_MESSAGE_ID,
  VanillaMessageExample,
} from '@/pages/ui-integrations/examples/vanilla-message';
import {
  MODAL_ID as VANILLA_SLIDE_ID,
  VanillaSlideExample,
} from '@/pages/ui-integrations/examples/vanilla-slide';
import { PageLayout } from '@/shared/ui/PageLayout';

export const UIIntegrationsPage = () => {
  return (
    <PageLayout
      title="UI Integrations"
      description="The same headless hooks, twice — Material UI on the left, plain HTML/CSS on the right. Compare the pairs to see exactly how little of the library is UI-aware."
    >
      <ExampleSection
        title="Message"
        description="Confirmation dialogs — the same close reasons and keyboard actions in both stacks."
      >
        <ExampleGrid>
          <ExampleCard
            title="MUI Message Modal"
            description="Confirmation modal with MUI components and keyboard actions."
            codeKey="mui-message"
            modalId={MUI_MESSAGE_ID}
            example={<MuiMessageExample />}
          />
          <ExampleCard
            title="Vanilla Message Modal"
            description="Same behavior using plain HTML and CSS modules, dark mode included."
            codeKey="vanilla-message"
            modalId={VANILLA_MESSAGE_ID}
            example={<VanillaMessageExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="Slide panel"
        description="Edge-anchored panels — the direction and dismiss policy come from the hook, the chrome from your stack."
      >
        <ExampleGrid>
          <ExampleCard
            title="MUI Slide Panel"
            description="Right-side settings panel with Material UI controls."
            codeKey="mui-slide"
            modalId={MUI_SLIDE_ID}
            example={<MuiSlideExample />}
          />
          <ExampleCard
            title="Vanilla Slide Panel"
            description="Slide panel flow with no UI framework dependencies."
            codeKey="vanilla-slide"
            modalId={VANILLA_SLIDE_ID}
            example={<VanillaSlideExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="Form"
        description="The same useForm hook wearing two UIs — validation, error messages and the typed payload out are shared, and only the markup below differs. That is this page's claim, and this is the pair where it is literally true: the two files import one hook and disagree about nothing else."
      >
        <ExampleGrid>
          <ExampleCard
            title="MUI Form Modal"
            description="User creation form using MUI fields and validation."
            codeKey="mui-form"
            modalId={MUI_FORM_ID}
            example={<MuiFormExample />}
          />
          <ExampleCard
            title="Vanilla Form Modal"
            description="Framework-free form modal with validation feedback."
            codeKey="vanilla-form"
            modalId={VANILLA_FORM_ID}
            example={<VanillaFormExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="Panel wizard"
        description="The heavyweight case: a three-step wizard in a full panel, MUI selects, radios and a Tooltip throughout. Its vanilla twin — same store, same steps, native controls — lives on the Advanced page; between the two files, only the markup disagrees."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="MUI Panel Wizard"
            description="Composable panel header with truncating title, a jump-to Select, step navigation in a space-between footer — and two actions that do not close the modal at all."
            codeKey="mui-panel"
            modalId={MUI_PANEL_ID}
            example={<MuiPanelExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
