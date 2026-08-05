// A plain TypeScript service. Note what is absent: React, components, hooks. It imports the
// package root — the dialog manager itself — not the `/react` binding, and would compile and
// run in a project where React is not installed.
//
// This is the shape a real service takes: an API client, a router guard, a websocket handler.
// Code that must ask the user something or report a failure, but has no component to hang a
// hook off.
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { dialogManager } from 'umbra';

export const CONFIRM_MODAL_ID = 'deploy-confirm';
export const FAILURE_MODAL_ID = 'deploy-failure';

export type Environment = 'staging' | 'production';

type Activity = { readonly at: string; readonly text: string };

// ── Await a user decision from non-React code ────────────────────────────────

/**
 * Open a dialog and resolve with the reason it closed.
 *
 * This is the piece that makes dialogs usable from a service: React callers get
 * `modal.waitForClose()`, and the imperative equivalent is `open()` plus a one-shot
 * `subscribe()`. The listener unsubscribes itself, so a caller that never awaits does not
 * leak a subscription.
 */
const openAndAwaitClose = (id: string) => {
  return new Promise<string>((resolve) => {
    const unsubscribe = dialogManager.subscribe((event) => {
      if (event.type === 'close' && event.id === id) {
        unsubscribe();
        resolve(event.reason ?? 'dismiss');
      }
    });
    dialogManager.open(id);
  });
};

// ── Service state ────────────────────────────────────────────────────────────
//
// A hand-rolled listener set rather than the library's `createStore`: that lives behind the
// React barrel, so importing it here would pull React back in and defeat the point. Your own
// service brings whatever state primitive it already uses.

let activity: readonly Activity[] = [];
let target: Environment = 'staging';
let lastError = '';

const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) {
    listener();
  }
};

const record = (text: string) => {
  activity = [{ at: new Date().toLocaleTimeString(), text }, ...activity].slice(0, 8);
  emit();
};

// ── Public surface ───────────────────────────────────────────────────────────

/**
 * The whole flow, driven from here: ask for confirmation, call the API, then report success
 * or raise the failure dialog. The UI orchestrates none of it — it only registers the two
 * modals this service opens by id.
 */
const deploy = async (environment: Environment) => {
  target = environment;
  emit();

  const decision = await openAndAwaitClose(CONFIRM_MODAL_ID);
  if (decision !== 'confirm') {
    record(`Deploy to ${environment} cancelled (${decision})`);
    return;
  }

  record(`Deploying to ${environment}…`);
  try {
    await simulateApiCall(`Deploy to ${environment}`, 1200);
    record(`Deployed to ${environment} ✓`);
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    record(`Deploy to ${environment} failed`);
    dialogManager.open(FAILURE_MODAL_ID);
  }
};

// Arrow properties, not methods: `subscribe` and the getters are handed straight to
// `useSyncExternalStore`, which calls them detached from the object.
export const deploymentService = {
  /** Subscribe to service state. Returns an unsubscribe, so React can pass it to an effect. */
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getActivity: () => {
    return activity;
  },
  getTarget: () => {
    return target;
  },
  getLastError: () => {
    return lastError;
  },

  deploy,

  /** Called from the failure dialog's Retry button — the service owns the retry, not the UI. */
  retry: async () => {
    dialogManager.close(FAILURE_MODAL_ID, 'retry');
    await deploy(target);
  },
};
