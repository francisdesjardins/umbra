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
  FocusOnOpenHarness,
} from '../../../../../src/actions/__tests__/use-modal-actions.story';
import {
  DeclinesEverythingHarness,
  OpenRequestHarness,
} from '../../../../../src/core/__tests__/open-request.story';
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
  OpenAwaitHarness,
  StackedModalsHarness,
  NestedHotkeyScopeHarness,
  FocusUnderAnotherModalHarness,
  EscWithoutFocusHarness,
  AccessibleNameHarness,
  StylingSurfaceHarness,
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
import { StoreContextHarness } from '@/shared/lib/__tests__/create-store-context.story';
import { UseStoreHarness } from '@/shared/lib/__tests__/use-store.story';
import {
  AsyncOpenMessageHarness,
  BasicMessageHarness,
  DataMessageHarness,
  OpenAwaitMessageHarness,
} from '../../../../../src/templates/__tests__/use-message-modal.story';
import {
  BasicSlideHarness,
  DirectionSlideHarness,
  MultiDirectionSlideHarness,
  NonModalEscHotkeySlideHarness,
  OpenAwaitSlideHarness,
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
    label: 'Focus, keyboard & stacking',
    stories: [
      {
        title: 'An action takes the opening focus',
        description:
          'A text input is deliberately first in the DOM — that is what showModal() focuses unaided. Focus landing on Cancel instead proves focusOnOpen did it. The confirm action throws on purpose: focus comes back to the same button, because that is where the retry lives.',
        component: FocusOnOpenHarness,
        codeKey: 'story-focus-on-open',
      },
      {
        title: 'One Escape, one modal',
        description:
          'A non-modal panel holding a modal holding a message modal, each rendered inside the one below it. All three declare Enter. Press Enter: only the modal in front acts. Press Escape three times: the stack unwinds one modal per press, front to back, and the log records the order.',
        component: StackedModalsHarness,
        codeKey: 'story-stacked-modals',
      },
      {
        title: 'A hotkey belongs to the dialog that declared it',
        description:
          'An open non-modal panel sits inside a modal, before the modal’s own button in document order, and both declare Enter. Dispatch finds its button in the DOM — an unscoped lookup takes the first match and runs the wrong action. Enter here must fire "outer", never "inner".',
        component: NestedHotkeyScopeHarness,
        codeKey: 'story-nested-hotkey-scope',
      },
      {
        title: 'Focus is not stolen by the modal underneath',
        description:
          'A slow save runs in one modal while a second opens over it. When the save settles, the modal underneath restores focus — but the user is in the modal in front, and the browser refuses to focus outside the topmost dialog.',
        component: FocusUnderAnotherModalHarness,
        codeKey: 'story-focus-under-another-modal',
      },
      {
        title: 'Escape without focus',
        description:
          'A modal whose content holds nothing focusable. showModal() has nowhere to put focus, so the keydown listener never hears the key — the browser’s own cancel carries it instead, and the dialog still closes rather than desyncing from the store.',
        component: EscWithoutFocusHarness,
        codeKey: 'story-esc-without-focus',
      },
      {
        title: 'Restoring focus after a failed action',
        description:
          'The button that ran is disabled while it runs, so focus falls to the body. When the action fails, focus returns to the autofocus target — otherwise the modal would answer to nothing but the mouse.',
        component: FocusRestorationHarness,
        codeKey: 'story-action-focus',
      },
    ],
  },
  {
    label: 'Naming and styling a dialog',
    stories: [
      {
        title: 'The accessible name',
        description:
          'ariaLabel, ariaLabelledBy and role reach the <dialog>. A dialog with no accessible name is announced as just "dialog" — the library cannot invent one, so it omits the attribute entirely rather than shipping an empty string an audit would miss.',
        component: AccessibleNameHarness,
        codeKey: 'story-accessible-name',
      },
      {
        title: 'The styling surface',
        description:
          'The whole of it: --dialog-backdrop for the backdrop, data-modal-id and data-modal-type to reach one dialog or every non-blocking one from CSS. No class names to learn, and nothing that requires knowing how the tree is built.',
        component: StylingSurfaceHarness,
        codeKey: 'story-styling-surface',
      },
    ],
  },
  {
    label: 'Dismissing, modality and portalling',
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
          'A non-modal panel that refuses to dismiss while prepare is pending. The key it declines still reaches the page’s own Escape handler; the key it acts on does not.',
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
        description: 'Awaits openAndWait(). Status reflects the resolved reason.',
        component: OpenAwaitHarness,
        codeKey: 'story-use-modal-open-await',
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
          'Modal with dismissWhilePreparing: false. ESC is blocked while prepare is running. Click "Resolve" to finish loading, then ESC closes.',
        component: DismissWhilePreparingDisabledHarness,
        codeKey: 'story-use-modal-dismiss-while-preparing-disabled',
      },
      {
        title: 'dismissWhilePreparing — Default (true)',
        description:
          'Modal with default dismissWhilePreparing (true). ESC closes even while prepare is still running.',
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
          'open/openAndWait/handle keep the same reference across re-renders and a full open/close cycle — no ref dance needed to use them in effects.',
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
    label: 'Message modals',
    stories: [
      {
        title: 'Basic Harness',
        description: 'Open/close with confirm, cancel, and Escape. Tracks last close reason.',
        component: BasicMessageHarness,
        codeKey: 'story-msg-basic',
      },
      {
        title: 'Wait For Close',
        description: 'Awaits openAndWait(). Status reflects the resolved reason.',
        component: OpenAwaitMessageHarness,
        codeKey: 'story-msg-open-await',
      },
      {
        title: 'Async Open',
        description: 'prepare with a 500 ms async delay. Shows isPreparing state inside the modal.',
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
    label: 'Slide panels',
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
        description: 'Slides in from the left. Awaits openAndWait() and shows resolved reason.',
        component: OpenAwaitSlideHarness,
        codeKey: 'story-slide-open-await',
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
          'Non-modal panel whose Escape is an action rather than a dismissal. ESC from outside the panel triggers the action rather than being swallowed.',
        component: NonModalEscHotkeySlideHarness,
        codeKey: 'story-slide-non-modal-esc-hotkey',
      },
    ],
  },
  {
    label: 'Actions, hotkeys and errors',
    stories: [
      {
        title: 'Basic Actions',
        description:
          'Confirm/cancel actions close the modal with their reason. Custom state increments via set() and a snapshot reads it after close.',
        component: BasicActionsHarness,
        codeKey: 'story-action-basic',
      },
      {
        title: 'Error State',
        description:
          'An action that throws populates the modal’s aggregated error. The error message is displayed inside the modal.',
        component: ErrorActionsHarness,
        codeKey: 'story-action-error',
      },
      {
        title: 'Hotkey Actions',
        description:
          'Enter triggers confirm, Escape triggers cancel. When an action declares the same key as dismissKey, the action wins over dismiss.',
        component: HotkeyActionsHarness,
        codeKey: 'story-action-hotkey',
      },
      {
        title: 'Action Identity & Payload',
        description:
          'The reason an action is given is its identity: it names the action and it is what the modal closes with, payload included.',
        component: ReasonSourceHarness,
        codeKey: 'story-action-reason-source',
      },
      {
        title: 'Hotkey While Opening',
        description:
          'prepare stays pending until you release it. The action button is live the whole time, and its declared hotkey (F2) is the same trigger.',
        component: HotkeyWhilePreparingHarness,
        codeKey: 'story-action-hotkey-while-preparing',
      },
      {
        title: 'Definition Pattern',
        description: 'A standalone createStore beside the modal, incremented from inside it.',
        component: DefinitionActionsHarness,
        codeKey: 'story-action-definition',
      },
      {
        title: 'dismissKey ↔ Action Collision',
        description:
          'Modal with dismissKey: Delete and an action declaring Delete too — the action wins.',
        component: DismissKeyActionCollisionHarness,
        codeKey: 'story-action-dismiss-collision',
      },
      {
        title: 'Callable Action — No Handler',
        description:
          'Spread {...controller.confirm()} with no handler auto-closes with the action reason.',
        component: ModalActionBasicHarness,
        codeKey: 'story-action-action-basic',
      },
      {
        title: 'Callable Action — Custom Async Handler',
        description:
          'Custom handler with a 200 ms delay. Verifies loading/disabled states propagate through the spread props.',
        component: ModalActionCustomHandlerHarness,
        codeKey: 'story-action-action-custom-handler',
      },
      {
        title: 'Callable Action — Hotkeys',
        description:
          'Enter triggers confirm, Escape triggers cancel. aria-keyshortcuts is forwarded through the spread props.',
        component: ModalActionHotkeyHarness,
        codeKey: 'story-action-action-hotkey',
      },
      {
        title: 'Callable Action — Multiple Actions',
        description:
          'Confirm runs a 500 ms async action. While running, cancel receives disabled: true and isRunning is true.',
        component: ModalActionMultipleHarness,
        codeKey: 'story-action-action-multiple',
      },
      {
        title: 'Vanilla Wrapper — aria-keyshortcuts',
        description:
          'Custom button wrapper that forwards aria-keyshortcuts. Hotkey dispatch works through the wrapper.',
        component: VanillaAriaKeyshortcutsHarness,
        codeKey: 'story-action-vanilla-aria',
      },
      {
        title: 'Broken Wrapper — aria-keyshortcuts Dropped',
        description:
          'Custom button wrapper that drops aria-keyshortcuts. Hotkey dispatch silently fails — demonstrates the forwarding requirement.',
        component: BrokenAriaKeyshortcutsHarness,
        codeKey: 'story-action-broken-aria',
      },
    ],
  },
  {
    label: 'Rendering without {Modal}',
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
    label: 'The manager: stacking, scroll lock, events',
    stories: [
      {
        title: 'An open the dialog may refuse',
        description:
          'requestOpen() asks instead of instructing: the request reaches the dialog’s own code, which validates the payload and the caller’s claimed source before agreeing. A refusal moves nothing — no flash, no open/close pair for anything watching. The other button uses open(), which does not ask.',
        component: OpenRequestHarness,
        codeKey: 'story-open-request',
      },
      {
        title: 'A dialog that accepts no requests',
        description:
          'The same two buttons against a dialog that declared no onOpenRequest. Asking is declined and logged; instructing still opens it, because the two doors are separate.',
        component: DeclinesEverythingHarness,
        codeKey: 'story-open-request',
      },
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
    label: 'Observing modal state',
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
    label: 'The store engine',
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
      title="Test Harnesses"
      description={`The ${String(TOTAL_STORIES)} fixtures the Playwright component suite drives, rendered live and grouped by the symptom that sends you looking — focus, keyboard, dismissal, layering. They are deliberately unstyled: what you press here is exactly what the assertions press, with nothing in between. For the same behaviours dressed like the rest of the site, see the sections above.`}
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
