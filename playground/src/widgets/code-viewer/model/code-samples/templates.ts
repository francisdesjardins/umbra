/**
 * The copy-paste catalogue behind `/ui-templates`: both template flavours, the playground's shared
 * components, and the `shared/lib` patterns the Shared tab lists. Split off — see `codeSamples.ts`.
 */
import templateUtilScrollRegionSrc from '@/entities/modal-template/ui/shared/scroll-region.ts?raw';
import templateUtilTokensSrc from '@/entities/modal-template/ui/shared/tokens.ts?raw';
import templateUtilTypesSrc from '@/entities/modal-template/ui/shared/types.ts?raw';
import templateUtilLoadingOverlaySrc from '@/entities/modal-template/ui/shared/LoadingOverlay.tsx?raw';
import vanillaMsgDefaultLayoutSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaDefaultLayout.tsx?raw';
import vanillaMsgContainerSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaContainer.tsx?raw';
import vanillaMsgHeaderSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaHeader.tsx?raw';
import vanillaMsgTitleSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaTitle.tsx?raw';
import vanillaMsgIconSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaIcon.tsx?raw';
import vanillaMsgContentSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaContent.tsx?raw';
import vanillaMsgFooterSrc from '@/entities/modal-template/ui/vanilla/message-modal/components/VanillaFooter.tsx?raw';
import vanillaMsgStylesSrc from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css?raw';
import vanillaSlideDefaultLayoutSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaDefaultLayout.tsx?raw';
import vanillaSlideHeaderSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaHeader.tsx?raw';
import vanillaSlideTitleSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaTitle.tsx?raw';
import vanillaSlideContentSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaContent.tsx?raw';
import vanillaSlideFooterSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaFooter.tsx?raw';
import vanillaSlideButtonContainerSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaButtonContainer.tsx?raw';
import vanillaSlideCheckboxLabelSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaCheckboxLabel.tsx?raw';
import vanillaSlideSectionGroupSrc from '@/entities/modal-template/ui/vanilla/slide-modal/components/VanillaSectionGroup.tsx?raw';
import vanillaSlideStylesSrc from '@/entities/modal-template/ui/vanilla/slide-modal/styles.module.css?raw';
import vanillaFormLayoutSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFormLayout.tsx?raw';
import vanillaFormHeaderSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/Header.tsx?raw';
import vanillaFormContentSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/Content.tsx?raw';
import vanillaFormFooterSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/Footer.tsx?raw';
import vanillaFormFieldGroupSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFieldGroup.tsx?raw';
import vanillaFormFieldErrorSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFieldError.tsx?raw';
import vanillaFormInputSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaInput.tsx?raw';
import vanillaFormLabelSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaLabel.tsx?raw';
import vanillaFormButtonContainerSrc from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaButtonContainer.tsx?raw';
import vanillaFormStylesSrc from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css?raw';
import vanillaPanelPanelContainerSrc from '@/entities/modal-template/ui/vanilla/panel-modal/components/VanillaPanelContainer.tsx?raw';
import vanillaPanelPanelHeaderSrc from '@/entities/modal-template/ui/vanilla/panel-modal/components/VanillaPanelHeader.tsx?raw';
import vanillaPanelHeaderActionLayoutSrc from '@/entities/modal-template/ui/vanilla/panel-modal/components/VanillaHeaderActionLayout.tsx?raw';
import vanillaPanelPanelContentSrc from '@/entities/modal-template/ui/vanilla/panel-modal/components/VanillaPanelContent.tsx?raw';
import vanillaPanelPanelFooterSrc from '@/entities/modal-template/ui/vanilla/panel-modal/components/VanillaPanelFooter.tsx?raw';
import vanillaPanelDividerSrc from '@/entities/modal-template/ui/vanilla/panel-modal/components/VanillaPanelDivider.tsx?raw';
import vanillaPanelStylesSrc from '@/entities/modal-template/ui/vanilla/panel-modal/styles.module.css?raw';
import vanillaSharedButtonSrc from '@/entities/modal-template/ui/vanilla/shared/VanillaButton.tsx?raw';
import vanillaSharedAlertSrc from '@/entities/modal-template/ui/vanilla/shared/Alert.tsx?raw';
import vanillaSharedAlertContentSrc from '@/entities/modal-template/ui/vanilla/shared/content/AlertContent.tsx?raw';
import vanillaSharedHeadingSrc from '@/entities/modal-template/ui/vanilla/shared/content/Heading.tsx?raw';
import vanillaSharedMessageSrc from '@/entities/modal-template/ui/vanilla/shared/content/Message.tsx?raw';
import vanillaSharedDetailSrc from '@/entities/modal-template/ui/vanilla/shared/content/Detail.tsx?raw';
import vanillaSharedHintSrc from '@/entities/modal-template/ui/vanilla/shared/content/Hint.tsx?raw';
import vanillaSharedSectionSrc from '@/entities/modal-template/ui/vanilla/shared/content/Section.tsx?raw';
import vanillaSharedDetailListSrc from '@/entities/modal-template/ui/vanilla/shared/content/DetailList.tsx?raw';
import vanillaSharedContentTransitionSrc from '@/entities/modal-template/ui/vanilla/shared/content/ContentTransition.tsx?raw';
import vanillaSharedOverflowContainerSrc from '@/entities/modal-template/ui/vanilla/shared/content/OverflowContainer.tsx?raw';
import vanillaSharedOverflownTypographySrc from '@/entities/modal-template/ui/vanilla/shared/content/OverflownTypography.tsx?raw';
import vanillaSharedStylesSrc from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css?raw';
import sharedComponentCodeBlockSrc from '@/shared/ui/CodeBlock/CodeBlock.tsx?raw';
import sharedComponentViewCodeButtonSrc from '@/shared/ui/ViewCodeButton/ViewCodeButton.tsx?raw';
import sharedComponentLoadingButtonSrc from '@/shared/ui/LoadingButton/LoadingButton.tsx?raw';
import sharedLibUseQuerySrc from '@/shared/lib/use-query.ts?raw';
import sharedLibUseFormSrc from '@/shared/lib/use-form.ts?raw';
import sharedLibUseAnnouncerSrc from '@/shared/lib/use-announcer.tsx?raw';
import sharedLibAsyncStateSrc from '@/shared/lib/async-state.ts?raw';
import sharedLibSafeAwaitSrc from '@/shared/lib/safe-await.ts?raw';
import sharedLibMutexSrc from '@/shared/lib/mutex.ts?raw';
import sharedLibSingleFlightSrc from '@/shared/lib/single-flight.ts?raw';
import sharedLibImmerStoreSrc from '@/shared/lib/immer-store.ts?raw';
import sharedComponentResultDisplaySrc from '@/shared/ui/ResultDisplay/ResultDisplay.tsx?raw';

export const templates: Record<string, string> = {
  'template-util-scroll-region': templateUtilScrollRegionSrc,
  'template-util-tokens': templateUtilTokensSrc,
  'template-util-types': templateUtilTypesSrc,
  'template-util-loading-overlay': templateUtilLoadingOverlaySrc,
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
  'vanilla-panel-panel-container': vanillaPanelPanelContainerSrc,
  'vanilla-panel-panel-header': vanillaPanelPanelHeaderSrc,
  'vanilla-panel-header-action-layout': vanillaPanelHeaderActionLayoutSrc,
  'vanilla-panel-panel-content': vanillaPanelPanelContentSrc,
  'vanilla-panel-panel-footer': vanillaPanelPanelFooterSrc,
  'vanilla-panel-divider': vanillaPanelDividerSrc,
  'vanilla-panel-styles': vanillaPanelStylesSrc,
  'vanilla-shared-button': vanillaSharedButtonSrc,
  'vanilla-shared-alert': vanillaSharedAlertSrc,
  'vanilla-shared-alert-content': vanillaSharedAlertContentSrc,
  'vanilla-shared-heading': vanillaSharedHeadingSrc,
  'vanilla-shared-message': vanillaSharedMessageSrc,
  'vanilla-shared-detail': vanillaSharedDetailSrc,
  'vanilla-shared-hint': vanillaSharedHintSrc,
  'vanilla-shared-section': vanillaSharedSectionSrc,
  'vanilla-shared-detail-list': vanillaSharedDetailListSrc,
  'vanilla-shared-content-transition': vanillaSharedContentTransitionSrc,
  'vanilla-shared-overflow-container': vanillaSharedOverflowContainerSrc,
  'vanilla-shared-overflown-typography': vanillaSharedOverflownTypographySrc,
  'vanilla-shared-styles': vanillaSharedStylesSrc,
  'shared-component-code-block': sharedComponentCodeBlockSrc,
  'shared-component-view-code-button': sharedComponentViewCodeButtonSrc,
  'shared-component-loading-button': sharedComponentLoadingButtonSrc,
  'shared-lib-use-query': sharedLibUseQuerySrc,
  'shared-lib-use-form': sharedLibUseFormSrc,
  'shared-lib-use-announcer': sharedLibUseAnnouncerSrc,
  'shared-lib-async-state': sharedLibAsyncStateSrc,
  'shared-lib-safe-await': sharedLibSafeAwaitSrc,
  'shared-lib-mutex': sharedLibMutexSrc,
  'shared-lib-single-flight': sharedLibSingleFlightSrc,
  'shared-lib-immer-store': sharedLibImmerStoreSrc,
  'shared-component-result-display': sharedComponentResultDisplaySrc,
};
