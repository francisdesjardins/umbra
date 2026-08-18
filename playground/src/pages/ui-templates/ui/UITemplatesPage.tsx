import { ExampleSection } from '@/entities/example';
import styles from '@/pages/ui-templates/ui/UITemplatesPage.module.css';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';
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
      { name: 'useScrollRegion', codeKey: 'template-util-scroll-region' },
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
    title: 'PanelModal',
    description:
      'Components for large, complex full-panel modals — with its own Divider, since there is no component library to borrow one from.',
    items: [
      { name: 'PanelContainer', codeKey: 'vanilla-panel-panel-container' },
      { name: 'PanelHeader', codeKey: 'vanilla-panel-panel-header' },
      { name: 'HeaderActionLayout', codeKey: 'vanilla-panel-header-action-layout' },
      { name: 'PanelContent', codeKey: 'vanilla-panel-panel-content' },
      { name: 'PanelFooter', codeKey: 'vanilla-panel-panel-footer' },
      { name: 'Divider', codeKey: 'vanilla-panel-divider' },
      { name: 'styles.module.css', codeKey: 'vanilla-panel-styles' },
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
      { name: 'DetailList', codeKey: 'vanilla-shared-detail-list' },
      { name: 'Hint', codeKey: 'vanilla-shared-hint' },
      { name: 'Section', codeKey: 'vanilla-shared-section' },
      { name: 'OverflownTypography', codeKey: 'vanilla-shared-overflown-typography' },
      { name: 'OverflowContainer', codeKey: 'vanilla-shared-overflow-container' },
      { name: 'ContentTransition', codeKey: 'vanilla-shared-content-transition' },
      { name: 'styles.module.css', codeKey: 'vanilla-shared-styles' },
    ],
  },
];

/**
 * The third flavour: nothing here renders anything visible (the announcer's hidden live region
 * included), so it works under either other one. Patterns the library deliberately does not ship.
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
    { name: 'useAnnouncer', codeKey: 'shared-lib-use-announcer' },
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
      <code>import * as MessageModal from …/mui/message-modal</code>.
    </>
  ),
  vanilla:
    'Zero-dependency implementations: semantic elements, CSS modules, dark mode via prefers-color-scheme. Same component names as the MUI set, so examples port across by changing one import.',
  shared: (
    <>
      Works under either flavour, because none of it renders anything. What the two sets have in
      common is larger than this list, though: the hooks are the same call in both, an action
      spreads the same props onto a Material UI button and a bare <code>&lt;button&gt;</code>, and
      both must forward <code>aria-keyshortcuts</code> and <code>data-focus-on-open</code> or the
      hotkey and the opening focus quietly stop working. Only the markup differs — which is the
      whole argument for a headless library, and the reason this page has three tabs rather than
      two.
    </>
  ),
};

// ── Internal components ───────────────────────────────────────────────────────

const TemplateItemCard = ({ name, codeKey }: TemplateItem) => {
  return (
    <SurfaceCard interactive>
      <div className={styles['itemRow']}>
        <p className={styles['itemName']}>{name}</p>
        <ViewCodeButton codeKey={codeKey} />
      </div>
    </SurfaceCard>
  );
};

const TemplateGroupSection = ({ title, description, items }: TemplateGroup) => {
  return (
    <ExampleSection title={title} description={description}>
      <div className={styles['cardGrid']}>
        {items.map((item) => {
          return <TemplateItemCard key={item.codeKey} name={item.name} codeKey={item.codeKey} />;
        })}
      </div>
    </ExampleSection>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const FLAVOR_TABS: readonly { readonly value: Flavor; readonly label: string }[] = [
  { value: 'mui', label: 'Material UI' },
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'shared', label: 'Shared' },
];

export const UITemplatesPage = () => {
  const [flavor, setFlavor] = useState<Flavor>('mui');
  const groups =
    flavor === 'mui'
      ? MUI_GROUPS
      : flavor === 'vanilla'
        ? VANILLA_GROUPS
        : [PATTERNS_GROUP, PLAYGROUND_GROUP];

  return (
    <PageLayout
      title="UI Templates"
      description="Reference implementations you copy into your own project — the library ships no UI. The two rendering flavours expose the same component names; the third tab is what works under both."
      actions={
        // Exclusive selection with a tab always active: pressing the selected tab re-selects it,
        // which is what the MUI group's ignored-null branch amounted to.
        <div role="group" className={styles['segmented']}>
          {FLAVOR_TABS.map((tab) => {
            return (
              <button
                key={tab.value}
                type="button"
                className={styles['segment']}
                aria-pressed={flavor === tab.value}
                onClick={() => {
                  setFlavor(tab.value);
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      }
    >
      <p className={styles['blurb']}>{FLAVOR_BLURB[flavor]}</p>

      {groups.map((group) => {
        return (
          <TemplateGroupSection
            // Flavours reuse group titles, so scope the key or switching diffs across two sets.
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
