import type { ArchiveReceipt } from '@/pages/imperative/examples/open-request';
import type { PrintJob } from '@/pages/imperative/examples/declared-payload';
import type { SetupValues } from '@/pages/showcases/examples/vanilla-panel';
import type { FormValues as MuiFormValues } from '@/pages/ui-integrations/examples/mui-form';
import type { FormValues as VanillaFormValues } from '@/pages/ui-integrations/examples/vanilla-form';

/**
 * Every modal this playground opens, and what each one closes with.
 *
 * The list is the point. An id is a string the manager routes on, so without somewhere to write
 * them down "which component owns `stack-priority-warning`" is a grep — and with them written down
 * it is find-references on the key. The typing follows: a declared modal infers its payload and its
 * reasons at every `useDialog` call, and `close` refuses a reason belonging to a different one.
 *
 * **The list is not enforced to be complete**, which is what lets `/stories` render the library's
 * own harnesses — a few hundred modals this app does not own. Adding a line is still worth it: an
 * entry missing from here is a modal nobody can find. A modal with no payload declares only its
 * reasons; `code-viewer` declares neither.
 */
declare module 'umbra' {
  interface DialogRegistry {
    // ── Learn ────────────────────────────────────────────────────────────────
    simple: { closesWith: 'confirm' };
    'async-open': { closesWith: 'confirm' };
    'prepare-failure': { closesWith: 'close' };
    'no-transition-message': { closesWith: 'confirm' };
    'confirm-hotkeys': { closesWith: 'cancel' | 'confirm' };
    'delete-item-modal': { closesWith: 'cancel' | 'delete' };
    'focus-on-open': { closesWith: 'delete' | 'keep' };
    'per-action-state': { closesWith: 'draft' | 'publish' | 'cancel' };
    'reactive-demo': { closesWith: 'cancel' | 'confirm' };

    // ── Patterns ─────────────────────────────────────────────────────────────
    'slide-preset-drawer': { closesWith: 'close' };
    'slide-preset-sheet': { closesWith: 'close' };
    'slide-preset-palette': { closesWith: 'close' };
    'slide-preset-inspector': { closesWith: 'close' };
    'slide-corner-toast': { closesWith: 'dismiss' | 'timeout' };
    'stack-panel': { closesWith: 'close' };
    'stack-middle': { closesWith: 'save' };
    'stack-inner': { closesWith: 'ack' };
    'stack-priority-panel': { closesWith: 'close' };
    'stack-priority-warning': { closesWith: 'acknowledge' };
    'bulk-first': { closesWith: 'close' | 'close-all' | 'close-others' };
    'bulk-second': { closesWith: 'close' | 'close-all' | 'close-others' };
    'bulk-third': { closesWith: 'close' | 'close-all' | 'close-others' };
    'imperative-demo': { closesWith: 'confirm' | 'imperative-demo' };
    'open-request-demo': { closesWith: { confirm: ArchiveReceipt; cancel: void } };
    'controlled-filters': { closesWith: 'close' };
    'deferred-open-target': { closesWith: 'close' };
    // The other direction: `payload` is what this one is *opened* with, checked at the ask.
    'print-job': { opensWith: PrintJob; closesWith: 'cancel' | 'print' };
    // Opened by `deployment-service.ts`, which is a plain module with no component — exactly the
    // case the registry answers: the id is the only thing naming them from outside.
    'deploy-confirm': { closesWith: 'cancel' | 'confirm' };
    'deploy-failure': { closesWith: 'acknowledge' | 'retry' };
    'outlet-demo': { closesWith: 'cancel' | 'confirm' };
    'dom-events-alert': { closesWith: 'ok' };
    'dom-events-panel': { closesWith: 'ok' };
    'ssr-worker-demo': { closesWith: 'close' };

    // ── Showcases ────────────────────────────────────────────────────────────
    'grocery-list': { closesWith: { sent: number; close: void } };
    'grocery-confirm': { closesWith: { send: number; cancel: void } };
    'cosmic-gate': { closesWith: 'closed' };
    'cosmic-warp': { closesWith: { engage: string; abort: void } };
    'vanilla-panel-steps': {
      closesWith: { submit: SetupValues; back: void; close: void; next: void };
    };

    // ── Reference ────────────────────────────────────────────────────────────
    'vanilla-form-example': { closesWith: { submit: VanillaFormValues; cancel: void } };
    'mui-form-example': { closesWith: { submit: MuiFormValues; cancel: void } };

    // ── The shell's own ──────────────────────────────────────────────────────
    'home-hello': { closesWith: { confirm: { remember: boolean }; cancel: void } };
    'code-viewer': Record<string, never>;
  }
}
