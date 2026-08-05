import { ExampleGrid, ExampleSection, StoryCard } from '@/entities/example';
import { sectionSlug } from '@/shared/lib/section-slug';
import { PageLayout } from '@/shared/ui/PageLayout';
import { SectionNav } from '@/shared/ui/SectionNav';
import type { ComponentType } from 'react';
import {
  BasicActionsHarness,
  BrokenAriaKeyshortcutsHarness,
  DefinitionActionsHarness,
  DismissKeyActionCollisionHarness,
  ErrorActionsHarness,
  FocusRestorationHarness,
  HotkeyActionsHarness,
  ModalActionBasicHarness,
  ModalActionCustomHandlerHarness,
  ModalActionHotkeyHarness,
  HotkeyWhilePreparingHarness,
  ModalActionMultipleHarness,
  ReasonSourceHarness,
  VanillaAriaKeyshortcutsHarness,
} from '../../../../../src/actions/__tests__/use-modal-actions.story';
import {
  NoOutletHarness,
  OutletBasicHarness,
  OutletMultiHarness,
  OutletNestedHarness,
  OutletPaintTimingHarness,
  OutletNullModalHarness,
} from '../../../../../src/core/__tests__/modal-outlet.story';
import {
  BasicHarness,
  CustomDismissKeyHarness,
  DismissKeyDisabledHarness,
  DismissWhilePreparingDefaultHarness,
  DismissWhilePreparingDisabledHarness,
  NonModalClickOutsideDefaultHarness,
  NonModalClickOutsideHarness,
  NonModalCustomDismissKeyHarness,
  NonModalEscIsolationHarness,
  NonModalHarness,
  NonModalStackHarness,
  PortalDefaultHarness,
  PortalNonModalDefaultHarness,
  PortalNonModalOptInHarness,
  PortalOptInHarness,
  ReopenSettlesHarness,
  BackdropHitTestHarness,
  KeyPassthroughHarness,
  StableIdentityHarness,
  StructuralToggleHarness,
  TransitionToggleHarness,
  WaitForCloseHarness,
} from '../../../../../src/core/__tests__/use-modal.story';
import {
  DomEventHarness,
  EventSubscribeHarness,
  ImperativeHarness,
  LookupCollectionHarness,
  LookupFindHarness,
  LookupForegroundHarness,
  LookupUnregisteredHarness,
  MultiModalHarness,
  BlockingHarness,
  BlockingLookupHarness,
  NoProviderHarness,
  ProviderIsolationHarness,
  ScrollLockHarness,
  ScrollLockTwoManagersHarness,
  UnregisteredNoOpHarness,
} from '../../../../../src/manager/__tests__/dialog-manager.story';
import {
  UseLookupForegroundHarness,
  UseLookupHarness,
  UseLookupUnregisteredHarness,
} from '../../../../../src/manager/__tests__/use-lookup.story';
import { StoreContextHarness } from '../../../../../src/store/react/__tests__/create-store-context.story';
import { UseStoreHarness } from '../../../../../src/store/react/__tests__/use-store.story';
import {
  AsyncOpenMessageHarness,
  BasicMessageHarness,
  DataMessageHarness,
  WaitForCloseMessageHarness,
} from '../../../../../src/templates/__tests__/use-message-modal.story';
import {
  BasicSlideHarness,
  DirectionSlideHarness,
  MultiDirectionSlideHarness,
  NonModalEscHotkeySlideHarness,
  WaitForCloseSlideHarness,
} from '../../../../../src/templates/__tests__/use-slide-modal.story';

// ── Config ────────────────────────────────────────────────────────────────────

type StoryEntry = {
  readonly title: string;
  readonly description: string;
  readonly component: ComponentType;
  readonly codeKey: string;
};

type StoryGroup = {
  readonly label: string;
  readonly stories: readonly StoryEntry[];
};

const STORY_GROUPS: readonly StoryGroup[] = [
  {
    label: 'useModal',
    stories: [
      {
        title: 'Basic Harness',
        description: 'Open/close with confirm, cancel, and Escape. Tracks last close reason.',
        component: BasicHarness,
        codeKey: 'story-use-modal-basic',
      },
      {
        title: 'Transitions Toggled Between Opens',
        description:
          'The same <dialog> opened once with CSS transitions live and once with them disabled — the close path re-measures per open instead of trusting the first answer.',
        component: TransitionToggleHarness,
        codeKey: 'story-use-modal-transition-toggle',
      },
      {
        title: 'Dismiss Key Passthrough',
        description:
          'A non-modal panel that refuses to dismiss while onOpen is pending. The key it declines still reaches the page’s own Escape handler; the key it acts on does not.',
        component: KeyPassthroughHarness,
        codeKey: 'story-use-modal-key-passthrough',
      },
      {
        title: 'Structural Prop Toggle',
        description:
          'Flipping nonModal/portal while open changes the rendered structure, which a native <dialog> cannot survive — the modal is torn down and closed cleanly instead of being left stuck.',
        component: StructuralToggleHarness,
        codeKey: 'story-use-modal-structural-toggle',
      },
      {
        title: 'Wait For Close',
        description: 'Opens then awaits waitForClose(). Status reflects the resolved reason.',
        component: WaitForCloseHarness,
        codeKey: 'story-use-modal-wait-for-close',
      },
      {
        title: 'Non-Modal Dialog',
        description:
          'Opens with dialog.show() instead of showModal(). No backdrop, clicks pass through, z-index tracked via data-modal-z.',
        component: NonModalHarness,
        codeKey: 'story-use-modal-non-modal',
      },
      {
        title: 'Non-Modal Stack',
        description:
          'Two stacked non-modal dialogs with increasing z-index. Body scroll remains free.',
        component: NonModalStackHarness,
        codeKey: 'story-use-modal-non-modal-stack',
      },
      {
        title: 'Non-Modal ESC Isolation',
        description:
          'ESC closes the panel even when focus is outside it, and does not propagate to underlying elements. leak-count stays 0.',
        component: NonModalEscIsolationHarness,
        codeKey: 'story-use-modal-non-modal-esc-isolation',
      },
      {
        title: 'dismissOnClickOutside',
        description:
          'Non-modal with dismissOnClickOutside: true. Clicking outside the dialog closes it with reason "dismiss". Clicking inside does not.',
        component: NonModalClickOutsideHarness,
        codeKey: 'story-use-modal-non-modal-click-outside',
      },
      {
        title: 'dismissOnClickOutside — Default (false)',
        description:
          'Non-modal without dismissOnClickOutside set. Clicking outside does not close the dialog — default is false.',
        component: NonModalClickOutsideDefaultHarness,
        codeKey: 'story-use-modal-non-modal-click-outside-default',
      },
      {
        title: 'Custom dismissKey',
        description:
          'Modal with dismissKey: Delete — Delete closes with "dismiss", Escape does not.',
        component: CustomDismissKeyHarness,
        codeKey: 'story-use-modal-custom-dismiss-key',
      },
      {
        title: 'dismissKey: false',
        description: 'Key dismissal disabled — only the explicit Close button works.',
        component: DismissKeyDisabledHarness,
        codeKey: 'story-use-modal-dismiss-key-disabled',
      },
      {
        title: 'Non-Modal Custom dismissKey',
        description:
          'Non-modal with dismissKey: Delete. Delete closes from outside focus and does not leak. Escape ignored.',
        component: NonModalCustomDismissKeyHarness,
        codeKey: 'story-use-modal-non-modal-custom-dismiss-key',
      },
      {
        title: 'Portal — Default (Inline)',
        description:
          'Modal dialog without portal (default). Dialog renders inline — parent is NOT document.body.',
        component: PortalDefaultHarness,
        codeKey: 'story-use-modal-portal-default',
      },
      {
        title: 'Portal — Opt-In',
        description: 'Modal dialog with portal: true. Dialog is portaled to document.body.',
        component: PortalOptInHarness,
        codeKey: 'story-use-modal-portal-opt-in',
      },
      {
        title: 'Portal — Non-Modal Default (Inline)',
        description:
          'Non-modal dialog without portal (default). Dialog renders inline — parent is NOT document.body.',
        component: PortalNonModalDefaultHarness,
        codeKey: 'story-use-modal-portal-non-modal-default',
      },
      {
        title: 'Portal — Non-Modal Opt-In',
        description:
          'Non-modal dialog with portal: true. Dialog is portaled to document.body. Click-through still works.',
        component: PortalNonModalOptInHarness,
        codeKey: 'story-use-modal-portal-non-modal-opt-in',
      },
      {
        title: 'dismissWhilePreparing: false',
        description:
          'Modal with dismissWhilePreparing: false. ESC is blocked while onOpen is running. Click "Resolve" to finish loading, then ESC closes.',
        component: DismissWhilePreparingDisabledHarness,
        codeKey: 'story-use-modal-dismiss-while-preparing-disabled',
      },
      {
        title: 'dismissWhilePreparing — Default (true)',
        description:
          'Modal with default dismissWhilePreparing (true). ESC closes even while onOpen is still running.',
        component: DismissWhilePreparingDefaultHarness,
        codeKey: 'story-use-modal-dismiss-while-preparing-default',
      },
      {
        title: 'Reopen Settles',
        description:
          'Regression: open() always settles — calling it while the modal is already open resolves immediately instead of hanging.',
        component: ReopenSettlesHarness,
        codeKey: 'story-use-modal-reopen-settles',
      },
      {
        title: 'Stable Identity',
        description:
          'open/waitForClose/handle keep the same reference across re-renders and a full open/close cycle — no ref dance needed to use them in effects.',
        component: StableIdentityHarness,
        codeKey: 'story-use-modal-stable-identity',
      },
      {
        title: 'Backdrop Hit Testing',
        description:
          'A backdrop click is identified by its target, not coordinates: keyboard-activated buttons (which report a click at 0,0) must not dismiss, and content clicks must still bubble to ancestors.',
        component: BackdropHitTestHarness,
        codeKey: 'story-use-modal-backdrop-hit-test',
      },
    ],
  },
  {
    label: 'useMessageModal',
    stories: [
      {
        title: 'Basic Harness',
        description: 'Open/close with confirm, cancel, and Escape. Tracks last close reason.',
        component: BasicMessageHarness,
        codeKey: 'story-msg-basic',
      },
      {
        title: 'Wait For Close',
        description: 'Opens then awaits waitForClose(). Status reflects the resolved reason.',
        component: WaitForCloseMessageHarness,
        codeKey: 'story-msg-wait-for-close',
      },
      {
        title: 'Async Open',
        description: 'onOpen with a 500 ms async delay. Shows isPreparing state inside the modal.',
        component: AsyncOpenMessageHarness,
        codeKey: 'story-msg-async-open',
      },
      {
        title: 'Typed Data',
        description: 'Closes with typed data payload. Displays last-data after close.',
        component: DataMessageHarness,
        codeKey: 'story-msg-data',
      },
    ],
  },
  {
    label: 'useSlideModal',
    stories: [
      {
        title: 'Basic Harness',
        description: 'Slides in from the right. Tracks last close reason.',
        component: BasicSlideHarness,
        codeKey: 'story-slide-basic',
      },
      {
        title: 'Direction Context',
        description: 'Exposes the direction string inside the render context.',
        component: DirectionSlideHarness,
        codeKey: 'story-slide-direction',
      },
      {
        title: 'Wait For Close',
        description: 'Slides in from the left. Awaits waitForClose() and shows resolved reason.',
        component: WaitForCloseSlideHarness,
        codeKey: 'story-slide-wait-for-close',
      },
      {
        title: 'All Four Directions',
        description:
          'Four independent panels — left, right, top, bottom. Tracks last active direction.',
        component: MultiDirectionSlideHarness,
        codeKey: 'story-slide-multi-direction',
      },
      {
        title: 'Non-Modal ESC Hotkey',
        description:
          'Non-modal panel with a controller action on Escape. ESC from outside the panel triggers the action rather than being swallowed.',
        component: NonModalEscHotkeySlideHarness,
        codeKey: 'story-slide-non-modal-esc-hotkey',
      },
    ],
  },
  {
    label: 'useModalActions',
    stories: [
      {
        title: 'Basic Actions',
        description:
          'Confirm/cancel actions close the modal with their reason. Custom state increments via set() and a snapshot reads it after close.',
        component: BasicActionsHarness,
        codeKey: 'story-controller-basic',
      },
      {
        title: 'Error State',
        description:
          'An action that throws populates controller.error. The error message is displayed inside the modal.',
        component: ErrorActionsHarness,
        codeKey: 'story-controller-error',
      },
      {
        title: 'Hotkey Actions',
        description:
          'Enter triggers confirm, Escape triggers cancel. When a controller action uses the same key as dismissKey, the action wins over dismiss.',
        component: HotkeyActionsHarness,
        codeKey: 'story-controller-hotkey',
      },
      {
        title: 'Action Identity & Payload',
        description:
          'The config key is the close reason, and an action typed defineAction<Result>() closes with exactly that payload — through the bridge into onClose.',
        component: ReasonSourceHarness,
        codeKey: 'story-controller-reason-source',
      },
      {
        title: 'Hotkey While Opening',
        description:
          'onOpen stays pending until you release it. The action button is live the whole time, and its declared hotkey (F2) is the same trigger.',
        component: HotkeyWhilePreparingHarness,
        codeKey: 'story-controller-hotkey-while-preparing',
      },
      {
        title: 'Definition Pattern',
        description: 'Standalone createStore alongside useModalActions with store increment.',
        component: DefinitionActionsHarness,
        codeKey: 'story-controller-definition',
      },
      {
        title: 'Focus Restoration',
        description:
          'After a throwing action, focus is restored to the dialog autofocus target rather than escaping the dialog.',
        component: FocusRestorationHarness,
        codeKey: 'story-controller-focus',
      },
      {
        title: 'dismissKey ↔ Action Collision',
        description:
          'Modal with dismissKey: Delete and a controller action also on Delete — action wins over dismiss.',
        component: DismissKeyActionCollisionHarness,
        codeKey: 'story-controller-dismiss-collision',
      },
      {
        title: 'Callable Action — No Handler',
        description:
          'Spread {...controller.confirm()} with no handler auto-closes with the action reason.',
        component: ModalActionBasicHarness,
        codeKey: 'story-controller-action-basic',
      },
      {
        title: 'Callable Action — Custom Async Handler',
        description:
          'Custom handler with a 200 ms delay. Verifies loading/disabled states propagate through the spread props.',
        component: ModalActionCustomHandlerHarness,
        codeKey: 'story-controller-action-custom-handler',
      },
      {
        title: 'Callable Action — Hotkeys',
        description:
          'Enter triggers confirm, Escape triggers cancel. aria-keyshortcuts is forwarded through the spread props.',
        component: ModalActionHotkeyHarness,
        codeKey: 'story-controller-action-hotkey',
      },
      {
        title: 'Callable Action — Multiple Actions',
        description:
          'Confirm runs a 500 ms async action. While running, cancel receives disabled: true and isRunning is true.',
        component: ModalActionMultipleHarness,
        codeKey: 'story-controller-action-multiple',
      },
      {
        title: 'Vanilla Wrapper — aria-keyshortcuts',
        description:
          'Custom button wrapper that forwards aria-keyshortcuts. Hotkey dispatch works through the wrapper.',
        component: VanillaAriaKeyshortcutsHarness,
        codeKey: 'story-controller-vanilla-aria',
      },
      {
        title: 'Broken Wrapper — aria-keyshortcuts Dropped',
        description:
          'Custom button wrapper that drops aria-keyshortcuts. Hotkey dispatch silently fails — demonstrates the forwarding requirement.',
        component: BrokenAriaKeyshortcutsHarness,
        codeKey: 'story-controller-broken-aria',
      },
    ],
  },
  {
    label: 'ModalOutlet',
    stories: [
      {
        title: 'Basic Outlet',
        description: 'Modal renders via ModalOutlet — no {Modal} placed in JSX.',
        component: OutletBasicHarness,
        codeKey: 'story-outlet-basic',
      },
      {
        title: 'Modal is Null',
        description: 'Verifies modal.Modal is null when inside an outlet.',
        component: OutletNullModalHarness,
        codeKey: 'story-outlet-null-modal',
      },
      {
        title: 'No Outlet (Standard)',
        description: 'Without an outlet — standard {Modal} behaviour as a baseline.',
        component: NoOutletHarness,
        codeKey: 'story-outlet-no-outlet',
      },
      {
        title: 'Multiple Modals',
        description: 'Two modals inside one outlet — both render without {Modal} in JSX.',
        component: OutletMultiHarness,
        codeKey: 'story-outlet-multi',
      },
      {
        title: 'Nested Outlets',
        description:
          'Inner outlet captures the inner modal; outer outlet captures the outer modal.',
        component: OutletNestedHarness,
        codeKey: 'story-outlet-nested',
      },
      {
        title: 'Paint Timing',
        description:
          'Outlet-rendered content is published one hop later than a modal you place yourself. That hop must complete within the same frame — painted-count must already match count.',
        component: OutletPaintTimingHarness,
        codeKey: 'story-outlet-paint-timing',
      },
    ],
  },
  {
    label: 'dialogManager',
    stories: [
      {
        title: 'Imperative Open / Close',
        description:
          'Opens and closes a modal via dialogManager.open/close(). Tracks open state (openDialogs) and close reason reactively.',
        component: ImperativeHarness,
        codeKey: 'story-dm-imperative',
      },
      {
        title: 'Two Managers, One Body',
        description:
          'A nested provider owns a second manager with nothing open. Its registry churn must not release the body scroll lock the outer manager is holding.',
        component: ScrollLockTwoManagersHarness,
        codeKey: 'story-dm-scroll-lock-two-managers',
      },
      {
        title: 'Blocking vs Non-Blocking',
        description:
          'Modal and non-modal dialogs side by side — only blocking ones lock body scroll, and getOpen() can be filtered to either.',
        component: BlockingHarness,
        codeKey: 'story-dm-blocking',
      },
      {
        title: 'Blocking Lookup Queries',
        description:
          "lookup().getOpen('blocking') / ('non-blocking') read live state at call time, split by how the dialog was shown.",
        component: BlockingLookupHarness,
        codeKey: 'story-dm-blocking-lookup',
      },
      {
        title: 'Provider Isolation',
        description:
          'Two DialogManagerProviders, two registries. Opening a modal in one scope leaves the counts in the other untouched.',
        component: ProviderIsolationHarness,
        codeKey: 'story-dm-provider-isolation',
      },
      {
        title: 'No Provider (Singleton Fallback)',
        description:
          'Without a provider the hooks fall back to the static dialogManager singleton — the default for an application.',
        component: NoProviderHarness,
        codeKey: 'story-dm-no-provider',
      },
      {
        title: 'Event Subscribe',
        description:
          'Subscribes to dialogManager.subscribe(). Displays received open/close events as a CSV string.',
        component: EventSubscribeHarness,
        codeKey: 'story-dm-event-subscribe',
      },
      {
        title: 'Multi-Modal Stack',
        description:
          'Two nested modals opened from within each other. Tracks foreground and the stack-ordered openDialogs via useDialogManager.',
        component: MultiModalHarness,
        codeKey: 'story-dm-multi-modal',
      },
      {
        title: 'Scroll Lock Compensation',
        description:
          'A page taller than the viewport with a right-aligned marker and a fixed bar. Opening the blocking modal locks scrolling and reserves the reclaimed scrollbar width, so nothing shifts; the fixed bar pads itself from --dialog-scrollbar-width. The non-modal never locks.',
        component: ScrollLockHarness,
        codeKey: 'story-dm-scroll-lock',
      },
      {
        title: 'Unregistered No-Op',
        description:
          'Calls open/close on an unregistered id. Verifies no error is thrown and the page stays intact.',
        component: UnregisteredNoOpHarness,
        codeKey: 'story-dm-unregistered',
      },
      {
        title: 'DOM Events',
        description:
          'Listens to modal:open and modal:close on document. Verifies id, modalType, and reason in the CustomEvent detail for both modal and slide types.',
        component: DomEventHarness,
        codeKey: 'story-dm-dom-events',
      },
      {
        title: 'Lookup — Find',
        description:
          'Tests lookup(id) for registered and unregistered modals. Displays ModalInfo fields.',
        component: LookupFindHarness,
        codeKey: 'story-dm-lookup-find',
      },
      {
        title: 'Lookup — Collection',
        description:
          'Tests lookup().getOpen(), getClosed(), and getRegisteredCount() with multiple registered modals.',
        component: LookupCollectionHarness,
        codeKey: 'story-dm-lookup-collection',
      },
      {
        title: 'Lookup — Foreground',
        description: 'Tests lookup().getForeground() and isForeground() with stacked modals.',
        component: LookupForegroundHarness,
        codeKey: 'story-dm-lookup-foreground',
      },
      {
        title: 'Lookup — Unregistered',
        description: 'Tests lookup(id) null-object default for unregistered modal ids.',
        component: LookupUnregisteredHarness,
        codeKey: 'story-dm-lookup-unregistered',
      },
    ],
  },
  {
    label: 'useLookup',
    stories: [
      {
        title: 'Reactive Modal State',
        description:
          'useLookup(id) reactively reflects open/close state. Values update without manual query buttons.',
        component: UseLookupHarness,
        codeKey: 'story-use-lookup-basic',
      },
      {
        title: 'Unregistered Modal',
        description:
          'useLookup(id) returns null-object default reactively for unregistered modal ids.',
        component: UseLookupUnregisteredHarness,
        codeKey: 'story-use-lookup-unregistered',
      },
      {
        title: 'Foreground Tracking',
        description: 'useLookup(id) reactively tracks isForeground across stacked modals.',
        component: UseLookupForegroundHarness,
        codeKey: 'story-use-lookup-foreground',
      },
    ],
  },
  {
    label: 'Store',
    stories: [
      {
        title: 'useStore Overloads',
        description:
          'Whole-snapshot, selector, and options-form (shallowEqual) subscriptions to one store — each overload updates from the same mutation.',
        component: UseStoreHarness,
        codeKey: 'story-store-use-store',
      },
      {
        title: 'createStoreContext Isolation',
        description:
          'Two consumers under one Provider share a store; a sibling Provider owns a fully isolated instance.',
        component: StoreContextHarness,
        codeKey: 'story-store-context',
      },
    ],
  },
];

// ── StoriesPage ───────────────────────────────────────────────────────────────

const NAV_SECTIONS = STORY_GROUPS.map((group) => {
  return { id: sectionSlug(group.label), label: group.label };
});

const TOTAL_STORIES = STORY_GROUPS.reduce((total, group) => {
  return total + group.stories.length;
}, 0);

export const StoriesPage = () => {
  return (
    <PageLayout
      title="Test Stories"
      description={`The ${String(TOTAL_STORIES)} harness components driven by the Playwright component suite, rendered live. Each card is the exact file the test imports — if it misbehaves here, the test is telling the truth.`}
    >
      <SectionNav sections={NAV_SECTIONS} />

      {STORY_GROUPS.map((group) => {
        return (
          <ExampleSection key={group.label} title={group.label}>
            <ExampleGrid>
              {group.stories.map((story) => {
                const Harness = story.component;

                return (
                  <StoryCard
                    key={story.title}
                    title={story.title}
                    codeKey={story.codeKey}
                    description={story.description}
                  >
                    <Harness />
                  </StoryCard>
                );
              })}
            </ExampleGrid>
          </ExampleSection>
        );
      })}
    </PageLayout>
  );
};
