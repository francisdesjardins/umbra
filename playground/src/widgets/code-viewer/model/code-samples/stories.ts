/**
 * The library's component-test harnesses, rendered live by `/stories` and shown here as source —
 * the largest of the three groups, for the one route that needs it. See `codeSamples.ts`.
 */
import storyUseModalBasicSrc from 'umbra/react/__tests__/use-modal/basic.story.tsx?raw';
import storyUseModalOpenAndWaitSrc from 'umbra/react/__tests__/use-modal/open-and-wait.story.tsx?raw';
import storyUseModalNonModalSrc from 'umbra/react/__tests__/use-modal/non-modal.story.tsx?raw';
import storyUseModalNonModalStackSrc from 'umbra/react/__tests__/use-modal/non-modal-stack.story.tsx?raw';
import storyUseModalNonModalEscIsolationSrc from 'umbra/react/__tests__/use-modal/non-modal-esc-isolation.story.tsx?raw';
import storyUseModalNonModalClickOutsideSrc from 'umbra/react/__tests__/use-modal/non-modal-click-outside.story.tsx?raw';
import storyUseModalNonModalClickOutsideDefaultSrc from 'umbra/react/__tests__/use-modal/non-modal-click-outside-default.story.tsx?raw';
import storyUseModalCustomDismissKeySrc from 'umbra/react/__tests__/use-modal/custom-dismiss-key.story.tsx?raw';
import storyUseModalDismissKeyDisabledSrc from 'umbra/react/__tests__/use-modal/dismiss-key-disabled.story.tsx?raw';
import storyUseModalNonModalCustomDismissKeySrc from 'umbra/react/__tests__/use-modal/non-modal-custom-dismiss-key.story.tsx?raw';
import storyUseModalPortalDefaultSrc from 'umbra/react/__tests__/use-modal/portal-default.story.tsx?raw';
import storyUseModalPortalOptInSrc from 'umbra/react/__tests__/use-modal/portal-opt-in.story.tsx?raw';
import storyUseModalPortalNonModalDefaultSrc from 'umbra/react/__tests__/use-modal/portal-non-modal-default.story.tsx?raw';
import storyUseModalPortalNonModalOptInSrc from 'umbra/react/__tests__/use-modal/portal-non-modal-opt-in.story.tsx?raw';
import storyUseModalDismissWhilePreparingSrc from 'umbra/react/__tests__/use-modal/dismiss-while-preparing.story.tsx?raw';
import storyUseModalReopenSettlesSrc from 'umbra/react/__tests__/use-modal/reopen-settles.story.tsx?raw';
import storyUseModalStableIdentitySrc from 'umbra/react/__tests__/use-modal/stable-identity.story.tsx?raw';
import storyUseModalBackdropHitTestSrc from 'umbra/react/__tests__/use-modal/backdrop-hit-test.story.tsx?raw';
import storyOutletPaintTimingSrc from 'umbra/react/__tests__/modal-outlet/outlet-paint-timing.story.tsx?raw';
import storyOutletTeardownSrc from 'umbra/react/__tests__/modal-outlet/outlet-teardown.story.tsx?raw';
import storyActionsBasicSrc from 'umbra/actions/__tests__/use-modal-actions/basic-controller.story.tsx?raw';
import storyActionsErrorSrc from 'umbra/actions/__tests__/use-modal-actions/error-controller.story.tsx?raw';
import storyActionsHotkeySrc from 'umbra/actions/__tests__/use-modal-actions/hotkey-controller.story.tsx?raw';
import storyActionsDefinitionSrc from 'umbra/actions/__tests__/use-modal-actions/definition-controller.story.tsx?raw';
import storyFocusOnOpenSrc from 'umbra/actions/__tests__/use-modal-actions/focus-on-open.story.tsx?raw';
import storyStackedModalsSrc from 'umbra/react/__tests__/use-modal/stacked-modals.story.tsx?raw';
import storyNestedHotkeyScopeSrc from 'umbra/react/__tests__/use-modal/nested-hotkey-scope.story.tsx?raw';
import storyFocusUnderAnotherModalSrc from 'umbra/react/__tests__/use-modal/focus-under-another-modal.story.tsx?raw';
import storyEscWithoutFocusSrc from 'umbra/react/__tests__/use-modal/esc-without-focus.story.tsx?raw';
import storyStrandedFocusSrc from 'umbra/core/__tests__/stranded-focus.story.tsx?raw';
import storyApplyStyleSrc from 'umbra/core/__tests__/apply-style.story.tsx?raw';
import storyDismissRequestSrc from 'umbra/core/__tests__/dismiss-request.story.tsx?raw';
import storyDismissKeyOwnershipSrc from 'umbra/core/__tests__/dismiss-key-ownership.story.tsx?raw';
import storyFocusContainmentSrc from 'umbra/core/__tests__/focus-containment.story.tsx?raw';
import storyOpeningFocusSrc from 'umbra/core/__tests__/opening-focus-foreground.story.tsx?raw';
import storyVanillaSwapSrc from 'umbra/vanilla/__tests__/swap.story.tsx?raw';
import storyAccessibleNameSrc from 'umbra/react/__tests__/use-modal/accessible-name.story.tsx?raw';
import storyBusyWhilePreparingSrc from 'umbra/react/__tests__/use-modal/busy-while-preparing.story.tsx?raw';
import storyStylingSurfaceSrc from 'umbra/react/__tests__/use-modal/styling-surface.story.tsx?raw';
import storyActionsFocusSrc from 'umbra/actions/__tests__/use-modal-actions/focus-restoration.story.tsx?raw';
import storyActionsDismissCollisionSrc from 'umbra/actions/__tests__/use-modal-actions/dismiss-key-collision.story.tsx?raw';
import storyActionsActionBasicSrc from 'umbra/actions/__tests__/use-modal-actions/modal-action-basic.story.tsx?raw';
import storyActionsCustomHandlerSrc from 'umbra/actions/__tests__/use-modal-actions/modal-action-custom-handler.story.tsx?raw';
import storyActionsActionHotkeySrc from 'umbra/actions/__tests__/use-modal-actions/modal-action-hotkey.story.tsx?raw';
import storyActionsActionMultipleSrc from 'umbra/actions/__tests__/use-modal-actions/modal-action-multiple.story.tsx?raw';
import storyActionsReasonSourceSrc from 'umbra/actions/__tests__/use-modal-actions/reason-source.story.tsx?raw';
import storyActionsHotkeyWhilePreparingSrc from 'umbra/actions/__tests__/use-modal-actions/hotkey-while-preparing.story.tsx?raw';
import storyUseModalTransitionToggleSrc from 'umbra/react/__tests__/use-modal/transition-toggle.story.tsx?raw';
import storyUseModalKeyPassthroughSrc from 'umbra/react/__tests__/use-modal/key-passthrough.story.tsx?raw';
import storyDmScrollLockBothOpenSrc from 'umbra/manager/__tests__/dialog-manager/scroll-lock-both-open.story.tsx?raw';
import storyDmScrollLockTwoManagersSrc from 'umbra/manager/__tests__/dialog-manager/scroll-lock-two-managers.story.tsx?raw';
import storyDmModalVariantSrc from 'umbra/manager/__tests__/dialog-manager/modal-variant.story.tsx?raw';
import storyDmProviderIsolationSrc from 'umbra/manager/__tests__/dialog-manager/provider-isolation.story.tsx?raw';
import storyUseModalStructuralToggleSrc from 'umbra/react/__tests__/use-modal/structural-toggle.story.tsx?raw';
import storyActionsVanillaAriaSrc from 'umbra/actions/__tests__/use-modal-actions/vanilla-aria-keyshortcuts.story.tsx?raw';
import storyOpenRequestSrc from 'umbra/react/__tests__/open-request.story.tsx?raw';
import storyDmImperativeSrc from 'umbra/manager/__tests__/dialog-manager/imperative.story.tsx?raw';
import storyDmEventSubscribeSrc from 'umbra/manager/__tests__/dialog-manager/event-subscribe.story.tsx?raw';
import storyDmMultiModalSrc from 'umbra/manager/__tests__/dialog-manager/multi-modal.story.tsx?raw';
import storyDmScrollLockSrc from 'umbra/manager/__tests__/dialog-manager/scroll-lock.story.tsx?raw';
import storyDmUnregisteredSrc from 'umbra/manager/__tests__/dialog-manager/unregistered-no-op.story.tsx?raw';
import storyUseStoreSrc from '@/shared/lib/__tests__/use-store.story.tsx?raw';
import storyStoreContextSrc from '@/shared/lib/__tests__/create-store-context.story.tsx?raw';
import storyDmDomEventsSrc from 'umbra/manager/__tests__/dialog-manager/dom-events.story.tsx?raw';
import storyDmLookupSrc from 'umbra/manager/__tests__/dialog-manager/lookup.story.tsx?raw';
import storyUseLookupSrc from 'umbra/react/__tests__/use-lookup.story.tsx?raw';
import storyActionIsRunningSrc from 'umbra/actions/__tests__/use-modal-actions/action-is-running.story.tsx?raw';
import storyDomSafeSpreadSrc from 'umbra/actions/__tests__/use-modal-actions/dom-safe-spread.story.tsx?raw';
import storySpreadContractSrc from 'umbra/actions/__tests__/use-modal-actions/spread-contract.story.tsx?raw';
import storyOpenEventElementSrc from 'umbra/manager/__tests__/open-event-element.story.tsx?raw';
import storyStackPrioritySrc from 'umbra/manager/__tests__/stack-priority.story.tsx?raw';
import storyActionErrorHotkeyRetrySrc from 'umbra/react/__tests__/use-modal/action-error-hotkey-retry.story.tsx?raw';
import storyContainedOverlaySrc from 'umbra/react/__tests__/use-modal/contained-overlay.story.tsx?raw';
import storyEscAnsweredByNobodySrc from 'umbra/react/__tests__/use-modal/esc-answered-by-nobody.story.tsx?raw';
import storyLabellingDiagnosticsSrc from 'umbra/react/__tests__/use-modal/labelling-diagnostics.story.tsx?raw';
import storyOnOpenAbortSrc from 'umbra/react/__tests__/use-modal/on-open-abort.story.tsx?raw';
import storyOpenAndWaitOrderingSrc from 'umbra/react/__tests__/use-modal/open-and-wait-ordering.story.tsx?raw';
import storyPrepareFailureSrc from 'umbra/react/__tests__/use-modal/prepare-failure.story.tsx?raw';
import storyReconcileOpenSrc from 'umbra/react/__tests__/use-modal/reconcile-open.story.tsx?raw';
import storyRestoreNotInFrontSrc from 'umbra/react/__tests__/use-modal/restore-not-in-front.story.tsx?raw';
import storyShadowRootSrc from 'umbra/react/__tests__/use-modal/shadow-root.story.tsx?raw';
import storyVolatileKeyDownSrc from 'umbra/react/__tests__/use-modal/volatile-keydown.story.tsx?raw';
import storyOutletBasicSrc from 'umbra/react/__tests__/modal-outlet/outlet-basic.story.tsx?raw';
import storyOutletNullModalSrc from 'umbra/react/__tests__/modal-outlet/outlet-null-modal.story.tsx?raw';
import storyOutletNoOutletSrc from 'umbra/react/__tests__/modal-outlet/no-outlet.story.tsx?raw';
import storyOutletMultiSrc from 'umbra/react/__tests__/modal-outlet/outlet-multi.story.tsx?raw';
import storyOutletNestedSrc from 'umbra/react/__tests__/modal-outlet/outlet-nested.story.tsx?raw';
import storyMsgBasicSrc from 'umbra/react/__tests__/use-message-modal/basic-message.story.tsx?raw';
import storyMsgOpenAndWaitSrc from 'umbra/react/__tests__/use-message-modal/open-and-wait-message.story.tsx?raw';
import storyMsgAsyncOpenSrc from 'umbra/react/__tests__/use-message-modal/async-open-message.story.tsx?raw';
import storyMsgDataSrc from 'umbra/react/__tests__/use-message-modal/data-message.story.tsx?raw';
import storySlideBasicSrc from 'umbra/react/__tests__/use-slide-modal/basic-slide.story.tsx?raw';
import storySlideDirectionSrc from 'umbra/react/__tests__/use-slide-modal/direction-slide.story.tsx?raw';
import storySlideOpenAndWaitSrc from 'umbra/react/__tests__/use-slide-modal/open-and-wait-slide.story.tsx?raw';
import storySlideMultiDirectionSrc from 'umbra/react/__tests__/use-slide-modal/multi-direction-slide.story.tsx?raw';
import storySlideNonModalEscHotkeySrc from 'umbra/react/__tests__/use-slide-modal/non-modal-esc-hotkey.story.tsx?raw';

export const stories: Record<string, string> = {
  'story-use-modal-basic': storyUseModalBasicSrc,
  'story-use-modal-open-and-wait': storyUseModalOpenAndWaitSrc,
  'story-use-modal-non-modal': storyUseModalNonModalSrc,
  'story-use-modal-non-modal-stack': storyUseModalNonModalStackSrc,
  'story-use-modal-non-modal-esc-isolation': storyUseModalNonModalEscIsolationSrc,
  'story-use-modal-non-modal-click-outside': storyUseModalNonModalClickOutsideSrc,
  'story-use-modal-non-modal-click-outside-default': storyUseModalNonModalClickOutsideDefaultSrc,
  'story-use-modal-custom-dismiss-key': storyUseModalCustomDismissKeySrc,
  'story-use-modal-dismiss-key-disabled': storyUseModalDismissKeyDisabledSrc,
  'story-use-modal-non-modal-custom-dismiss-key': storyUseModalNonModalCustomDismissKeySrc,
  'story-use-modal-portal-default': storyUseModalPortalDefaultSrc,
  'story-use-modal-portal-opt-in': storyUseModalPortalOptInSrc,
  'story-use-modal-portal-non-modal-default': storyUseModalPortalNonModalDefaultSrc,
  'story-use-modal-portal-non-modal-opt-in': storyUseModalPortalNonModalOptInSrc,
  'story-use-modal-dismiss-while-preparing-disabled': storyUseModalDismissWhilePreparingSrc,
  'story-use-modal-dismiss-while-preparing-default': storyUseModalDismissWhilePreparingSrc,
  'story-use-modal-reopen-settles': storyUseModalReopenSettlesSrc,
  'story-use-modal-stable-identity': storyUseModalStableIdentitySrc,
  'story-use-modal-backdrop-hit-test': storyUseModalBackdropHitTestSrc,
  'story-outlet-paint-timing': storyOutletPaintTimingSrc,
  'story-outlet-teardown': storyOutletTeardownSrc,
  'story-action-basic': storyActionsBasicSrc,
  'story-action-error': storyActionsErrorSrc,
  'story-action-hotkey': storyActionsHotkeySrc,
  'story-action-definition': storyActionsDefinitionSrc,
  'story-focus-on-open': storyFocusOnOpenSrc,
  'story-stacked-modals': storyStackedModalsSrc,
  'story-nested-hotkey-scope': storyNestedHotkeyScopeSrc,
  'story-focus-under-another-modal': storyFocusUnderAnotherModalSrc,
  'story-esc-without-focus': storyEscWithoutFocusSrc,
  'story-stranded-focus': storyStrandedFocusSrc,
  'story-apply-style': storyApplyStyleSrc,
  'story-dismiss-request': storyDismissRequestSrc,
  'story-dismiss-key-ownership': storyDismissKeyOwnershipSrc,
  'story-focus-containment': storyFocusContainmentSrc,
  'story-opening-focus-foreground': storyOpeningFocusSrc,
  'story-vanilla-swap': storyVanillaSwapSrc,
  'story-accessible-name': storyAccessibleNameSrc,
  'story-busy-while-preparing': storyBusyWhilePreparingSrc,
  'story-styling-surface': storyStylingSurfaceSrc,
  'story-action-focus': storyActionsFocusSrc,
  'story-action-dismiss-collision': storyActionsDismissCollisionSrc,
  'story-action-action-basic': storyActionsActionBasicSrc,
  'story-action-action-custom-handler': storyActionsCustomHandlerSrc,
  'story-action-action-hotkey': storyActionsActionHotkeySrc,
  'story-action-action-multiple': storyActionsActionMultipleSrc,
  'story-action-reason-source': storyActionsReasonSourceSrc,
  'story-action-hotkey-while-preparing': storyActionsHotkeyWhilePreparingSrc,
  'story-use-modal-transition-toggle': storyUseModalTransitionToggleSrc,
  'story-use-modal-key-passthrough': storyUseModalKeyPassthroughSrc,
  'story-dm-scroll-lock-both-open': storyDmScrollLockBothOpenSrc,
  'story-dm-scroll-lock-two-managers': storyDmScrollLockTwoManagersSrc,
  'story-dm-modal-variant': storyDmModalVariantSrc,
  'story-dm-modal-variant-lookup': storyDmModalVariantSrc,
  'story-dm-provider-isolation': storyDmProviderIsolationSrc,
  'story-dm-no-provider': storyDmProviderIsolationSrc,
  'story-use-modal-structural-toggle': storyUseModalStructuralToggleSrc,
  'story-action-vanilla-aria': storyActionsVanillaAriaSrc,
  'story-action-broken-aria': storyActionsVanillaAriaSrc,
  'story-open-request': storyOpenRequestSrc,
  'story-dm-imperative': storyDmImperativeSrc,
  'story-dm-event-subscribe': storyDmEventSubscribeSrc,
  'story-dm-multi-modal': storyDmMultiModalSrc,
  'story-dm-scroll-lock': storyDmScrollLockSrc,
  'story-dm-unregistered': storyDmUnregisteredSrc,
  'story-store-use-store': storyUseStoreSrc,
  'story-store-context': storyStoreContextSrc,
  'story-dm-dom-events': storyDmDomEventsSrc,
  'story-dm-lookup-find': storyDmLookupSrc,
  'story-dm-lookup-collection': storyDmLookupSrc,
  'story-dm-lookup-foreground': storyDmLookupSrc,
  'story-dm-lookup-unregistered': storyDmLookupSrc,
  'story-use-lookup-basic': storyUseLookupSrc,
  'story-action-is-running': storyActionIsRunningSrc,
  'story-dom-safe-spread': storyDomSafeSpreadSrc,
  'story-spread-contract': storySpreadContractSrc,
  'story-open-event-element': storyOpenEventElementSrc,
  'story-stack-priority-extra': storyStackPrioritySrc,
  'story-action-error-hotkey-retry': storyActionErrorHotkeyRetrySrc,
  'story-contained-overlay': storyContainedOverlaySrc,
  'story-esc-answered-by-nobody': storyEscAnsweredByNobodySrc,
  'story-labelling-diagnostics': storyLabellingDiagnosticsSrc,
  'story-on-open-abort': storyOnOpenAbortSrc,
  'story-open-and-wait-ordering': storyOpenAndWaitOrderingSrc,
  'story-prepare-failure': storyPrepareFailureSrc,
  'story-reconcile-open': storyReconcileOpenSrc,
  'story-restore-not-in-front': storyRestoreNotInFrontSrc,
  'story-shadow-root': storyShadowRootSrc,
  'story-volatile-keydown': storyVolatileKeyDownSrc,
  'story-use-lookup-unregistered': storyUseLookupSrc,
  'story-use-lookup-foreground': storyUseLookupSrc,
  'story-outlet-basic': storyOutletBasicSrc,
  'story-outlet-null-modal': storyOutletNullModalSrc,
  'story-outlet-no-outlet': storyOutletNoOutletSrc,
  'story-outlet-multi': storyOutletMultiSrc,
  'story-outlet-nested': storyOutletNestedSrc,
  'story-msg-basic': storyMsgBasicSrc,
  'story-msg-open-and-wait': storyMsgOpenAndWaitSrc,
  'story-msg-async-open': storyMsgAsyncOpenSrc,
  'story-msg-data': storyMsgDataSrc,
  'story-slide-basic': storySlideBasicSrc,
  'story-slide-direction': storySlideDirectionSrc,
  'story-slide-open-and-wait': storySlideOpenAndWaitSrc,
  'story-slide-multi-direction': storySlideMultiDirectionSrc,
  'story-slide-non-modal-esc-hotkey': storySlideNonModalEscHotkeySrc,
};
