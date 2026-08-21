/**
 * The playground's own examples plus the microfrontend frame's files — every route's samples but
 * `/stories` and `/ui-templates`. Split off; see `codeSamples.ts` for how a route picks its group.
 */
import simpleModalSrc from '@/pages/getting-started/examples/simple-modal.tsx?raw';
import asyncOpenSrc from '@/pages/getting-started/examples/async-open.tsx?raw';
import prepareFailureSrc from '@/pages/getting-started/examples/prepare-failure.tsx?raw';
import noTransitionMessageSrc from '@/pages/getting-started/examples/no-transition-message.tsx?raw';
import confirmWithHotkeysSrc from '@/pages/modal-actions/examples/confirm-with-hotkeys.tsx?raw';
import focusOnOpenSrc from '@/pages/modal-actions/examples/focus-on-open.tsx?raw';
import deleteItemModalSrc from '@/pages/modal-actions/examples/delete-item-modal.tsx?raw';
import reactivDepsSrc from '@/pages/modal-actions/examples/reactive-deps.tsx?raw';
import perActionStateSrc from '@/pages/modal-actions/examples/per-action-state.tsx?raw';
import slidePresetsSrc from '@/pages/slide-modal/examples/slide-presets.tsx?raw';
import slideCornerToastSrc from '@/pages/slide-modal/examples/corner-toast.tsx?raw';
import stackedModalsSrc from '@/pages/stacking/examples/stacked-modals.tsx?raw';
import stackPrioritySrc from '@/pages/stacking/examples/stack-priority.tsx?raw';
import serviceLayerSrc from '@/pages/imperative/examples/service-layer.tsx?raw';
import ssrWorkerSrc from '@/pages/interop/examples/ssr-worker.tsx?raw';
import deploymentServiceSrc from '@/pages/imperative/examples/deployment-service.ts?raw';
import cosmicOverrideSrc from '@/pages/showcases/examples/cosmic-override.tsx?raw';
import domEventsSrc from '@/pages/interop/examples/dom-events.tsx?raw';
import groceryListSrc from '@/pages/showcases/examples/grocery-list.tsx?raw';
import vanillaPanelSrc from '@/pages/ui-integrations/examples/vanilla-panel.tsx?raw';
import imperativeSrc from '@/pages/imperative/examples/imperative.tsx?raw';
import openRequestSrc from '@/pages/imperative/examples/open-request.tsx?raw';
import controlledPanelSrc from '@/pages/imperative/examples/controlled-panel.tsx?raw';
import modalOutletSrc from '@/pages/imperative/examples/modal-outlet.tsx?raw';
import mfeHostFrameSrc from '@/pages/microfrontends/examples/host-frame.tsx?raw';
// The build behind the import map: not a file to copy, but the demo's subject — how three
// independently-written scripts end up with one manager.
import mfeDistributionSrc from '../../../../../vite-plugins/mfe-umbra.ts?raw';
import muiFormSrc from '@/pages/ui-integrations/examples/mui-form.tsx?raw';
import vanillaMessageSrc from '@/pages/ui-integrations/examples/vanilla-message.tsx?raw';
import vanillaSlideSrc from '@/pages/ui-integrations/examples/vanilla-slide.tsx?raw';
import vanillaFormSrc from '@/pages/ui-integrations/examples/vanilla-form.tsx?raw';
import {
  audit as mfeAuditSrc,
  billing as mfeBillingSrc,
  checkout as mfeCheckoutSrc,
  host as mfeHostSrc,
  support as mfeSupportSrc,
} from 'virtual:mfe-sources';

export const examples: Record<string, string> = {
  'simple-modal': simpleModalSrc,
  'async-open': asyncOpenSrc,
  'prepare-failure': prepareFailureSrc,
  'no-transition-message': noTransitionMessageSrc,
  'confirm-with-hotkeys': confirmWithHotkeysSrc,
  'focus-on-open': focusOnOpenSrc,
  'delete-item-modal': deleteItemModalSrc,
  'reactive-deps': reactivDepsSrc,
  'per-action-state': perActionStateSrc,
  'slide-presets': slidePresetsSrc,
  'slide-corner-toast': slideCornerToastSrc,
  'stacked-modals': stackedModalsSrc,
  'stack-priority': stackPrioritySrc,
  'imperative-service-layer': serviceLayerSrc,
  'ssr-worker': ssrWorkerSrc,
  'imperative-deployment-service': deploymentServiceSrc,
  'cosmic-override': cosmicOverrideSrc,
  'dom-events': domEventsSrc,
  'grocery-list': groceryListSrc,
  'vanilla-panel': vanillaPanelSrc,
  imperative: imperativeSrc,
  'open-request': openRequestSrc,
  'controlled-panel': controlledPanelSrc,
  'modal-outlet': modalOutletSrc,
  'mfe-host-frame': mfeHostFrameSrc,
  'mfe-host-html': mfeHostSrc,
  'mfe-checkout': mfeCheckoutSrc,
  'mfe-billing': mfeBillingSrc,
  'mfe-support': mfeSupportSrc,
  'mfe-audit': mfeAuditSrc,
  'mfe-distribution': mfeDistributionSrc,
  'mui-form': muiFormSrc,
  'vanilla-message': vanillaMessageSrc,
  'vanilla-slide': vanillaSlideSrc,
  'vanilla-form': vanillaFormSrc,
};
