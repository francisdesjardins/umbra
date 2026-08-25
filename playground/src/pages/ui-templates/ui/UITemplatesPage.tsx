import { ExampleSection } from '@/entities/example';
import styles from '@/pages/ui-templates/ui/UITemplatesPage.module.css';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';
import { useState, type ReactNode } from 'react';

// ── Config ────────────────────────────────────────────────────────────────────

type Flavor = 'vanilla' | 'shared';

type TemplateItem = {
  readonly name: string;
  readonly codeKey: string;
};

type TemplateGroup = {
  readonly title: string;
  readonly description: string;
  readonly items: readonly TemplateItem[];
};

const VANILLA_GROUPS: readonly TemplateGroup[] = [
  {
    title: 'MessageDialog',
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
    title: 'SlideDialog',
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
    title: 'FormDialog',
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
    title: 'PanelDialog',
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
      'Button (forwards aria-keyshortcuts — required for hotkeys) and the content atoms the families render inside their layouts.',
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

/** Template internals that render nothing, so they serve both flavours rather than either one. */
const TEMPLATE_SHARED_GROUP: TemplateGroup = {
  title: 'Template internals',
  description:
    'Under entities/dialog-template/ui/shared: read by the template families and by the shell itself, which is why they are here rather than under a flavour.',
  items: [
    { name: 'useScrollRegion', codeKey: 'template-util-scroll-region' },
    { name: 'tokens', codeKey: 'template-util-tokens' },
    { name: 'types', codeKey: 'template-util-types' },
    { name: 'LoadingOverlay', codeKey: 'template-util-loading-overlay' },
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
  vanilla:
    'Zero-dependency implementations: semantic elements, CSS modules, dark mode via prefers-color-scheme. Reference UI to copy into a project — the examples on /ui-integrations deliberately write their markup out instead, so that what they teach is the library rather than this catalogue.',
  shared: (
    <>
      Works under either flavour, because none of it renders anything. What the two sets have in
      common is larger than this list, though: the hooks are the same call in both, an action
      spreads the same props onto a Material UI button and a bare <code>&lt;button&gt;</code>, and
      both must forward <code>aria-keyshortcuts</code> and <code>data-focus-on-open</code> or the
      hotkey and the opening focus quietly stop working. Only the markup differs — which is the
      whole argument for a headless library.
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

// Vanilla first, and it is the tab that opens: the library ships no UI, so the zero-dependency set
// is the one a reader should meet before the one that needs a component library.
const FLAVOR_TABS: readonly { readonly value: Flavor; readonly label: string }[] = [
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'shared', label: 'Shared' },
];

export const UITemplatesPage = () => {
  const [flavor, setFlavor] = useState<Flavor>('vanilla');
  const groups =
    flavor === 'vanilla'
      ? VANILLA_GROUPS
      : [TEMPLATE_SHARED_GROUP, PATTERNS_GROUP, PLAYGROUND_GROUP];

  return (
    <PageLayout
      title="UI Templates"
      description="Reference implementations you copy into your own project — the library ships no UI. Vanilla is the markup; Shared is what renders nothing and works under any flavour. The examples on /ui-integrations write their markup out by hand instead, so what they teach is the library rather than this catalogue."
      actions={
        // Exclusive selection with a tab always active: pressing the selected tab re-selects it
        // rather than clearing, so there is no "nothing shown" state to design for.
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
