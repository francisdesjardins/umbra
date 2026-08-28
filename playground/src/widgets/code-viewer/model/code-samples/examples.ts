/**
 * The playground's own examples plus the microfrontend frame's files — every route's samples but
 * `/stories` and `/ui-templates`. Split off; see `codeSamples.ts` for how a route picks its group.
 */
import simpleDialogSrc from '@/pages/getting-started/examples/simple-dialog.tsx?raw';
import asyncOpenSrc from '@/pages/getting-started/examples/async-open.tsx?raw';
import prepareFailureSrc from '@/pages/getting-started/examples/prepare-failure.tsx?raw';
import noTransitionMessageSrc from '@/pages/getting-started/examples/no-transition-message.tsx?raw';
import confirmWithHotkeysSrc from '@/pages/dialog-actions/examples/confirm-with-hotkeys.tsx?raw';
import focusOnOpenSrc from '@/pages/dialog-actions/examples/focus-on-open.tsx?raw';
import deleteItemDialogSrc from '@/pages/dialog-actions/examples/delete-item-dialog.tsx?raw';
import reactivDepsSrc from '@/pages/dialog-actions/examples/reactive-deps.tsx?raw';
import perActionStateSrc from '@/pages/dialog-actions/examples/per-action-state.tsx?raw';
import slidePresetsSrc from '@/pages/slide-dialog/examples/slide-presets.tsx?raw';
import slideCornerToastSrc from '@/pages/slide-dialog/examples/corner-toast.tsx?raw';
import stackedDialogsSrc from '@/pages/stacking/examples/stacked-dialogs.tsx?raw';
import stackPrioritySrc from '@/pages/stacking/examples/stack-priority.tsx?raw';
import serviceLayerSrc from '@/pages/imperative/examples/service-layer.tsx?raw';
import ssrWorkerSrc from '@/pages/interop/examples/ssr-worker.tsx?raw';
import deploymentServiceSrc from '@/pages/imperative/examples/deployment-service.ts?raw';
import cosmicOverrideSrc from '@/pages/showcases/examples/cosmic-override.tsx?raw';
import domEventsSrc from '@/pages/interop/examples/dom-events.tsx?raw';
import gamepadSrc from '@/pages/interop/examples/gamepad.tsx?raw';
import groceryListSrc from '@/pages/showcases/examples/grocery-list.tsx?raw';
import vanillaPanelSrc from '@/pages/showcases/examples/vanilla-panel.tsx?raw';
import imperativeSrc from '@/pages/imperative/examples/imperative.tsx?raw';
import openRequestSrc from '@/pages/imperative/examples/open-request.tsx?raw';
import controlledPanelSrc from '@/pages/imperative/examples/controlled-panel.tsx?raw';
import dialogOutletSrc from '@/pages/imperative/examples/dialog-outlet.tsx?raw';
import deferredOpenSrc from '@/pages/imperative/examples/deferred-open.tsx?raw';
import declaredPayloadSrc from '@/pages/imperative/examples/declared-payload.tsx?raw';
import closeThemAllSrc from '@/pages/stacking/examples/close-them-all.tsx?raw';
import mfeHostFrameSrc from '@/pages/microfrontends/examples/host-frame.tsx?raw';
// The build behind the import map: not a file to copy, but the demo's subject — how three
// independently-written scripts end up with one manager.
import mfeDistributionSrc from '../../../../../vite-plugins/mfe-umbra.ts?raw';
import muiFormSrc from '@/pages/ui-integrations/examples/mui-form.tsx?raw';
import vanillaFormSrc from '@/pages/ui-integrations/examples/vanilla-form.tsx?raw';
import {
  audit as mfeAuditSrc,
  billing as mfeBillingSrc,
  checkout as mfeCheckoutSrc,
  host as mfeHostSrc,
  support as mfeSupportSrc,
} from 'virtual:mfe-sources';

export const examples: Record<string, string> = {
  'simple-dialog': simpleDialogSrc,
  'async-open': asyncOpenSrc,
  'prepare-failure': prepareFailureSrc,
  'no-transition-message': noTransitionMessageSrc,
  'confirm-with-hotkeys': confirmWithHotkeysSrc,
  'focus-on-open': focusOnOpenSrc,
  'delete-item-dialog': deleteItemDialogSrc,
  'reactive-deps': reactivDepsSrc,
  'per-action-state': perActionStateSrc,
  'slide-presets': slidePresetsSrc,
  'slide-corner-toast': slideCornerToastSrc,
  'stacked-dialogs': stackedDialogsSrc,
  'stack-priority': stackPrioritySrc,
  'imperative-service-layer': serviceLayerSrc,
  'ssr-worker': ssrWorkerSrc,
  'imperative-deployment-service': deploymentServiceSrc,
  'cosmic-override': cosmicOverrideSrc,
  'dom-events': domEventsSrc,
  gamepad: gamepadSrc,
  'grocery-list': groceryListSrc,
  'vanilla-panel': vanillaPanelSrc,
  imperative: imperativeSrc,
  'open-request': openRequestSrc,
  'controlled-panel': controlledPanelSrc,
  'dialog-outlet': dialogOutletSrc,
  'deferred-open': deferredOpenSrc,
  'declared-payload': declaredPayloadSrc,
  'close-them-all': closeThemAllSrc,
  'mfe-host-frame': mfeHostFrameSrc,
  'mfe-host-html': mfeHostSrc,
  'mfe-checkout': mfeCheckoutSrc,
  'mfe-billing': mfeBillingSrc,
  'mfe-support': mfeSupportSrc,
  'mfe-audit': mfeAuditSrc,
  'mfe-distribution': mfeDistributionSrc,
  'mui-form': muiFormSrc,
  'vanilla-form': vanillaFormSrc,
};
