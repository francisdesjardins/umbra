import { StrandedFocusHarness } from 'umbra/core/__tests__/stranded-focus.story';
import { ActionIsRunningHarness } from 'umbra/actions/__tests__/use-dialog-actions/action-is-running.story';
import { DomSafeSpreadHarness } from 'umbra/actions/__tests__/use-dialog-actions/dom-safe-spread.story';
import { SpreadContractHarness } from 'umbra/actions/__tests__/use-dialog-actions/spread-contract.story';
import {
  AsymmetricKeyframesHarness,
  NameTranslationHarness,
} from 'umbra/core/__tests__/apply-style.story';
import {
  DismissKeyOwnershipHarness,
  KeyClaimProbeHarness,
} from 'umbra/core/__tests__/dismiss-key-ownership.story';
import {
  ControlledClickOutsideHarness,
  ControlledModalHarness,
  ControlledPanelHarness,
} from 'umbra/core/__tests__/dismiss-request.story';
import {
  OpenEventInDocumentHarness,
  OpenEventInShadowHarness,
} from 'umbra/manager/__tests__/open-event-element.story';
import {
  LatePolicyFocusHarness,
  MultiRaiseHarness,
} from 'umbra/manager/__tests__/stack-priority.story';
import { UseLookupPreparingHarness } from 'umbra/react/__tests__/use-lookup.story';
import { ActionErrorHotkeyRetryHarness } from 'umbra/react/__tests__/use-dialog/action-error-hotkey-retry.story';
import { ContainedOverlayHarness } from 'umbra/react/__tests__/use-dialog/contained-overlay.story';
import { EscAnsweredByNobodyHarness } from 'umbra/react/__tests__/use-dialog/esc-answered-by-nobody.story';
import {
  DanglingLabelHarness,
  LateTitleHarness,
  OutletLabelHarness,
} from 'umbra/react/__tests__/use-dialog/labelling-diagnostics.story';
import { OnOpenAbortHarness } from 'umbra/react/__tests__/use-dialog/on-open-abort.story';
import { OpenAndWaitOrderingHarness } from 'umbra/react/__tests__/use-dialog/open-and-wait-ordering.story';
import { PrepareFailureHarness } from 'umbra/react/__tests__/use-dialog/prepare-failure.story';
import { ReconcileOpenHarness } from 'umbra/react/__tests__/use-dialog/reconcile-open.story';
import { RestoreNotInFrontHarness } from 'umbra/react/__tests__/use-dialog/restore-not-in-front.story';
import { ShadowRootHarness } from 'umbra/react/__tests__/use-dialog/shadow-root.story';
import { VolatileKeyDownHarness } from 'umbra/react/__tests__/use-dialog/volatile-keydown.story';
import {
  EditableContentHarness,
  EditableOnlyHarness,
  FramedContentHarness,
  HiddenStopHarness,
  NestedPanelScanHarness,
  RovingToolbarHarness,
} from 'umbra/core/__tests__/focus-containment.story';
import {
  OpeningFocusForegroundHarness,
  ReclaimWithoutClaimHarness,
  ShadowReclaimWithoutClaimHarness,
} from 'umbra/core/__tests__/opening-focus-foreground.story';
import { UndefinedClearsHarness } from 'umbra/core/__tests__/apply-style.story';
import { VanillaSwapHarness } from 'umbra/vanilla/__tests__/swap.story';
import {
  SolidBasicHarness,
  SolidBusyHarness,
  SolidClaimlessReclaimHarness,
  SolidContainedHarness,
  SolidDeclarationHarness,
  SolidDisposalHarness,
  SolidFailedActionHarness,
  SolidLabellingHarness,
  SolidLiveStateHarness,
  SolidMessageHarness,
  SolidNonModalOptionsHarness,
  SolidOpenOrderHarness,
  SolidOutletDisposalHarness,
  SolidOutletHarness,
  SolidPortalHarness,
  SolidPortalHostHarness,
  SolidDismissRequestHarness,
  SolidPrepareFailureHarness,
  SolidReconcileHarness,
  SolidShadowRootHarness,
  SolidSlideHarness,
  SolidStackPriorityHarness,
} from 'umbra/solid/__tests__/solid-modal.story';
import {
  VanillaBasicHarness,
  VanillaBusyHarness,
  VanillaClaimlessReclaimHarness,
  VanillaContainedHarness,
  VanillaDestroyHarness,
  VanillaDismissRequestHarness,
  VanillaExplicitHostHarness,
  VanillaFailingActionHarness,
  VanillaLabellingHarness,
  VanillaNoHostHarness,
  VanillaNonModalOptionsHarness,
  VanillaOpenRequestHarness,
  VanillaPortalHarness,
  VanillaPrepareFailureHarness,
  VanillaReconcileHarness,
  VanillaRestoreOnUnbindHarness,
  VanillaShadowRootHarness,
  VanillaShadowStackHarness,
  VanillaUnbindHarness,
} from 'umbra/vanilla/__tests__/bind-dialog.story';
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
} from 'umbra/actions/__tests__/use-dialog-actions.story';
import {
  RefusesEverythingHarness,
  OpenRequestHarness,
} from 'umbra/react/__tests__/open-request.story';
import {
  NoOutletHarness,
  OutletBasicHarness,
  OutletMultiHarness,
  OutletNestedHarness,
  OutletPaintTimingHarness,
  OutletTeardownHarness,
  OutletNullModalHarness,
} from 'umbra/react/__tests__/dialog-outlet.story';
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
  PortalHostHarness,
  PortalNonModalDefaultHarness,
  PortalNonModalOptInHarness,
  PortalOptInHarness,
  ReopenSettlesHarness,
  BackdropHitTestHarness,
  KeyPassthroughHarness,
  StableIdentityHarness,
  StructuralToggleHarness,
  TransitionToggleHarness,
  OpenAndWaitHarness,
  StackedModalsHarness,
  NestedHotkeyScopeHarness,
  FocusUnderAnotherModalHarness,
  EscWithoutFocusHarness,
  AccessibleNameHarness,
  BusyWhilePreparingHarness,
  RenderPhaseHarness,
  StylingSurfaceHarness,
} from 'umbra/react/__tests__/use-dialog.story';
import {
  DomEventHarness,
  EventSubscribeHarness,
  ImperativeHarness,
  LookupCollectionHarness,
  LookupFindHarness,
  LookupForegroundHarness,
  LookupUnregisteredHarness,
  MultiModalHarness,
  ModalVariantHarness,
  ModalVariantLookupHarness,
  NoProviderHarness,
  ProviderIsolationHarness,
  ScrollLockBothOpenHarness,
  ScrollLockHarness,
  ScrollLockTwoManagersHarness,
  UnregisteredNoOpHarness,
} from 'umbra/manager/__tests__/dialog-manager.story';
import {
  UseLookupForegroundHarness,
  UseLookupHarness,
  UseLookupUnregisteredHarness,
} from 'umbra/react/__tests__/use-lookup.story';
import { StoreContextHarness } from '@/shared/lib/__tests__/create-store-context.story';
import { UseStoreHarness } from '@/shared/lib/__tests__/use-store.story';
import {
  AsyncOpenMessageHarness,
  BasicMessageHarness,
  DataMessageHarness,
  OpenAndWaitMessageHarness,
} from 'umbra/react/__tests__/use-message-dialog.story';
import {
  BasicSlideHarness,
  DirectionSlideHarness,
  MultiDirectionSlideHarness,
  NonModalEscHotkeySlideHarness,
  OpenAndWaitSlideHarness,
} from 'umbra/react/__tests__/use-slide-dialog.story';

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
        title: 'Tab wraps inside the panel, or walks out of it',
        description:
          'Three stops with containFocus as a prop, so the same panel walks out when it is off and wraps when it is on. The outside button sits before the panel deliberately: with a forward Tab that has somewhere to go, "left the dialog" and "left the page" stop looking identical to document.activeElement.',
        component: RovingToolbarHarness,
        codeKey: 'story-focus-containment',
      },
      {
        title: 'The recovery scans its own dialog, not the one inside it',
        description:
          'A modal holding an open non-modal panel, where the recovery’s scan can meet a dialog that is not its own. Scanned with a plain querySelectorAll it reaches the nested panel’s controls, which Shift+Tab makes plain: it walks from the end, so the wrong subtree is the first thing it finds.',
        component: NestedPanelScanHarness,
        codeKey: 'story-focus-containment',
      },
      {
        title: 'A hidden stop is not a stop',
        description:
          'The middle control disappears with display: none rather than disabled, because the focusable selector already excludes a disabled control and would pass here without ever consulting visibility. The wrap has to land on something a user can actually reach.',
        component: HiddenStopHarness,
        codeKey: 'story-focus-containment',
      },
      {
        title: 'A contenteditable is a Tab stop with no attribute to find it by',
        description:
          'A panel ending in an editor: no tabindex, no href, no control tag, so a scan built from those never proposes it and the wrap hands focus back where it started. What Tab can stop on is wider than what a selector lists.',
        component: EditableContentHarness,
        codeKey: 'story-focus-containment',
      },
      {
        title: 'A dialog whose only stop is an editor',
        description:
          'Nothing but a contenteditable inside, so the Tab recovery has nowhere else to move and WebKit does not descend from a focused <dialog> — the keyboard is stuck without the recovery. No containFocus, deliberately: the recovery is the unconditional half and must not need the flag.',
        component: EditableOnlyHarness,
        codeKey: 'story-focus-containment',
      },
      {
        title: 'Tab out of an iframe, which no keydown listener hears',
        description:
          'A press inside an <iframe> reaches no listener in the parent document, so an approach built on keydown cannot see the Tab that leaves it. The browser still walks onto a focus marker placed after it, which is what the containment uses.',
        component: FramedContentHarness,
        codeKey: 'story-focus-containment',
      },
      {
        title: 'A panel opening underneath does not take the keyboard',
        description:
          'A non-modal panel opens beneath a modal that holds focus. It claims focusOnOpen on purpose, so the test cannot pass merely because nothing asked for focus — the dialog in front must keep it anyway. It opens from inside the modal’s render because the top layer swallows outside clicks.',
        component: OpeningFocusForegroundHarness,
        codeKey: 'story-opening-focus-foreground',
      },
      {
        title: 'Taking the keyboard back, with a claim to aim at',
        description:
          'The reclaim in the shape where focusOnOpen exists: the only way to tell "handed back where focus was" from "re-honoured the claim" is to have a claim and put focus somewhere else first.',
        component: ReclaimWithoutClaimHarness,
        codeKey: 'story-opening-focus-foreground',
      },
      {
        title: 'The same reclaim, across a shadow boundary',
        description:
          'The floor focuses a candidate and then asks who holds it. Asked of the document, a shadow root answers with its host — so a candidate that took focus perfectly well reads as a failure and the scan walks on to the dialog’s last control. It has to ask the dialog’s own root.',
        component: ShadowReclaimWithoutClaimHarness,
        codeKey: 'story-opening-focus-foreground',
      },
      {
        title: 'An explicit undefined removes a property',
        description:
          'applyStyle writes a style object onto an element and clears what the previous one set. An explicit undefined means remove, not write the string "undefined" — the difference between a cleared property and a broken one.',
        component: UndefinedClearsHarness,
        codeKey: 'story-apply-style',
      },
      {
        title: 'Telling “open” from “ready” from outside the modal',
        description:
          'phase describes the <dialog>, so opening is one frame wide however long prepare takes — isPreparing is the other axis, and a watcher that conflates them reports ready while the work is still running. prepare is held on a promise released from a button inside the dialog, because the top layer swallows a click anywhere else.',
        component: UseLookupPreparingHarness,
        codeKey: 'story-use-lookup-basic',
      },
      {
        title: 'A failed action, retried by its hotkey',
        description:
          'The button is the autofocus target and goes disabled while the action runs, so focus falls to the body meanwhile. Unless it is put back inside the dialog once the action settles, the keydown listener never hears the retry — the hotkey is dead and only the mouse still works.',
        component: ActionErrorHotkeyRetryHarness,
        codeKey: 'story-action-error-hotkey-retry',
      },
      {
        title: 'A contained dialog covers its host instead of displacing it',
        description:
          'A detail pane over the list it belongs to — the case “provide a sized, positioned host” does not cover. A height: 100% block is laid out after the content it is meant to cover, so in normal flow it pushes that content out of a fixed-height box instead of overlaying it.',
        component: ContainedOverlayHarness,
        codeKey: 'story-contained-overlay',
      },
      {
        title: 'The one arrangement where nobody answers the dismiss key',
        description:
          'A modal with dismissKey: false in front of a non-modal panel. Both halves decline correctly — the panel is no longer the foreground, the modal was told not to listen — and nothing closing is the right outcome, since dismissing the panel behind would close a dialog the user is not looking at.',
        component: EscAnsweredByNobodyHarness,
        codeKey: 'story-esc-answered-by-nobody',
      },
      {
        title: 'A name pointing at an element nobody rendered',
        description:
          'ariaLabelledBy referencing an id that does not resolve leaves the dialog announced as just “dialog”, and it looks correct in the source. The diagnostic reports it — and stays silent until setLogLevel, because a warning nobody asked for is noise on correct code.',
        component: DanglingLabelHarness,
        codeKey: 'story-labelling-diagnostics',
      },
      {
        title: 'A name that only exists once prepare settles',
        description:
          'The half the diagnostic must stay quiet about. The heading is not in the DOM while the work runs, so a check asked too early reports a dangling reference on a dialog that is perfectly labelled — which is why the check is deferred rather than run at open.',
        component: LateTitleHarness,
        codeKey: 'story-labelling-diagnostics',
      },
      {
        title: 'A name delivered a commit late, through DialogOutlet',
        description:
          'The other silence. Rendering through the outlet puts the labelled content in a commit after the dialog’s own, so the same too-early check would fire here too — on markup that arrives correctly, one frame later.',
        component: OutletLabelHarness,
        codeKey: 'story-labelling-diagnostics',
      },
      {
        title: 'prepare is handed an AbortSignal that fires on close',
        description:
          'Without it a request outlives what asked for it: landing on a closed modal, or still in flight when the next open starts its own — which is how a reopened dialog shows the previous attempt’s answer. The work here settles only through the signal, so nothing can pass by accident.',
        component: OnOpenAbortHarness,
        codeKey: 'story-on-open-abort',
      },
      {
        title: 'openAndWait waits for the next close, not a previous one',
        description:
          'A close resolver must be registered before the open, because replaying an earlier close is a wrong answer rather than a late one — which is why addCloseResolver is not public. prepare widens the window: a modal dismissed while it runs closes before anything would naively have subscribed.',
        component: OpenAndWaitOrderingHarness,
        codeKey: 'story-open-and-wait-ordering',
      },
      {
        title: 'A prepare that throws, and the only way to hear it',
        description:
          'The failure is silent by construction: the dialog is already on screen, isPreparing settles either way, aria-busy flips back to false, and the throw reaches log.error, which says nothing unless setLogLevel is on. onError is the reachable half, and both are asserted.',
        component: PrepareFailureHarness,
        codeKey: 'story-prepare-failure',
      },
      {
        title: 'A controlled <Panel open={…} />, on a real dialog',
        description:
          'Two claims a naive reconciliation gets wrong: the prop is authoritative, so a dialog opened from elsewhere is put back rather than left on screen with no way to close it; and a dismissal from inside settles once, without the prop reopening what the user just dismissed.',
        component: ReconcileOpenHarness,
        codeKey: 'story-reconcile-open',
      },
      {
        title: 'An action settling underneath does not take the keyboard',
        description:
          'Two non-modal panels, deliberately: behind a modal everything is inert, so the restore’s focus() is a silent no-op and the rule appears to hold whatever the code does. Nothing is inert here, so every engine would steal — and the guard has to be the library’s own.',
        component: RestoreNotInFrontHarness,
        codeKey: 'story-restore-not-in-front',
      },
      {
        title: 'A React dialog inside a shadow root',
        description:
          'A web component hosting a React tree, or a widget mounted to keep the host page’s CSS out. Both things a shadow boundary breaks fail quietly rather than throwing: adoptedStyleSheets does not cross it, so the dialog falls back to the UA backdrop, and document.activeElement answers with the host.',
        component: ShadowRootHarness,
        codeKey: 'story-shadow-root',
      },
      {
        title: 'An inline onKeyDown, which is a new function every render',
        description:
          'The regression fixture for the director’s granularity. focus.sync remembers, for one attachment, that an action is running; rebuild that attachment mid-action — which a caller’s inline arrow does on every render — and the memory goes with it, so the settle is missed and focus never comes back.',
        component: VolatileKeyDownHarness,
        codeKey: 'story-volatile-keydown',
      },
      {
        title: 'Which action is running, asked away from its button',
        description:
          'data-loading is that fact on the button, and reaches only whoever spreads the props. action.isRunning(reason) is the same fact for everything else — a header spinner, a field locked for one action, a label that changes for save and not for cancel. Observed while the action runs, not after: the harness holds it open on a promise the test releases.',
        component: ActionIsRunningHarness,
        codeKey: 'story-action-is-running',
      },
      {
        title: 'What an action returns is only DOM props',
        description:
          'The claim the whole action API rests on. Being agnostic of the UI put into it, the library ships the running state as data-loading rather than a loading prop named for one component family — so the set spreads onto a native <button> with nothing React refuses and nothing a wrapper has to translate.',
        component: DomSafeSpreadHarness,
        codeKey: 'story-dom-safe-spread',
      },
      {
        title: 'The spread, on a native button, as the docs promise it',
        description:
          'Every claim the API makes rests on “spread is the single binding pattern” being literally true. This puts one on a real <button> and checks what arrives — the type, the click, the disabled and busy state — rather than trusting the sentence.',
        component: SpreadContractHarness,
        codeKey: 'story-spread-contract',
      },
      {
        title: 'Entrance and exit keyframes that carry different properties',
        description:
          'The case the clearing half of applyStyle exists for. Without clearing what the previous style set, a dialog whose entrance animates scale and whose exit animates only opacity stays scaled down while fully opaque.',
        component: AsymmetricKeyframesHarness,
        codeKey: 'story-apply-style',
      },
      {
        title: 'Custom properties reach the element, camelCase reaches it too',
        description:
          'DialogStyle maps CSSStyleDeclaration, whose keys are camelCase — so a custom property like --x has no key there and needs the computed form. A style that silently fails to apply is invisible, which is why both spellings are asserted.',
        component: NameTranslationHarness,
        codeKey: 'story-apply-style',
      },
      {
        title: 'An open overlay owns Escape before the dialog does',
        description:
          'The window listener captures, so it runs first — and would close the dialog out from under a select that Escape should merely collapse. Two shapes: a control reporting its own open list, and a popup portaled out of the dialog. Declared with aria-expanded and a popup role, because that is what the guard reads.',
        component: DismissKeyOwnershipHarness,
        codeKey: 'story-dismiss-key-ownership',
      },
      {
        title: 'The predicate on its own, without the listener around it',
        description:
          'Asked directly rather than through a dismissal, because a caller that imports it gets the function and not the machinery — so it has to answer correctly standing alone.',
        component: KeyClaimProbeHarness,
        codeKey: 'story-dismiss-key-ownership',
      },
      {
        title: 'A modal whose Escape is a request, not a close',
        description:
          'The dialog reports and the state above it decides, as in any controlled wrapper. One that closed itself would leave the boolean upstream still saying true, and the next render would put it straight back on screen.',
        component: ControlledModalHarness,
        codeKey: 'story-dismiss-request',
      },
      {
        title: 'A panel whose click-outside is a request too',
        description:
          'The door a controlled surface could not hear until every dismissal went through the same one. Outside the top layer, the pointer reaches the page underneath — so the click is the library’s to notice and the owner’s to answer, exactly as the key is.',
        component: ControlledClickOutsideHarness,
        codeKey: 'story-dismiss-request',
      },
      {
        title: 'A non-modal panel that may decline the dismissal',
        description:
          'Outside the top layer, so the press comes from a button beside it — which a dialog-level listener would never hear. The window listener captures, so a press it swallows is one the page never sees, and declining has to mean the page still gets its key.',
        component: ControlledPanelHarness,
        codeKey: 'story-dismiss-request',
      },
      {
        title: 'dialog:open carries the element, not just the id',
        description:
          'The event a tag manager or a plain script can listen for having imported nothing. It carries the very node the dialog rendered to, which is what makes it useful beyond logging.',
        component: OpenEventInDocumentHarness,
        codeKey: 'story-open-event-element',
      },
      {
        title: 'The same event, for a dialog a document query cannot reach',
        description:
          'In a shadow root querySelector cannot see the dialog at all — and the event still carries it. That is the difference between an id a listener has to resolve and an element it is handed.',
        component: OpenEventInShadowHarness,
        codeKey: 'story-open-event-element',
      },
      {
        title: 'Two modal dialogs racing for the front',
        description:
          'The panel’s showModal() lands after the warning’s, so the platform paints it in front and the warning falls under its backdrop. The no-policy half is the baseline: a reorder that never happens, so the policy half is measured against something rather than asserted alone.',
        component: MultiRaiseHarness,
        codeKey: 'story-stack-priority-extra',
      },
      {
        title: 'A policy arriving after a dialog already holds the caret',
        description:
          'The smallest arrangement that reaches raiseDialog’s focus restore. Until prioritize is called the manager tracks no top layer, so the first sync compares the desired order against an empty one — and moving a modal dialog means closing and re-showing it, with a caret in the way.',
        component: LatePolicyFocusHarness,
        codeKey: 'story-stack-priority-extra',
      },
      {
        title: 'A control that disables itself keeps the keyboard',
        description:
          'Press "Do background work". The button disables itself while it runs, so the engine blurs it and focus lands on the page — where a modal’s keydown listener cannot hear it, leaving every hotkey dead but Escape, which the platform’s own cancel carries. The ring comes back to that button when it re-enables, and never to OK: parking an ordinary "saving…" on the confirm button is how the next Enter commits the dialog.',
        component: StrandedFocusHarness,
        codeKey: 'story-stranded-focus',
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
        title: 'aria-busy while prepare runs',
        description:
          'A dialog is on screen well before an async prepare settles — phase "open" with isPreparing true is the normal state of a loading modal. The <dialog> carries aria-busy for exactly that window, and carries "false" once it closes, so the off state is reachable rather than welded on.',
        component: BusyWhilePreparingHarness,
        codeKey: 'story-busy-while-preparing',
      },
      {
        title: 'The phase a render can see',
        description:
          'The render callback decides what is on screen, so it is handed the phase of the dialog it is drawing. It matters on the way out: an action stops running the moment its handler resolves, which is before the exit animation ends, so a label read from hasRunningAction alone reverts to its resting text with the panel still painted. Reading phase === \u0022closing\u0022 beside it holds the leaving state until it is gone.',
        component: RenderPhaseHarness,
        codeKey: 'story-render-phase',
      },
      {
        title: 'The styling surface',
        description:
          'The whole of it: --dialog-backdrop for the backdrop, data-dialog-id and data-dialog-type to reach one dialog or every non-modal one from CSS. No class names to learn, and nothing that requires knowing how the tree is built.',
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
        codeKey: 'story-use-dialog-basic',
      },
      {
        title: 'Transitions Toggled Between Opens',
        description:
          'The same <dialog> opened once with CSS transitions live and once with them disabled — the close path re-measures per open instead of trusting the first answer.',
        component: TransitionToggleHarness,
        codeKey: 'story-use-dialog-transition-toggle',
      },
      {
        title: 'Dismiss Key Passthrough',
        description:
          'A non-modal panel that refuses to dismiss while prepare is pending. The key it refuses still reaches the page’s own Escape handler; the key it acts on does not.',
        component: KeyPassthroughHarness,
        codeKey: 'story-use-dialog-key-passthrough',
      },
      {
        title: 'Structural Prop Toggle',
        description:
          'Flipping nonModal/portal while open changes the rendered structure, which a native <dialog> cannot survive — the modal is torn down and closed cleanly instead of being left stuck.',
        component: StructuralToggleHarness,
        codeKey: 'story-use-dialog-structural-toggle',
      },
      {
        title: 'Wait For Close',
        description: 'Awaits openAndWait(). Status reflects the resolved reason.',
        component: OpenAndWaitHarness,
        codeKey: 'story-use-dialog-open-and-wait',
      },
      {
        title: 'Non-Modal Dialog',
        description:
          'Opens with dialog.show() instead of showModal(). No backdrop, clicks pass through, z-index tracked via data-dialog-z.',
        component: NonModalHarness,
        codeKey: 'story-use-dialog-non-modal',
      },
      {
        title: 'Non-Modal Stack',
        description:
          'Two stacked non-modal dialogs with increasing z-index. Body scroll remains free.',
        component: NonModalStackHarness,
        codeKey: 'story-use-dialog-non-modal-stack',
      },
      {
        title: 'Non-Modal ESC Isolation',
        description:
          'ESC closes the panel even when focus is outside it, and does not propagate to underlying elements. leak-count stays 0.',
        component: NonModalEscIsolationHarness,
        codeKey: 'story-use-dialog-non-modal-esc-isolation',
      },
      {
        title: 'dismissOnClickOutside',
        description:
          'Non-modal with dismissOnClickOutside: true. Clicking outside the dialog closes it with reason "dismiss". Clicking inside does not.',
        component: NonModalClickOutsideHarness,
        codeKey: 'story-use-dialog-non-modal-click-outside',
      },
      {
        title: 'dismissOnClickOutside — Default (false)',
        description:
          'Non-modal without dismissOnClickOutside set. Clicking outside does not close the dialog — default is false.',
        component: NonModalClickOutsideDefaultHarness,
        codeKey: 'story-use-dialog-non-modal-click-outside-default',
      },
      {
        title: 'Custom dismissKey',
        description:
          'Modal with dismissKey: Delete — Delete closes with "dismiss", Escape does not.',
        component: CustomDismissKeyHarness,
        codeKey: 'story-use-dialog-custom-dismiss-key',
      },
      {
        title: 'dismissKey: false',
        description: 'Key dismissal disabled — only the explicit Close button works.',
        component: DismissKeyDisabledHarness,
        codeKey: 'story-use-dialog-dismiss-key-disabled',
      },
      {
        title: 'Non-Modal Custom dismissKey',
        description:
          'Non-modal with dismissKey: Delete. Delete closes from outside focus and does not leak. Escape ignored.',
        component: NonModalCustomDismissKeyHarness,
        codeKey: 'story-use-dialog-non-modal-custom-dismiss-key',
      },
      {
        title: 'Portal — Default (Inline)',
        description:
          'Modal dialog without portal (default). Dialog renders inline — parent is NOT document.body.',
        component: PortalDefaultHarness,
        codeKey: 'story-use-dialog-portal-default',
      },
      {
        title: 'Portal — Opt-In',
        description: 'Modal dialog with portal: true. Dialog is portaled to document.body.',
        component: PortalOptInHarness,
        codeKey: 'story-use-dialog-portal-opt-in',
      },
      {
        title: 'Portal — a host of the caller’s own',
        description:
          '`portal: true` is `document.body`, which is the wrong answer wherever the tree the dialog left was doing something. A getter names the host instead — here a themed container, so the custom property the dialog reads survives the move. A getter and not an element, because the host is still being rendered when the hook runs.',
        component: PortalHostHarness,
        codeKey: 'story-use-dialog-portal-host',
      },
      {
        title: 'Portal — Non-Modal Default (Inline)',
        description:
          'Non-modal dialog without portal (default). Dialog renders inline — parent is NOT document.body.',
        component: PortalNonModalDefaultHarness,
        codeKey: 'story-use-dialog-portal-non-modal-default',
      },
      {
        title: 'Portal — Non-Modal Opt-In',
        description:
          'Non-modal dialog with portal: true. Dialog is portaled to document.body. Click-through still works.',
        component: PortalNonModalOptInHarness,
        codeKey: 'story-use-dialog-portal-non-modal-opt-in',
      },
      {
        title: 'dismissWhilePreparing: false',
        description:
          'Modal with dismissWhilePreparing: false. ESC is blocked while prepare is running. Click "Resolve" to finish loading, then ESC closes.',
        component: DismissWhilePreparingDisabledHarness,
        codeKey: 'story-use-dialog-dismiss-while-preparing-disabled',
      },
      {
        title: 'dismissWhilePreparing — Default (true)',
        description:
          'Modal with default dismissWhilePreparing (true). ESC closes even while prepare is still running.',
        component: DismissWhilePreparingDefaultHarness,
        codeKey: 'story-use-dialog-dismiss-while-preparing-default',
      },
      {
        title: 'Reopen Settles',
        description:
          'Regression: open() always settles — calling it while the modal is already open resolves immediately instead of hanging.',
        component: ReopenSettlesHarness,
        codeKey: 'story-use-dialog-reopen-settles',
      },
      {
        title: 'Stable Identity',
        description:
          'open/openAndWait/handle keep the same reference across re-renders and a full open/close cycle — no ref dance needed to use them in effects.',
        component: StableIdentityHarness,
        codeKey: 'story-use-dialog-stable-identity',
      },
      {
        title: 'Backdrop Hit Testing',
        description:
          'A backdrop click is identified by its target, not coordinates: keyboard-activated buttons (which report a click at 0,0) must not dismiss, and content clicks must still bubble to ancestors.',
        component: BackdropHitTestHarness,
        codeKey: 'story-use-dialog-backdrop-hit-test',
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
        component: OpenAndWaitMessageHarness,
        codeKey: 'story-msg-open-and-wait',
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
        component: OpenAndWaitSlideHarness,
        codeKey: 'story-slide-open-and-wait',
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
        description: 'Modal renders via DialogOutlet — no {Modal} placed in JSX.',
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
      {
        title: 'Teardown',
        description:
          'A modal that unmounts while open must be dropped from the outlet’s map. Left registered, the outlet goes on rendering a <dialog> for a hook that no longer exists — on screen, in the top layer, and driven by nothing.',
        component: OutletTeardownHarness,
        codeKey: 'story-outlet-teardown',
      },
    ],
  },
  {
    label: 'The vanilla controller: a <dialog> you wrote yourself',
    stories: [
      {
        title: 'A fragment swapped underneath the controller',
        description:
          'The hypermedia case: a <dialog> arrives as server-written markup and is later replaced wholesale, the way htmx or Turbo swap a fragment. "Swap only" leaves the controller driving the node it was handed — the dialog on screen is a plain <dialog> again, carrying none of the library’s attributes, and Open does nothing. "Swap and rebind" runs the pair a caller owes: destroy(), then bind over what arrived.',
        component: VanillaSwapHarness,
        codeKey: 'story-vanilla-swap',
      },
      {
        title: 'The ordinary surface, on a <dialog> React only handed over',
        description:
          'Open, close, dismiss, hotkeys and the running state, driven by bindDialog over markup the caller wrote. Fair as a React component test precisely because the binding never renders: React makes the element and nothing else. Each harness passes its own createDialogManager() — the vanilla answer to DialogManagerProvider — or they leak into each other through the singleton.',
        component: VanillaBasicHarness,
        codeKey: 'story-vanilla-basic',
      },
      {
        title: 'Unbinding an action retires its declaration',
        description:
          'Backdrop dismissal is what makes it observable: it is opt-out with no actions declared and opt-in once there are. A declaration outliving its button would keep the dialog from dismissing, with nothing on screen to explain why.',
        component: VanillaUnbindHarness,
        codeKey: 'story-vanilla-unbind',
      },
      {
        title: 'Where focus lands after an action fails',
        description:
          'The hardest arrangement of the three bindings. Actions bind after bindDialog returns, so bindAction’s synchronous disabled write runs ahead of the focus coordinator’s subscriber — and the browser blurs a disabled element before anyone has read who was holding focus.',
        component: VanillaFailingActionHarness,
        codeKey: 'story-vanilla-failing-action',
      },
      {
        title: 'A contained panel against the default host',
        description:
          'nonModal: true without portal, positioned against the dialog’s parent — which must be a sized, positioned region or the panel collapses and every assertion passes vacuously. Nothing enters the top layer, so the region behind stays clickable: what pointerEvents on the host preserves.',
        component: VanillaContainedHarness,
        codeKey: 'story-vanilla-contained',
      },
      {
        title: 'The same panel, with the host named rather than inferred',
        description:
          'The dialog’s parent is a plain wrapper and the host is its grandparent, so a pass cannot be the default branch answering correctly by coincidence.',
        component: VanillaExplicitHostHarness,
        codeKey: 'story-vanilla-explicit-host',
      },
      {
        title: 'A contained dialog with nowhere to be contained',
        description:
          'No parent and no named host. The branch has to warn and carry on — throwing down the caller’s render, or silently styling document.body, are both worse than a panel that does not appear.',
        component: VanillaNoHostHarness,
        codeKey: 'story-vanilla-no-host',
      },
      {
        title: 'destroy() called from a button, not at unmount',
        description:
          'The coverage fixture reads its counters after the test body and before React’s cleanup, so teardown that only happens at unmount is teardown no assertion ever watched.',
        component: VanillaDestroyHarness,
        codeKey: 'story-vanilla-destroy',
      },
      {
        title: 'A backdrop click the owner answers',
        description:
          'The controller reaches the same last step the hook bindings do: with onDismissRequest set, the click is reported and the dialog is left alone rather than closed behind the owner’s back.',
        component: VanillaDismissRequestHarness,
        codeKey: 'story-vanilla-dismiss-request',
      },
      {
        title: 'The manager’s asking door, from a binding with no hooks',
        description:
          'onOpenRequest is forwarded to the manager, so a request the owner refuses is refused before anything opens — and requestOpenAndWait reports which of the two happened.',
        component: VanillaOpenRequestHarness,
        codeKey: 'story-vanilla-open-request',
      },
      {
        title: 'A hand-written <dialog> inside a shadow root',
        description:
          'Both things the boundary breaks fail quietly. adoptedStyleSheets does not cross it, so the library’s dialog::backdrop never applies; document.activeElement answers with the host, so a document-scoped focus check concludes focus left. React makes the host and nothing inside it.',
        component: VanillaShadowRootHarness,
        codeKey: 'story-vanilla-shadow-root',
      },
      {
        title: 'What unbinding hands back',
        description:
          'The caller’s markup outlives the controller, so bindAction’s writes are restored rather than cleared. The second button is disabled before it is ever bound — which a naive removeAttribute gets wrong by switching it on.',
        component: VanillaRestoreOnUnbindHarness,
        codeKey: 'story-vanilla-restore-on-unbind',
      },
      {
        title: 'aria-busy on a dialog the controller does not own',
        description:
          'destroy() unsubscribes before tearing the store down, so a controller destroyed mid-prepare never hears the notification that would clear the attribute. Observable only because the element outlives the controller.',
        component: VanillaBusyHarness,
        codeKey: 'story-vanilla-busy',
      },
      {
        title: 'The labelling diagnostic on markup the binding did not write',
        description:
          'The only binding where the failure is ordinary — the id and the aria-labelledby pointing at it are hand-written in two places. Neither dialog passes an aria option, which is the point: the check reads the element, so it sees these at all.',
        component: VanillaLabellingHarness,
        codeKey: 'story-vanilla-labelling',
      },
      {
        title: 'One manager over a shadow dialog and a light-DOM one',
        description:
          'Three things nothing else reaches. Reclaim across a shadow boundary asks the dialog’s own root, where a document-scoped answer is “focus left” forever. A raise is close() + showModal(), and close() queues its event — so it arrives with dialog.open already true, the only way a listener tells a raise from a real close. And prioritize through a non-React binding, which nothing else would fail on: the policy is core and binding-parity.test.ts compares export names.',
        component: VanillaShadowStackHarness,
        codeKey: 'story-vanilla-shadow-stack',
      },
      {
        title: 'The portal placement, without the relocation',
        description:
          'A controller cannot move markup the caller wrote, so portal: true here is the positioning alone. The dialog sits in a wrapper inside a transformed ancestor — the containing block fixed resolves against instead of the viewport — so which of the two halves arrived is visible.',
        component: VanillaPortalHarness,
        codeKey: 'story-vanilla-portal',
      },
      {
        title: 'containFocus, click-outside and a custom dismiss key, all non-modal',
        description:
          'containFocus is the Tab wrap show() does not give, and the union rejects dismissal on a modal dialog. The instant animation is load-bearing: with the default 200 ms exit a closing panel still reports isVisible, so “still open after the press” and “closed” look the same.',
        component: VanillaNonModalOptionsHarness,
        codeKey: 'story-vanilla-non-modal-options',
      },
      {
        title: 'reconcileOpen driven from the controller’s own snapshot',
        description:
          "Why phase is exposed on this binding alone: there is no render pass to be the clock. The 120 ms exit is deliberate — the window where phase is 'closing' while isVisible is still true is the whole subject.",
        component: VanillaReconcileHarness,
        codeKey: 'story-vanilla-reconcile',
      },
      {
        title: 'A modal that claimed no opening focus',
        description:
          'A non-modal panel opens underneath it. With no focusOnOpen marker to aim at, the reclaim falls through to dialog.focus(), which an open <dialog> refuses. Two focusables, because with one “handed back to the first focusable” and “focus never moved” are the same element.',
        component: VanillaClaimlessReclaimHarness,
        codeKey: 'story-vanilla-claimless-reclaim',
      },
      {
        title: 'A prepare that throws, heard through onError',
        description:
          'Its own harness because there is no render pass — the state reaches the page through the caller’s own listener. aria-busy, the library’s one owned attribute sitting on the caller’s markup, says the settle reached the element and not only the store.',
        component: VanillaPrepareFailureHarness,
        codeKey: 'story-vanilla-prepare-failure',
      },
    ],
  },
  {
    label: 'The Solid binding: the same surface, fine-grained',
    stories: [
      {
        title: 'The Solid binding’s ordinary surface, written with h',
        description:
          'Solid’s JSX needs babel-preset-solid and the component-test bundle is React’s — harmless, because h and compiled JSX produce the same calls, and hyperscript detects an action’s getters through the property descriptor. Each app brings its own DialogManagerProvider: the global test wrapper provides React’s only, so without one these would register with the module singleton and leak into each other.',
        component: SolidBasicHarness,
        codeKey: 'story-solid-basic',
      },
      {
        title: 'The same Solid root, mounted inside a shadow root',
        description:
          'Its own component rather than a prop, because the mount target is the whole subject. adoptedStyleSheets does not cross the boundary, so the library’s dialog::backdrop never applies, and document.activeElement answers with the host. The shadow is reused across a remount — attachShadow throws on a host that already has one.',
        component: SolidShadowRootHarness,
        codeKey: 'story-solid-shadow-root',
      },
      {
        title: 'The accessible name and aria-busy, written from a render effect',
        description:
          'Solid writes them onto its own <dialog> from an effect rather than a one-shot loop, so “written at all” and “still written next transition” are two claims. The gate is released from inside the dialog, which owns the top layer while it is open.',
        component: SolidBusyHarness,
        codeKey: 'story-solid-busy',
      },
      {
        title: 'The labelling diagnostic, re-run when prepare settles',
        description:
          'Solid’s lifecycle effect tracks what its body reads, so the check re-runs on a name that arrives late only because isPreparing is passed in. The late-title half is what catches a version that does not.',
        component: SolidLabellingHarness,
        codeKey: 'story-solid-labelling',
      },
      {
        title: 'The live fields on the hook’s return, read outside render',
        description:
          'The copy a trigger button reads while the modal works. They are getters over signals here, so “reaches the return” and “stays live” are two claims and only the first is a type error — which is why all of it is asserted outside render, where a frozen getter never moves.',
        component: SolidLiveStateHarness,
        codeKey: 'story-solid-live-state',
      },
      {
        title: 'The declaration window a fine-grained renderer closes by hand',
        description:
          'Backdrop dismissal is opt-out with no actions and opt-in with them, so once the button is gone a click must dismiss again — which it never would without engine.undeclare running on that button’s own cleanup.',
        component: SolidDeclarationHarness,
        codeKey: 'story-solid-declaration',
      },
      {
        title: 'An outlet takes the dialog, and Modal becomes null',
        description:
          'The same contract React’s has, which is the point of showing it here: the outlet is core, so the only thing that would notice a binding no longer reaching it is a test on that binding.',
        component: SolidOutletHarness,
        codeKey: 'story-solid-outlet',
      },
      {
        title: 'The slide template, and the one thing only Solid can get wrong',
        description:
          'useSlideDialog composes the render args with direction through mergeProps, not a spread. A spread freezes every getter — direction would still be right and isPreparing would never come back, so the second is the assertion.',
        component: SolidSlideHarness,
        codeKey: 'story-solid-slide',
      },
      {
        title: 'The message template, deliberately a smoke test',
        description:
          'It is the same three lines React’s is, so anything beyond “it builds a dialog from this binding” would be testing the shared half twice.',
        component: SolidMessageHarness,
        codeKey: 'story-solid-message',
      },
      {
        title: 'The three pieces of onCleanup work a binding owes',
        description:
          'Unregistering from the manager, retiring the outlet entry, removing a portaled element from document.body. A child function disposes them, since hyperscript re-runs it and disposes the owner of the branch it replaces — which is Solid’s unmount.',
        component: SolidDisposalHarness,
        codeKey: 'story-solid-disposal',
      },
      {
        title: 'The same disposal, one level down',
        description:
          'The outlet has to forget it too. Left registered, it goes on rendering a <dialog> for a hook that no longer exists.',
        component: SolidOutletDisposalHarness,
        codeKey: 'story-solid-outlet-disposal',
      },
      {
        title: 'portal: true, where the binding mounts the element itself',
        description:
          'The one place the two hook bindings’ surfaces differ in what they hand back rather than in how it updates: Modal stays null, because there is nothing left for the caller to place.',
        component: SolidPortalHarness,
        codeKey: 'story-solid-portal',
      },
      {
        title: 'A portal into a host the caller owns',
        description:
          'Solid resolves the host once, in the setup body, so it has to exist before the modal does — a shell or a design-system root, not a node from the modal’s own JSX.',
        component: SolidPortalHostHarness,
        codeKey: 'story-solid-portal-host',
      },
      {
        title: 'A backdrop click the owner answers',
        description:
          'The door most likely to be missed: a handler that closed the store itself would work perfectly and ignore onDismissRequest, so a controlled surface would answer Escape and reopen itself on a backdrop click.',
        component: SolidDismissRequestHarness,
        codeKey: 'story-solid-dismiss-request',
      },
      {
        title: 'A contained non-modal panel, against a host the binding creates',
        description:
          'Nothing enters the top layer, so the placement is the whole behaviour — and the host is library-owned here rather than the caller’s markup, which is what separates this from the vanilla contained card.',
        component: SolidContainedHarness,
        codeKey: 'story-solid-contained',
      },
      {
        title: 'prioritize through Solid: a policy that outranks open order',
        description:
          'Inherited through the wholesale re-export, so nothing would fail if a binding stopped reaching it — binding-parity.test.ts compares export names. Two silent breakers: the policy is installed at setup, a Solid body running once, so onCleanup owns the disposer; and the sizes are strings, since applyStyle writes them verbatim and a bare 300 type-checks, emits nothing, and stops the dialogs overlapping.',
        component: SolidStackPriorityHarness,
        codeKey: 'story-solid-stack-priority',
      },
      {
        title: 'The same two dialogs with no policy at all',
        description:
          'The baseline the card above is measured against: a reorder that never happened looks identical to one that was not needed, so the false half is what makes the true half mean something.',
        component: SolidOpenOrderHarness,
        codeKey: 'story-solid-open-order',
      },
      {
        title: 'Five options in one app, each with its own probe',
        description:
          'containFocus, dismissOnClickOutside, a custom dismissKey, a prepare aborted by its own close, and onOpenRequest. One app rather than five because they make the same claim — that these reach the shared attach* functions from this binding’s effects. Non-modal throughout: containFocus is the Tab wrap show() does not give, and the union rejects the pair on a modal.',
        component: SolidNonModalOptionsHarness,
        codeKey: 'story-solid-non-modal-options',
      },
      {
        title: 'reconcileOpen driven from a Solid signal',
        description:
          'A controlled open prop, with createEffect where React writes useEffect. Non-modal, so the buttons driving the signal stay reachable from outside the dialog.',
        component: SolidReconcileHarness,
        codeKey: 'story-solid-reconcile',
      },
      {
        title: 'Focus restored after an action that rejects',
        description:
          'Modal, and two focusables: the target is whoever held focus when the action started, so with one element a restore and focus never moving are the same observation, and non-modal would let focus sit outside. The opening focus is deliberately the other button — it is the floor the restore falls to, so a test can tell landing on the right one from landing anywhere.',
        component: SolidFailedActionHarness,
        codeKey: 'story-solid-failed-action',
      },
      {
        title: 'The floor under reclaimFocus, on the second hook binding',
        description:
          'createFocusCoordinator is shared but when each binding syncs it is not — Solid’s body runs once where React’s re-runs. Neither action claims focusOnOpen, which is what puts this on the floor’s path: a claim would give the reclaim a marker, and lastFocusInside is empty too, its focusin listener attaching after showModal() has already placed the opening focus.',
        component: SolidClaimlessReclaimHarness,
        codeKey: 'story-solid-claimless-reclaim',
      },
      {
        title: 'A prepare that throws, reported through onError',
        description:
          'Measured rather than inherited: React reads the callback through a ref, so a teardown reports to whichever onError is current, while Solid passes options.onError straight through. Two routes to the same guarantee is two chances to lose it.',
        component: SolidPrepareFailureHarness,
        codeKey: 'story-solid-prepare-failure',
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
          'The same two buttons against a dialog that declared no onOpenRequest. Asking is refused and logged; instructing still opens it, because the two doors are separate.',
        component: RefusesEverythingHarness,
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
        title: 'Two Managers, Both Open',
        description:
          'The other half: both managers hold an open modal, so both claim the body scroll lock. The first to close must release nothing — which is why the lock counts owners in a Set rather than a boolean.',
        component: ScrollLockBothOpenHarness,
        codeKey: 'story-dm-scroll-lock-both-open',
      },
      {
        title: 'Modal vs Non-Modal',
        description:
          'Modal and non-modal dialogs side by side — only modal ones lock body scroll, and getOpen() can be filtered to either.',
        component: ModalVariantHarness,
        codeKey: 'story-dm-modal-variant',
      },
      {
        title: 'Variant Lookup Queries',
        description:
          "lookup().getOpen('modal') / ('non-modal') read live state at call time, split by how the dialog was shown.",
        component: ModalVariantLookupHarness,
        codeKey: 'story-dm-modal-variant-lookup',
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
          'A page taller than the viewport with a right-aligned marker and a fixed bar. Opening the modal dialog locks scrolling and reserves the reclaimed scrollbar width, so nothing shifts; the fixed bar pads itself from --dialog-scrollbar-width. The non-modal never locks.',
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
          'Listens to dialog:open and dialog:close on document. Verifies id, template, and reason in the CustomEvent detail for both modal and slide types.',
        component: DomEventHarness,
        codeKey: 'story-dm-dom-events',
      },
      {
        title: 'Lookup — Find',
        description:
          'Tests lookup(id) for registered and unregistered modals. Displays DialogInfo fields.',
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
