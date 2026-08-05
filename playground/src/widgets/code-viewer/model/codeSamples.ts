// ── Playground examples ──────────────────────────────────────────────────────
import cosmicOverrideSrc from '@/pages/advanced/examples/cosmic-override.tsx?raw';
import domEventsSrc from '@/pages/advanced/examples/dom-events.tsx?raw';
import imperativeSrc from '@/pages/advanced/examples/imperative.tsx?raw';
import modalOutletSrc from '@/pages/advanced/examples/modal-outlet.tsx?raw';
import deploymentServiceSrc from '@/pages/advanced/examples/deployment-service.ts?raw';
import muiPanelSrc from '@/pages/advanced/examples/mui-panel.tsx?raw';
import pharmacyRxSrc from '@/pages/advanced/examples/pharmacy-rx.tsx?raw';
import serviceLayerSrc from '@/pages/advanced/examples/service-layer.tsx?raw';
import stackedModalsSrc from '@/pages/advanced/examples/stacked-modals.tsx?raw';
import textMessageModalSrc from '@/pages/advanced/examples/text-message-modal.tsx?raw';
import asyncOpenSrc from '@/pages/getting-started/examples/async-open.tsx?raw';
import sharedLibUseQuerySrc from '@/shared/lib/use-query.ts?raw';
import sharedLibAsyncStateSrc from '@/shared/lib/async-state.ts?raw';
import sharedLibSafeAwaitSrc from '@/shared/lib/safe-await.ts?raw';
import sharedLibMutexSrc from '@/shared/lib/mutex.ts?raw';
import sharedLibSingleFlightSrc from '@/shared/lib/single-flight.ts?raw';
import sharedLibImmerStoreSrc from '@/shared/lib/immer-store.ts?raw';
import contentHelpersSrc from '@/pages/getting-started/examples/content-helpers.tsx?raw';
import noTransitionMessageSrc from '@/pages/getting-started/examples/no-transition-message.tsx?raw';
import noTransitionSlideSrc from '@/pages/getting-started/examples/no-transition-slide.tsx?raw';
import simpleModalSrc from '@/pages/getting-started/examples/simple-modal.tsx?raw';
import confirmWithHotkeysSrc from '@/pages/modal-actions/examples/confirm-with-hotkeys.tsx?raw';
import deleteItemModalSrc from '@/pages/modal-actions/examples/delete-item-modal.tsx?raw';
import reactivDepsSrc from '@/pages/modal-actions/examples/reactive-deps.tsx?raw';
import slideAsyncOpenSrc from '@/pages/slide-modal/examples/async-open.tsx?raw';
import slideCornerToastSrc from '@/pages/slide-modal/examples/corner-toast.tsx?raw';
import slideModalConfiguratorSrc from '@/pages/slide-modal/examples/slide-modal-configurator.tsx?raw';
import muiFormSrc from '@/pages/ui-integrations/examples/mui-form.tsx?raw';
import muiMessageSrc from '@/pages/ui-integrations/examples/mui-message.tsx?raw';
import muiSlideSrc from '@/pages/ui-integrations/examples/mui-slide.tsx?raw';
import vanillaFormSrc from '@/pages/ui-integrations/examples/vanilla-form.tsx?raw';
import vanillaMessageSrc from '@/pages/ui-integrations/examples/vanilla-message.tsx?raw';
import vanillaSlideSrc from '@/pages/ui-integrations/examples/vanilla-slide.tsx?raw';
import vanillaZodFormSrc from '@/pages/ui-integrations/examples/vanilla-zod-form.tsx?raw';

// ── useModal stories ─────────────────────────────────────────────────────────
import storyUseModalBasicSrc from '../../../../../src/core/__tests__/use-modal/basic.story.tsx?raw';
import storyUseModalCustomDismissKeySrc from '../../../../../src/core/__tests__/use-modal/custom-dismiss-key.story.tsx?raw';
import storyUseModalDismissKeyDisabledSrc from '../../../../../src/core/__tests__/use-modal/dismiss-key-disabled.story.tsx?raw';
import storyUseModalDismissWhilePreparingSrc from '../../../../../src/core/__tests__/use-modal/dismiss-while-preparing.story.tsx?raw';
import storyUseModalNonModalClickOutsideDefaultSrc from '../../../../../src/core/__tests__/use-modal/non-modal-click-outside-default.story.tsx?raw';
import storyUseModalNonModalClickOutsideSrc from '../../../../../src/core/__tests__/use-modal/non-modal-click-outside.story.tsx?raw';
import storyUseModalNonModalCustomDismissKeySrc from '../../../../../src/core/__tests__/use-modal/non-modal-custom-dismiss-key.story.tsx?raw';
import storyUseModalNonModalEscIsolationSrc from '../../../../../src/core/__tests__/use-modal/non-modal-esc-isolation.story.tsx?raw';
import storyUseModalNonModalStackSrc from '../../../../../src/core/__tests__/use-modal/non-modal-stack.story.tsx?raw';
import storyUseModalNonModalSrc from '../../../../../src/core/__tests__/use-modal/non-modal.story.tsx?raw';
import storyUseModalPortalDefaultSrc from '../../../../../src/core/__tests__/use-modal/portal-default.story.tsx?raw';
import storyUseModalPortalNonModalDefaultSrc from '../../../../../src/core/__tests__/use-modal/portal-non-modal-default.story.tsx?raw';
import storyUseModalPortalNonModalOptInSrc from '../../../../../src/core/__tests__/use-modal/portal-non-modal-opt-in.story.tsx?raw';
import storyUseModalPortalOptInSrc from '../../../../../src/core/__tests__/use-modal/portal-opt-in.story.tsx?raw';
import storyUseModalReopenSettlesSrc from '../../../../../src/core/__tests__/use-modal/reopen-settles.story.tsx?raw';
import storyUseModalStableIdentitySrc from '../../../../../src/core/__tests__/use-modal/stable-identity.story.tsx?raw';
import storyUseModalBackdropHitTestSrc from '../../../../../src/core/__tests__/use-modal/backdrop-hit-test.story.tsx?raw';
import storyOutletPaintTimingSrc from '../../../../../src/core/__tests__/modal-outlet/outlet-paint-timing.story.tsx?raw';
import storyUseModalWaitForCloseSrc from '../../../../../src/core/__tests__/use-modal/wait-for-close.story.tsx?raw';

// ── useModalActions stories ───────────────────────────────────────────────
import storyActionsBasicSrc from '../../../../../src/actions/__tests__/use-modal-actions/basic-controller.story.tsx?raw';
import storyActionsDefinitionSrc from '../../../../../src/actions/__tests__/use-modal-actions/definition-controller.story.tsx?raw';
import storyActionsDismissCollisionSrc from '../../../../../src/actions/__tests__/use-modal-actions/dismiss-key-collision.story.tsx?raw';
import storyActionsErrorSrc from '../../../../../src/actions/__tests__/use-modal-actions/error-controller.story.tsx?raw';
import storyActionsFocusSrc from '../../../../../src/actions/__tests__/use-modal-actions/focus-restoration.story.tsx?raw';
import storyActionsHotkeySrc from '../../../../../src/actions/__tests__/use-modal-actions/hotkey-controller.story.tsx?raw';
import storyActionsActionBasicSrc from '../../../../../src/actions/__tests__/use-modal-actions/modal-action-basic.story.tsx?raw';
import storyActionsCustomHandlerSrc from '../../../../../src/actions/__tests__/use-modal-actions/modal-action-custom-handler.story.tsx?raw';
import storyActionsActionHotkeySrc from '../../../../../src/actions/__tests__/use-modal-actions/modal-action-hotkey.story.tsx?raw';
import storyActionsActionMultipleSrc from '../../../../../src/actions/__tests__/use-modal-actions/modal-action-multiple.story.tsx?raw';
import storyActionsVanillaAriaSrc from '../../../../../src/actions/__tests__/use-modal-actions/vanilla-aria-keyshortcuts.story.tsx?raw';
import storyActionsReasonSourceSrc from '../../../../../src/actions/__tests__/use-modal-actions/reason-source.story.tsx?raw';
import storyActionsHotkeyWhilePreparingSrc from '../../../../../src/actions/__tests__/use-modal-actions/hotkey-while-preparing.story.tsx?raw';
import storyUseModalTransitionToggleSrc from '../../../../../src/core/__tests__/use-modal/transition-toggle.story.tsx?raw';
import storyUseModalKeyPassthroughSrc from '../../../../../src/core/__tests__/use-modal/key-passthrough.story.tsx?raw';
import storyDmScrollLockTwoManagersSrc from '../../../../../src/manager/__tests__/dialog-manager/scroll-lock-two-managers.story.tsx?raw';
import storyDmBlockingSrc from '../../../../../src/manager/__tests__/dialog-manager/blocking.story.tsx?raw';
import storyDmProviderIsolationSrc from '../../../../../src/manager/__tests__/dialog-manager/provider-isolation.story.tsx?raw';
import storyUseModalStructuralToggleSrc from '../../../../../src/core/__tests__/use-modal/structural-toggle.story.tsx?raw';

// ── dialogManager stories ────────────────────────────────────────────────────
import storyDmDomEventsSrc from '../../../../../src/manager/__tests__/dialog-manager/dom-events.story.tsx?raw';
import storyDmEventSubscribeSrc from '../../../../../src/manager/__tests__/dialog-manager/event-subscribe.story.tsx?raw';
import storyDmImperativeSrc from '../../../../../src/manager/__tests__/dialog-manager/imperative.story.tsx?raw';
import storyDmLookupSrc from '../../../../../src/manager/__tests__/dialog-manager/lookup.story.tsx?raw';
import storyDmMultiModalSrc from '../../../../../src/manager/__tests__/dialog-manager/multi-modal.story.tsx?raw';
import storyDmScrollLockSrc from '../../../../../src/manager/__tests__/dialog-manager/scroll-lock.story.tsx?raw';
import storyDmUnregisteredSrc from '../../../../../src/manager/__tests__/dialog-manager/unregistered-no-op.story.tsx?raw';
import storyUseLookupSrc from '../../../../../src/manager/__tests__/use-lookup.story.tsx?raw';

// ── Store stories ────────────────────────────────────────────────────────────
import storyStoreContextSrc from '../../../../../src/store/react/__tests__/create-store-context.story.tsx?raw';
import storyUseStoreSrc from '../../../../../src/store/react/__tests__/use-store.story.tsx?raw';

// ── ModalOutlet stories ──────────────────────────────────────────────────────
import storyOutletNoOutletSrc from '../../../../../src/core/__tests__/modal-outlet/no-outlet.story.tsx?raw';
import storyOutletBasicSrc from '../../../../../src/core/__tests__/modal-outlet/outlet-basic.story.tsx?raw';
import storyOutletMultiSrc from '../../../../../src/core/__tests__/modal-outlet/outlet-multi.story.tsx?raw';
import storyOutletNestedSrc from '../../../../../src/core/__tests__/modal-outlet/outlet-nested.story.tsx?raw';
import storyOutletNullModalSrc from '../../../../../src/core/__tests__/modal-outlet/outlet-null-modal.story.tsx?raw';

// ── useMessageModal stories ──────────────────────────────────────────────────
import storyMsgAsyncOpenSrc from '../../../../../src/templates/__tests__/use-message-modal/async-open-message.story.tsx?raw';
import storyMsgBasicSrc from '../../../../../src/templates/__tests__/use-message-modal/basic-message.story.tsx?raw';
import storyMsgDataSrc from '../../../../../src/templates/__tests__/use-message-modal/data-message.story.tsx?raw';
import storyMsgWaitForCloseSrc from '../../../../../src/templates/__tests__/use-message-modal/wait-for-close-message.story.tsx?raw';

// ── MUI template components ─────────────────────────────────────────────────
import templateMsgCreateTextSrc from '@/entities/modal-template/ui/mui/create-text-message-modal.tsx?raw';
import templateFormContentSrc from '@/entities/modal-template/ui/mui/form-modal/components/Content.tsx?raw';
import templateFormFieldErrorSrc from '@/entities/modal-template/ui/mui/form-modal/components/FieldError.tsx?raw';
import templateFormFooterSrc from '@/entities/modal-template/ui/mui/form-modal/components/Footer.tsx?raw';
import templateFormFormLayoutSrc from '@/entities/modal-template/ui/mui/form-modal/components/FormLayout.tsx?raw';
import templateFormHeaderSrc from '@/entities/modal-template/ui/mui/form-modal/components/Header.tsx?raw';
import templateMsgContentSrc from '@/entities/modal-template/ui/mui/message-modal/components/Content.tsx?raw';
import templateMsgDefaultContainerSrc from '@/entities/modal-template/ui/mui/message-modal/components/DefaultContainer.tsx?raw';
import templateMsgDefaultLayoutSrc from '@/entities/modal-template/ui/mui/message-modal/components/DefaultLayout.tsx?raw';
import templateMsgFooterSrc from '@/entities/modal-template/ui/mui/message-modal/components/Footer.tsx?raw';
import templateMsgHeaderSrc from '@/entities/modal-template/ui/mui/message-modal/components/Header.tsx?raw';
import templateMsgIconSrc from '@/entities/modal-template/ui/mui/message-modal/components/Icon.tsx?raw';
import templateMsgTitleSrc from '@/entities/modal-template/ui/mui/message-modal/components/Title.tsx?raw';
import templatePanelHeaderActionLayoutSrc from '@/entities/modal-template/ui/mui/panel-modal/components/HeaderActionLayout.tsx?raw';
import templatePanelPanelContainerSrc from '@/entities/modal-template/ui/mui/panel-modal/components/PanelContainer.tsx?raw';
import templatePanelPanelContentSrc from '@/entities/modal-template/ui/mui/panel-modal/components/PanelContent.tsx?raw';
import templatePanelPanelFooterSrc from '@/entities/modal-template/ui/mui/panel-modal/components/PanelFooter.tsx?raw';
import templatePanelPanelHeaderSrc from '@/entities/modal-template/ui/mui/panel-modal/components/PanelHeader.tsx?raw';
import templateSharedAlertContentSrc from '@/entities/modal-template/ui/mui/shared/content/AlertContent.tsx?raw';
import templateSharedContentTransitionSrc from '@/entities/modal-template/ui/mui/shared/content/ContentTransition.tsx?raw';
import templateSharedDetailSrc from '@/entities/modal-template/ui/mui/shared/content/Detail.tsx?raw';
import templateSharedDetailListSrc from '@/entities/modal-template/ui/mui/shared/content/DetailList.tsx?raw';
import templateSharedHeadingSrc from '@/entities/modal-template/ui/mui/shared/content/Heading.tsx?raw';
import templateSharedHintSrc from '@/entities/modal-template/ui/mui/shared/content/Hint.tsx?raw';
import templateSharedMessageSrc from '@/entities/modal-template/ui/mui/shared/content/Message.tsx?raw';
import templateSharedOverflowContainerSrc from '@/entities/modal-template/ui/mui/shared/content/OverflowContainer.tsx?raw';
import templateSharedOverflownTypographySrc from '@/entities/modal-template/ui/mui/shared/content/OverflownTypography.tsx?raw';
import templateSharedSectionSrc from '@/entities/modal-template/ui/mui/shared/content/Section.tsx?raw';
import templateSharedMuiButtonSrc from '@/entities/modal-template/ui/mui/shared/MuiButton.tsx?raw';
import templateSlideContentSrc from '@/entities/modal-template/ui/mui/slide-modal/components/Content.tsx?raw';
import templateSlideDefaultLayoutSrc from '@/entities/modal-template/ui/mui/slide-modal/components/DefaultLayout.tsx?raw';
import templateSlideFooterSrc from '@/entities/modal-template/ui/mui/slide-modal/components/Footer.tsx?raw';
import templateSlideHeaderSrc from '@/entities/modal-template/ui/mui/slide-modal/components/Header.tsx?raw';
import templateSlideTitleSrc from '@/entities/modal-template/ui/mui/slide-modal/components/Title.tsx?raw';
import templateUtilLoadingOverlaySrc from '@/entities/modal-template/ui/shared/LoadingOverlay.tsx?raw';
import templateUtilSxUtilsSrc from '@/entities/modal-template/ui/shared/sxUtils.ts?raw';
import templateUtilTokensSrc from '@/entities/modal-template/ui/shared/tokens.ts?raw';
import templateUtilTypesSrc from '@/entities/modal-template/ui/shared/types.ts?raw';
// ── Vanilla template components ─────────────────────────────────────────────
import vanillaFormContentSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/Content.tsx?raw';
import vanillaFormFooterSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/Footer.tsx?raw';
import vanillaFormHeaderSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/Header.tsx?raw';
import vanillaFormButtonContainerSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaButtonContainer.tsx?raw';
import vanillaFormFieldErrorSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFieldError.tsx?raw';
import vanillaFormFieldGroupSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFieldGroup.tsx?raw';
import vanillaFormLayoutSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFormLayout.tsx?raw';
import vanillaFormInputSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaInput.tsx?raw';
import vanillaFormLabelSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaLabel.tsx?raw';
import vanillaFormStylesSrc from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css?raw';
import vanillaMsgContainerSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaContainer.tsx?raw';
import vanillaMsgContentSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaContent.tsx?raw';
import vanillaMsgDefaultLayoutSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaDefaultLayout.tsx?raw';
import vanillaMsgFooterSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaFooter.tsx?raw';
import vanillaMsgHeaderSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaHeader.tsx?raw';
import vanillaMsgIconSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaIcon.tsx?raw';
import vanillaMsgTitleSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaTitle.tsx?raw';
import vanillaMsgStylesSrc from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css?raw';
import vanillaSharedAlertSrc from '@/entities/modal-template/ui/vanilla/shared/Alert.tsx?raw';
import vanillaSharedButtonSrc from '@/entities/modal-template/ui/vanilla/shared/VanillaButton.tsx?raw';
import vanillaSharedAlertContentSrc from '@/entities/modal-template/ui/vanilla/shared/content/AlertContent.tsx?raw';
import vanillaSharedDetailSrc from '@/entities/modal-template/ui/vanilla/shared/content/Detail.tsx?raw';
import vanillaSharedHeadingSrc from '@/entities/modal-template/ui/vanilla/shared/content/Heading.tsx?raw';
import vanillaSharedHintSrc from '@/entities/modal-template/ui/vanilla/shared/content/Hint.tsx?raw';
import vanillaSharedMessageSrc from '@/entities/modal-template/ui/vanilla/shared/content/Message.tsx?raw';
import vanillaSharedSectionSrc from '@/entities/modal-template/ui/vanilla/shared/content/Section.tsx?raw';
import vanillaSharedStylesSrc from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css?raw';
import vanillaSlideButtonContainerSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaButtonContainer.tsx?raw';
import vanillaSlideCheckboxLabelSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaCheckboxLabel.tsx?raw';
import vanillaSlideContentSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaContent.tsx?raw';
import vanillaSlideDefaultLayoutSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaDefaultLayout.tsx?raw';
import vanillaSlideFooterSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaFooter.tsx?raw';
import vanillaSlideHeaderSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaHeader.tsx?raw';
import vanillaSlideSectionGroupSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaSectionGroup.tsx?raw';
import vanillaSlideTitleSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaTitle.tsx?raw';
import vanillaSlideStylesSrc from '@/entities/modal-template/ui/vanilla/slide-modal/styles.module.css?raw';

import sharedComponentCodeBlockSrc from '@/shared/ui/CodeBlock/CodeBlock.tsx?raw';
import sharedComponentLoadingButtonSrc from '@/shared/ui/LoadingButton/LoadingButton.tsx?raw';
import sharedComponentResultDisplaySrc from '@/shared/ui/ResultDisplay/ResultDisplay.tsx?raw';
import sharedComponentViewCodeButtonSrc from '@/shared/ui/ViewCodeButton/ViewCodeButton.tsx?raw';

// ── useSlideModal stories ────────────────────────────────────────────────────
import storySlideBasicSrc from '../../../../../src/templates/__tests__/use-slide-modal/basic-slide.story.tsx?raw';
import storySlideDirectionSrc from '../../../../../src/templates/__tests__/use-slide-modal/direction-slide.story.tsx?raw';
import storySlideMultiDirectionSrc from '../../../../../src/templates/__tests__/use-slide-modal/multi-direction-slide.story.tsx?raw';
import storySlideNonModalEscHotkeySrc from '../../../../../src/templates/__tests__/use-slide-modal/non-modal-esc-hotkey.story.tsx?raw';
import storySlideWaitForCloseSrc from '../../../../../src/templates/__tests__/use-slide-modal/wait-for-close-slide.story.tsx?raw';

export const codeSamples: Record<string, string> = {
  // Playground examples
  'simple-modal': simpleModalSrc,
  'content-helpers': contentHelpersSrc,
  'async-open': asyncOpenSrc,
  'no-transition-message': noTransitionMessageSrc,
  'no-transition-slide': noTransitionSlideSrc,
  'confirm-with-hotkeys': confirmWithHotkeysSrc,
  'delete-item-modal': deleteItemModalSrc,
  'reactive-deps': reactivDepsSrc,
  'slide-modal-configurator': slideModalConfiguratorSrc,
  'slide-async-open': slideAsyncOpenSrc,
  'slide-corner-toast': slideCornerToastSrc,
  'stacked-modals': stackedModalsSrc,
  'imperative-service-layer': serviceLayerSrc,
  'imperative-deployment-service': deploymentServiceSrc,
  'cosmic-override': cosmicOverrideSrc,
  'dom-events': domEventsSrc,
  'mui-panel': muiPanelSrc,
  imperative: imperativeSrc,
  'text-message-modal': textMessageModalSrc,
  'modal-outlet': modalOutletSrc,
  'mui-message': muiMessageSrc,
  'mui-slide': muiSlideSrc,
  'mui-form': muiFormSrc,
  'vanilla-message': vanillaMessageSrc,
  'vanilla-slide': vanillaSlideSrc,
  'vanilla-form': vanillaFormSrc,
  'vanilla-zod-form': vanillaZodFormSrc,
  'pharmacy-rx': pharmacyRxSrc,

  // useModal stories
  'story-use-modal-basic': storyUseModalBasicSrc,
  'story-use-modal-wait-for-close': storyUseModalWaitForCloseSrc,
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

  // useModalActions stories
  'story-controller-basic': storyActionsBasicSrc,
  'story-controller-error': storyActionsErrorSrc,
  'story-controller-hotkey': storyActionsHotkeySrc,
  'story-controller-definition': storyActionsDefinitionSrc,
  'story-controller-focus': storyActionsFocusSrc,
  'story-controller-dismiss-collision': storyActionsDismissCollisionSrc,
  'story-controller-action-basic': storyActionsActionBasicSrc,
  'story-controller-action-custom-handler': storyActionsCustomHandlerSrc,
  'story-controller-action-hotkey': storyActionsActionHotkeySrc,
  'story-controller-action-multiple': storyActionsActionMultipleSrc,
  'story-controller-reason-source': storyActionsReasonSourceSrc,
  'story-controller-hotkey-while-preparing': storyActionsHotkeyWhilePreparingSrc,
  'story-use-modal-transition-toggle': storyUseModalTransitionToggleSrc,
  'story-use-modal-key-passthrough': storyUseModalKeyPassthroughSrc,
  'story-dm-scroll-lock-two-managers': storyDmScrollLockTwoManagersSrc,
  'story-dm-blocking': storyDmBlockingSrc,
  'story-dm-blocking-lookup': storyDmBlockingSrc,
  'story-dm-provider-isolation': storyDmProviderIsolationSrc,
  'story-dm-no-provider': storyDmProviderIsolationSrc,
  'story-use-modal-structural-toggle': storyUseModalStructuralToggleSrc,
  'story-controller-vanilla-aria': storyActionsVanillaAriaSrc,
  'story-controller-broken-aria': storyActionsVanillaAriaSrc,

  // dialogManager stories
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
  'story-use-lookup-unregistered': storyUseLookupSrc,
  'story-use-lookup-foreground': storyUseLookupSrc,

  // ModalOutlet stories
  'story-outlet-basic': storyOutletBasicSrc,
  'story-outlet-null-modal': storyOutletNullModalSrc,
  'story-outlet-no-outlet': storyOutletNoOutletSrc,
  'story-outlet-multi': storyOutletMultiSrc,
  'story-outlet-nested': storyOutletNestedSrc,

  // useMessageModal stories
  'story-msg-basic': storyMsgBasicSrc,
  'story-msg-wait-for-close': storyMsgWaitForCloseSrc,
  'story-msg-async-open': storyMsgAsyncOpenSrc,
  'story-msg-data': storyMsgDataSrc,

  // useSlideModal stories
  'story-slide-basic': storySlideBasicSrc,
  'story-slide-direction': storySlideDirectionSrc,
  'story-slide-wait-for-close': storySlideWaitForCloseSrc,
  'story-slide-multi-direction': storySlideMultiDirectionSrc,
  'story-slide-non-modal-esc-hotkey': storySlideNonModalEscHotkeySrc,

  // MUI template components
  'template-msg-create-text': templateMsgCreateTextSrc,
  'template-msg-default-container': templateMsgDefaultContainerSrc,
  'template-msg-default-layout': templateMsgDefaultLayoutSrc,
  'template-msg-header': templateMsgHeaderSrc,
  'template-msg-title': templateMsgTitleSrc,
  'template-msg-icon': templateMsgIconSrc,
  'template-msg-content': templateMsgContentSrc,
  'template-msg-footer': templateMsgFooterSrc,
  'template-slide-default-layout': templateSlideDefaultLayoutSrc,
  'template-slide-title': templateSlideTitleSrc,
  'template-slide-content': templateSlideContentSrc,
  'template-slide-footer': templateSlideFooterSrc,
  'template-slide-header': templateSlideHeaderSrc,
  'template-form-form-layout': templateFormFormLayoutSrc,
  'template-form-header': templateFormHeaderSrc,
  'template-form-content': templateFormContentSrc,
  'template-form-footer': templateFormFooterSrc,
  'template-form-field-error': templateFormFieldErrorSrc,
  'template-panel-panel-container': templatePanelPanelContainerSrc,
  'template-panel-panel-header': templatePanelPanelHeaderSrc,
  'template-panel-header-action-layout': templatePanelHeaderActionLayoutSrc,
  'template-panel-panel-content': templatePanelPanelContentSrc,
  'template-panel-panel-footer': templatePanelPanelFooterSrc,
  'template-shared-heading': templateSharedHeadingSrc,
  'template-shared-message': templateSharedMessageSrc,
  'template-shared-detail': templateSharedDetailSrc,
  'template-shared-detail-list': templateSharedDetailListSrc,
  'template-shared-hint': templateSharedHintSrc,
  'template-shared-alert-content': templateSharedAlertContentSrc,
  'template-shared-section': templateSharedSectionSrc,
  'template-shared-overflown-typography': templateSharedOverflownTypographySrc,
  'template-shared-overflow-container': templateSharedOverflowContainerSrc,
  'template-shared-content-transition': templateSharedContentTransitionSrc,
  'template-shared-mui-button': templateSharedMuiButtonSrc,
  'template-util-sx-utils': templateUtilSxUtilsSrc,
  'template-util-tokens': templateUtilTokensSrc,
  'template-util-types': templateUtilTypesSrc,
  'template-util-loading-overlay': templateUtilLoadingOverlaySrc,

  // Vanilla template components
  'vanilla-msg-default-layout': vanillaMsgDefaultLayoutSrc,
  'vanilla-msg-container': vanillaMsgContainerSrc,
  'vanilla-msg-header': vanillaMsgHeaderSrc,
  'vanilla-msg-title': vanillaMsgTitleSrc,
  'vanilla-msg-icon': vanillaMsgIconSrc,
  'vanilla-msg-content': vanillaMsgContentSrc,
  'vanilla-msg-footer': vanillaMsgFooterSrc,
  'vanilla-msg-styles': vanillaMsgStylesSrc,
  'vanilla-slide-default-layout': vanillaSlideDefaultLayoutSrc,
  'vanilla-slide-header': vanillaSlideHeaderSrc,
  'vanilla-slide-title': vanillaSlideTitleSrc,
  'vanilla-slide-content': vanillaSlideContentSrc,
  'vanilla-slide-footer': vanillaSlideFooterSrc,
  'vanilla-slide-button-container': vanillaSlideButtonContainerSrc,
  'vanilla-slide-checkbox-label': vanillaSlideCheckboxLabelSrc,
  'vanilla-slide-section-group': vanillaSlideSectionGroupSrc,
  'vanilla-slide-styles': vanillaSlideStylesSrc,
  'vanilla-form-layout': vanillaFormLayoutSrc,
  'vanilla-form-header': vanillaFormHeaderSrc,
  'vanilla-form-content': vanillaFormContentSrc,
  'vanilla-form-footer': vanillaFormFooterSrc,
  'vanilla-form-field-group': vanillaFormFieldGroupSrc,
  'vanilla-form-field-error': vanillaFormFieldErrorSrc,
  'vanilla-form-input': vanillaFormInputSrc,
  'vanilla-form-label': vanillaFormLabelSrc,
  'vanilla-form-button-container': vanillaFormButtonContainerSrc,
  'vanilla-form-styles': vanillaFormStylesSrc,
  'vanilla-shared-button': vanillaSharedButtonSrc,
  'vanilla-shared-alert': vanillaSharedAlertSrc,
  'vanilla-shared-alert-content': vanillaSharedAlertContentSrc,
  'vanilla-shared-heading': vanillaSharedHeadingSrc,
  'vanilla-shared-message': vanillaSharedMessageSrc,
  'vanilla-shared-detail': vanillaSharedDetailSrc,
  'vanilla-shared-hint': vanillaSharedHintSrc,
  'vanilla-shared-section': vanillaSharedSectionSrc,
  'vanilla-shared-styles': vanillaSharedStylesSrc,

  'shared-component-code-block': sharedComponentCodeBlockSrc,
  'shared-component-view-code-button': sharedComponentViewCodeButtonSrc,
  'shared-component-loading-button': sharedComponentLoadingButtonSrc,
  'shared-lib-use-query': sharedLibUseQuerySrc,
  'shared-lib-async-state': sharedLibAsyncStateSrc,
  'shared-lib-safe-await': sharedLibSafeAwaitSrc,
  'shared-lib-mutex': sharedLibMutexSrc,
  'shared-lib-single-flight': sharedLibSingleFlightSrc,
  'shared-lib-immer-store': sharedLibImmerStoreSrc,
  'shared-component-result-display': sharedComponentResultDisplaySrc,
};
