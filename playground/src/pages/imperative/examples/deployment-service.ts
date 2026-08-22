// A plain TypeScript service — no React, no hooks. It imports the package root, not `/react`, so it
// compiles where React is absent: the shape an API client, router guard or websocket handler takes.
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import type { ModalId } from 'umbra';
import { dialogManager } from 'umbra';

export const CONFIRM_MODAL_ID = 'deploy-confirm';
export const FAILURE_MODAL_ID = 'deploy-failure';

export type Environment = 'staging' | 'production';

type Activity = { readonly at: string; readonly text: string };

// ── Await a user decision from non-React code ────────────────────────────────

/**
 * The imperative `openAndWait()`: open, resolve with the close reason, and unsubscribe in the
 * one-shot listener so a caller that never awaits leaks nothing.
 */
// The id narrows, the reason cannot: `subscribe` is a broadcast over every dialog on the page, so
// one event type serves them all and `reason` is `string`. The typed await lives on the hook
// (`modal.openAndWait()`), and this caller has no component to hold one.
const openAndAwaitClose = (id: ModalId) => {
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
// A hand-rolled listener set rather than the library's `createStore` — which is a root export and
// would work here — because a real service brings the state primitive it already uses.

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

/** Confirm, call the API, report success or raise the failure dialog — the UI orchestrates none. */
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

// Arrow properties, not methods: `useSyncExternalStore` calls them detached from the object.
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
