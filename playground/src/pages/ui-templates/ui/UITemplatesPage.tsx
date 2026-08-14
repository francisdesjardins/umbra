import { ExampleSection } from '@/entities/example';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';
import { Box, CardContent, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';

// ── Config ────────────────────────────────────────────────────────────────────

type Flavor = 'mui' | 'vanilla' | 'shared';

type TemplateItem = {
  readonly name: string;
  readonly codeKey: string;
};

type TemplateGroup = {
  readonly title: string;
  readonly description: string;
  readonly items: readonly TemplateItem[];
};

const MUI_GROUPS: readonly TemplateGroup[] = [
  {
    title: 'MessageModal',
    description: 'Components for alert, confirm, and info-style dialogs.',
    items: [
      { name: 'createTextMessageModal', codeKey: 'template-msg-create-text' },
      { name: 'DefaultContainer', codeKey: 'template-msg-default-container' },
      { name: 'DefaultLayout', codeKey: 'template-msg-default-layout' },
      { name: 'Header', codeKey: 'template-msg-header' },
      { name: 'Title', codeKey: 'template-msg-title' },
      { name: 'Icon', codeKey: 'template-msg-icon' },
      { name: 'Content', codeKey: 'template-msg-content' },
      { name: 'Footer', codeKey: 'template-msg-footer' },
    ],
  },
  {
    title: 'SlideModal',
    description: 'Components for panel and drawer-style slide-in modals.',
    items: [
      { name: 'DefaultLayout', codeKey: 'template-slide-default-layout' },
      { name: 'Header', codeKey: 'template-slide-header' },
      { name: 'Title', codeKey: 'template-slide-title' },
      { name: 'Content', codeKey: 'template-slide-content' },
      { name: 'Footer', codeKey: 'template-slide-footer' },
    ],
  },
  {
    title: 'FormModal',
    description: 'Components for form dialogs with submit handling.',
    items: [
      { name: 'FormLayout', codeKey: 'template-form-form-layout' },
      { name: 'Header', codeKey: 'template-form-header' },
      { name: 'Content', codeKey: 'template-form-content' },
      { name: 'Footer', codeKey: 'template-form-footer' },
      { name: 'FieldError', codeKey: 'template-form-field-error' },
    ],
  },
  {
    title: 'PanelModal',
    description: 'Components for large, complex full-panel modals.',
    items: [
      { name: 'PanelContainer', codeKey: 'template-panel-panel-container' },
      { name: 'PanelHeader', codeKey: 'template-panel-panel-header' },
      { name: 'HeaderActionLayout', codeKey: 'template-panel-header-action-layout' },
      { name: 'PanelContent', codeKey: 'template-panel-panel-content' },
      { name: 'PanelFooter', codeKey: 'template-panel-panel-footer' },
    ],
  },
  {
    title: 'Content atoms',
    description: 'Reusable content atoms shared across all template types.',
    items: [
      { name: 'Heading', codeKey: 'template-shared-heading' },
      { name: 'Message', codeKey: 'template-shared-message' },
      { name: 'Detail', codeKey: 'template-shared-detail' },
      { name: 'DetailList', codeKey: 'template-shared-detail-list' },
      { name: 'Hint', codeKey: 'template-shared-hint' },
      { name: 'AlertContent', codeKey: 'template-shared-alert-content' },
      { name: 'Section', codeKey: 'template-shared-section' },
      { name: 'OverflownTypography', codeKey: 'template-shared-overflown-typography' },
      { name: 'OverflowContainer', codeKey: 'template-shared-overflow-container' },
      { name: 'ContentTransition', codeKey: 'template-shared-content-transition' },
    ],
  },
  {
    title: 'Utilities',
    description:
      'MUI Button with loading and hotkey-label support, plus cross-template helpers, visual tokens, and shared types.',
    items: [
      { name: 'Button', codeKey: 'template-shared-mui-button' },
      { name: 'mergeSx / sxToObject', codeKey: 'template-util-sx-utils' },
      { name: 'tokens', codeKey: 'template-util-tokens' },
      { name: 'types', codeKey: 'template-util-types' },
      { name: 'LoadingOverlay', codeKey: 'template-util-loading-overlay' },
    ],
  },
];

const VANILLA_GROUPS: readonly TemplateGroup[] = [
  {
    title: 'MessageModal',
    description: 'Alert and confirm dialogs built from plain elements and a CSS module.',
    items: [
      { name: 'DefaultLayout', codeKey: 'vanilla-msg-default-layout' },
      { name: 'Container', codeKey: 'vanilla-msg-container' },
      { name: 'Header', codeKey: 'vanilla-msg-header' },
      { name: 'Title', codeKey: 'vanilla-msg-title' },
      { name: 'Icon', codeKey: 'vanilla-msg-icon' },
      { name: 'Content', codeKey: 'vanilla-msg-content' },
      { name: 'Footer', codeKey: 'vanilla-msg-footer' },
      { name: 'styles.module.css', codeKey: 'vanilla-msg-styles' },
    ],
  },
  {
    title: 'SlideModal',
    description: 'Drawer-style panels with the slide transition expressed in CSS.',
    items: [
      { name: 'DefaultLayout', codeKey: 'vanilla-slide-default-layout' },
      { name: 'Header', codeKey: 'vanilla-slide-header' },
      { name: 'Title', codeKey: 'vanilla-slide-title' },
      { name: 'Content', codeKey: 'vanilla-slide-content' },
      { name: 'Footer', codeKey: 'vanilla-slide-footer' },
      { name: 'ButtonContainer', codeKey: 'vanilla-slide-button-container' },
      { name: 'CheckboxLabel', codeKey: 'vanilla-slide-checkbox-label' },
      { name: 'SectionGroup', codeKey: 'vanilla-slide-section-group' },
      { name: 'styles.module.css', codeKey: 'vanilla-slide-styles' },
    ],
  },
  {
    title: 'FormModal',
    description: 'Native form controls with per-field error rendering.',
    items: [
      { name: 'FormLayout', codeKey: 'vanilla-form-layout' },
      { name: 'Header', codeKey: 'vanilla-form-header' },
      { name: 'Content', codeKey: 'vanilla-form-content' },
      { name: 'Footer', codeKey: 'vanilla-form-footer' },
      { name: 'FieldGroup', codeKey: 'vanilla-form-field-group' },
      { name: 'FieldError', codeKey: 'vanilla-form-field-error' },
      { name: 'Input', codeKey: 'vanilla-form-input' },
      { name: 'Label', codeKey: 'vanilla-form-label' },
      { name: 'ButtonContainer', codeKey: 'vanilla-form-button-container' },
      { name: 'styles.module.css', codeKey: 'vanilla-form-styles' },
    ],
  },
  {
    title: 'Shared',
    description:
      'Button (forwards aria-keyshortcuts — required for hotkeys) and the content atoms mirroring the MUI set.',
    items: [
      { name: 'Button', codeKey: 'vanilla-shared-button' },
      { name: 'Alert', codeKey: 'vanilla-shared-alert' },
      { name: 'AlertContent', codeKey: 'vanilla-shared-alert-content' },
      { name: 'Heading', codeKey: 'vanilla-shared-heading' },
      { name: 'Message', codeKey: 'vanilla-shared-message' },
      { name: 'Detail', codeKey: 'vanilla-shared-detail' },
      { name: 'Hint', codeKey: 'vanilla-shared-hint' },
      { name: 'Section', codeKey: 'vanilla-shared-section' },
      { name: 'styles.module.css', codeKey: 'vanilla-shared-styles' },
    ],
  },
];

/**
 * The third flavour, and the honest one: none of it renders anything, so it works under either
 * of the other two. These are the patterns the library deliberately does not ship, so that a
 * dialog manager stays a dialog manager.
 */
const PATTERNS_GROUP: TemplateGroup = {
  title: 'Patterns the library does not ship',
  description:
    'Async coordination and draft-style updates are user-land: the library owns dialogs and a reactive cell, and nothing in it needs a mutex. These are the implementations the examples on this site actually run, tested alongside the library — copy them into your project and own them.',
  items: [
    { name: 'AsyncState + runAsync', codeKey: 'shared-lib-async-state' },
    { name: 'safeAwait', codeKey: 'shared-lib-safe-await' },
    { name: 'createMutex', codeKey: 'shared-lib-mutex' },
    { name: 'createSingleFlight', codeKey: 'shared-lib-single-flight' },
    { name: 'createImmerStore', codeKey: 'shared-lib-immer-store' },
    { name: 'useQuery (stand-in)', codeKey: 'shared-lib-use-query' },
    { name: 'useForm (stand-in)', codeKey: 'shared-lib-use-form' },
  ],
};

const PLAYGROUND_GROUP: TemplateGroup = {
  title: 'Playground components',
  description:
    'Not templates — the wrappers this site itself is built from, listed so the "View code" links resolve. They sit here because they belong to no flavour: the site renders both sets with the same shell.',
  items: [
    { name: 'CodeBlock', codeKey: 'shared-component-code-block' },
    { name: 'ViewCodeButton', codeKey: 'shared-component-view-code-button' },
    { name: 'LoadingButton', codeKey: 'shared-component-loading-button' },
    { name: 'ResultDisplay', codeKey: 'shared-component-result-display' },
  ],
};

const FLAVOR_BLURB: Record<Flavor, ReactNode> = {
  mui: (
    <>
      Material UI implementations. Import them as namespaces —{' '}
      <Box component="code" sx={{ fontFamily: 'monospace' }}>
        import * as MessageModal from …/mui/message-modal
      </Box>
      .
    </>
  ),
  vanilla:
    'Zero-dependency implementations: semantic elements, CSS modules, dark mode via prefers-color-scheme. Same component names as the MUI set, so examples port across by changing one import.',
  shared: (
    <>
      Works under either flavour, because none of it renders anything. What the two sets have in
      common is larger than this list, though: the hooks are the same call in both, an action
      spreads the same props onto a Material UI button and a bare{' '}
      <Box component="code" sx={{ fontFamily: 'monospace' }}>
        &lt;button&gt;
      </Box>
      , and both must forward <code>aria-keyshortcuts</code> and <code>data-focus-on-open</code> or
      the hotkey and the opening focus quietly stop working. Only the markup differs — which is the
      whole argument for a headless library, and the reason this page has three tabs rather than
      two.
    </>
  ),
};

// ── Internal components ───────────────────────────────────────────────────────

const TemplateItemCard = ({ name, codeKey }: TemplateItem) => {
  return (
    <SurfaceCard interactive>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', flex: 1, minWidth: 0 }}
        >
          {name}
        </Typography>
        <ViewCodeButton codeKey={codeKey} />
      </CardContent>
    </SurfaceCard>
  );
};

const TemplateGroupSection = ({ title, description, items }: TemplateGroup) => {
  return (
    <ExampleSection title={title} description={description}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        {items.map((item) => {
          return <TemplateItemCard key={item.codeKey} name={item.name} codeKey={item.codeKey} />;
        })}
      </Box>
    </ExampleSection>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const UITemplatesPage = () => {
  const [flavor, setFlavor] = useState<Flavor>('mui');
  const groups =
    flavor === 'mui'
      ? MUI_GROUPS
      : flavor === 'vanilla'
        ? VANILLA_GROUPS
        : [PATTERNS_GROUP, PLAYGROUND_GROUP];

  const handleFlavorChange = (_: React.MouseEvent<HTMLElement>, next: Flavor | null) => {
    if (next === null) {
      return;
    }
    setFlavor(next);
  };

  return (
    <PageLayout
      title="UI Templates"
      description="Reference implementations you copy into your own project — the library ships no UI. The two rendering flavours expose the same component names; the third tab is what works under both."
      actions={
        <ToggleButtonGroup value={flavor} exclusive onChange={handleFlavorChange} size="small">
          <ToggleButton value="mui">Material UI</ToggleButton>
          <ToggleButton value="vanilla">Vanilla</ToggleButton>
          <ToggleButton value="shared">Shared</ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 720 }}>
        {FLAVOR_BLURB[flavor]}
      </Typography>

      {groups.map((group) => {
        return (
          <TemplateGroupSection
            // Flavours reuse group titles (both have a "MessageModal"); scope the key so
            // switching flavour remounts the cards instead of diffing across two sets.
            key={`${flavor}-${group.title}`}
            title={group.title}
            description={group.description}
            items={group.items}
          />
        );
      })}
    </PageLayout>
  );
};
