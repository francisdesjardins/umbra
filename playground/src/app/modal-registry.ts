import type { ArchiveReceipt } from '@/pages/imperative/examples/open-request';
import type { SetupValues } from '@/pages/showcases/examples/vanilla-panel';
import type { FormValues as MuiFormValues } from '@/pages/ui-integrations/examples/mui-form';
import type { FormValues as VanillaFormValues } from '@/pages/ui-integrations/examples/vanilla-form';

/**
 * Every modal this playground opens, and what each one closes with.
 *
 * The list is the point. An id is a string the manager routes on, so without somewhere to write
 * them down "which component owns `stack-priority-warning`" is a grep — and with them written down
 * it is find-references on the key. The typing follows: a declared modal infers its payload and its
 * reasons at every `useModal` call, and `close` refuses a reason belonging to a different one.
 *
 * **The list is not enforced to be complete**, which is what lets `/stories` render the library's
 * own harnesses — a few hundred modals this app does not own. Adding a line is still worth it: an
 * entry missing from here is a modal nobody can find. A modal with no payload declares only its
 * reasons; `code-viewer` declares neither.
 */
declare module 'umbra' {
  interface ModalRegistry {
    // ── Learn ────────────────────────────────────────────────────────────────
    simple: { reason: 'confirm' };
    'async-open': { reason: 'confirm' };
    'prepare-failure': { reason: 'close' };
    'no-transition-message': { reason: 'confirm' };
    'confirm-hotkeys': { reason: 'cancel' | 'confirm' };
    'delete-item-modal': { reason: 'cancel' | 'delete' };
    'focus-on-open': { reason: 'delete' | 'keep' };
    'per-action-state': { reason: 'draft' | 'publish' | 'cancel' };
    'reactive-demo': { reason: 'cancel' | 'confirm' };

    // ── Patterns ─────────────────────────────────────────────────────────────
    'slide-preset-drawer': { reason: 'close' };
    'slide-preset-sheet': { reason: 'close' };
    'slide-preset-palette': { reason: 'close' };
    'slide-preset-inspector': { reason: 'close' };
    'slide-corner-toast': { reason: 'dismiss' | 'timeout' };
    'stack-panel': { reason: 'close' };
    'stack-middle': { reason: 'save' };
    'stack-inner': { reason: 'ack' };
    'stack-priority-panel': { reason: 'close' };
    'stack-priority-warning': { reason: 'acknowledge' };
    'imperative-demo': { reason: 'confirm' | 'imperative-demo' };
    'open-request-demo': { data: ArchiveReceipt; reason: 'confirm' | 'cancel' };
    'controlled-filters': { reason: 'close' };
    // Opened by `deployment-service.ts`, which is a plain module with no component — exactly the
    // case the registry answers: the id is the only thing naming them from outside.
    'deploy-confirm': { reason: 'cancel' | 'confirm' };
    'deploy-failure': { reason: 'acknowledge' | 'retry' };
    'outlet-demo': { reason: 'cancel' | 'confirm' };
    'dom-events-alert': { reason: 'ok' };
    'dom-events-panel': { reason: 'ok' };
    'ssr-worker-demo': { reason: 'close' };

    // ── Showcases ────────────────────────────────────────────────────────────
    'grocery-list': { data: number; reason: 'close' | 'sent' };
    'grocery-confirm': { data: number; reason: 'cancel' | 'send' };
    'cosmic-gate': { reason: 'closed' };
    'cosmic-warp': { data: string; reason: 'abort' | 'engage' };
    'vanilla-panel-steps': {
      data: SetupValues;
      reason: 'back' | 'close' | 'next' | 'submit';
    };

    // ── Reference ────────────────────────────────────────────────────────────
    'vanilla-form-example': { data: VanillaFormValues; reason: 'cancel' | 'submit' };
    'mui-form-example': { data: MuiFormValues; reason: 'cancel' | 'submit' };

    // ── The shell's own ──────────────────────────────────────────────────────
    'home-hello': { data: { remember: boolean }; reason: 'confirm' | 'cancel' };
    'code-viewer': Record<string, never>;
  }
}
