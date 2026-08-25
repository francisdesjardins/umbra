import { createStore } from '../store/index.js';
import { formatAriaKeyshortcuts, matchesHotkey } from '../utils/hotkey-utils.js';
import { createLogger } from '../utils/logger.js';
import { normalizeError } from '../utils/normalize-error.js';
import { DISMISS_REASON, type DismissReason } from '../core/dismiss-reason.js';
import type { ActionCloseFn, ActionReason, ActionState, HotkeyDef } from './types.js';

const log = createLogger('action');

/**
 * Execution and state for a dialog's actions — a store plus a handler runner, React-free so a second
 * binding needs it unchanged; `useDialog` owns one and hands out the `action()` factory that writes
 * to it, so nothing has to be handed *in*. Actions are declared by being rendered, each pass
 * re-declaring what it draws, so a stale hotkey cannot keep suppressing the dismiss key.
 */

/**
 * The engine's public state. Exported because a binding reads it *reactively* — the factory's
 * `disabled` and `data-loading` come from a snapshot handed in, not the engine's own getters, so a
 * fine-grained renderer can track them.
 */
export type ActionEngineSnapshot = {
  readonly states: Readonly<Record<string, ActionState>>;
  /**
   * Pre-computed: true when **any** action is running — the flag the hook publishes under the same
   * name. Contrast `ActionState.isRunning`, one action's own, whose object says whose it is.
   */
  readonly hasRunningAction: boolean;
  /** Pre-computed: first non-null error across all actions. */
  readonly error: Error | null;
};

const IDLE: ActionState = { isRunning: false, error: null };

export function createActionEngine<TData, TReason extends string = string>(dialogId: string) {
  const initial: ActionEngineSnapshot = { states: {}, hasRunningAction: false, error: null };

  /** Every action the last completed render drew, against its hotkey if it declared one. */
  let declared = new Map<string, HotkeyDef | undefined>();
  /** Filled while a render pass is in flight, then swapped in wholesale. */
  let pending: Map<string, HotkeyDef | undefined> | null = null;
  /** So the reserved-reason warning below is said once, not once per render pass. */
  let warnedDismiss = false;

  // The close path accepts `'dismiss'`, because the library produces it; the action-facing
  // methods below do not, because no action may be named it — see `ActionReason`.
  let closeFn: ((reason: TReason | DismissReason, data?: TData) => void) | null = null;

  const store = createStore(initial, {
    builder: ({ get, set }) => {
      /** Write one action's state and recompute the aggregates in the same pass. */
      const setState = (reason: string, next: ActionState) => {
        const states = { ...get().states, [reason]: next };
        let hasRunningAction = false;
        let error: Error | null = null;
        for (const state of Object.values(states)) {
          if (state.isRunning) {
            hasRunningAction = true;
          }
          if (error === null && state.error !== null) {
            error = state.error;
          }
        }
        set({ states, hasRunningAction, error });
      };

      return {
        /** State for one action; idle until it has run. */
        stateOf(reason: string): ActionState {
          return get().states[reason] ?? IDLE;
        },

        aggregated(): { hasRunningAction: boolean; error: Error | null } {
          const { hasRunningAction, error } = get();
          return { hasRunningAction, error };
        },

        async run(
          reason: ActionReason<TReason>,
          handler: (close: ActionCloseFn<TData>) => void | Promise<void>
        ): Promise<void> {
          if (get().hasRunningAction) {
            log.warn('Action overlap', { id: dialogId, incoming: reason });
          }
          setState(reason, { isRunning: true, error: null });
          log('Action started', { id: dialogId, reason });
          const startedAt = Date.now();
          try {
            await handler((data?: TData) => {
              // Whether a payload came, never the payload itself, which may carry user data.
              log('Action close', { id: dialogId, reason, withData: data !== undefined });
              closeFn?.(reason, data);
            });
            log('Action completed', { id: dialogId, reason, ms: Date.now() - startedAt });
            setState(reason, { isRunning: false, error: null });
          } catch (err: unknown) {
            const error = normalizeError(err);
            log.error('Action failed', {
              id: dialogId,
              reason,
              error: error.message,
              ms: Date.now() - startedAt,
            });
            setState(reason, { isRunning: false, error });
          }
        },
      };
    },
  });

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    // Wrapped rather than handed over directly: detaching a method from the store loses its
    // receiver, and the lint rule that says so is right to.
    stateOf: (reason: string) => {
      return store.stateOf(reason);
    },
    aggregated: () => {
      return store.aggregated();
    },
    run: (
      reason: ActionReason<TReason>,
      handler: (close: ActionCloseFn<TData>) => void | Promise<void>
    ) => {
      return store.run(reason, handler);
    },

    /** The dialog's own close function, bound once by `useDialog`. */
    bindClose(fn: (reason: TReason | DismissReason, data?: TData) => void): void {
      closeFn = fn;
    },

    // ── Render-pass declaration ───────────────────────────────────────────────

    beginRender(): void {
      pending = new Map();
    },

    /**
     * Called by the `action()` factory as each button is drawn. The guard is the runtime half of a
     * rule the type only half-delivers — a dialog left at the default `TReason` gets no error, and
     * is the one most likely to name a button `'dismiss'` without meaning what that produces.
     * Warned rather than refused, since only the close it reports suffers; once per engine, because
     * React re-declares every pass.
     */
    declare(reason: ActionReason<TReason>, hotkey: HotkeyDef | undefined): void {
      if (!warnedDismiss && reason === DISMISS_REASON) {
        warnedDismiss = true;
        log.warn('Action declared with the reserved dismiss reason — name it cancel or close', {
          id: dialogId,
        });
      }
      (pending ?? declared).set(reason, hotkey);
    },

    endRender(): void {
      if (pending) {
        declared = pending;
        pending = null;
      }
    },

    /**
     * Drop an action's declaration — {@link declare}'s counterpart for a binding whose render is
     * not a *pass*. A fine-grained renderer never re-runs the parent, so the `beginRender`/
     * `endRender` swap never expires anything and a button removed by its own conditional has to
     * say so, or its hotkey outlives it and `hasActions()` keeps backdrop dismissal opt-in.
     */
    undeclare(reason: ActionReason<TReason>): void {
      (pending ?? declared).delete(reason);
    },

    // ── Hotkeys ───────────────────────────────────────────────────────────────

    /** The action whose hotkey matches this event, if any. */
    matchHotkey(event: KeyboardEvent): { reason: string; hotkey: HotkeyDef } | null {
      for (const [reason, hotkey] of declared) {
        if (hotkey !== undefined && matchesHotkey(event, hotkey)) {
          return { reason, hotkey };
        }
      }
      return null;
    },

    /**
     * Whether an action already owns the dialog's dismiss key. Read at keydown rather than
     * captured during render, because the actions are only known once render has run.
     */
    ownsHotkey(candidate: HotkeyDef): boolean {
      const label = formatAriaKeyshortcuts(candidate);
      for (const hotkey of declared.values()) {
        if (hotkey !== undefined && formatAriaKeyshortcuts(hotkey) === label) {
          return true;
        }
      }
      return false;
    },

    /**
     * Whether this dialog drew any actions at all — backdrop dismissal is opt-out without them and
     * opt-in with them, a dialog offering buttons wanting to be dismissed through one.
     */
    hasActions(): boolean {
      return declared.size > 0;
    },
  };
}

/** The engine as its consumers see it. */
export type ActionEngine<TData = never, TReason extends string = string> = ReturnType<
  typeof createActionEngine<TData, TReason>
>;

/**
 * The payload-free half of the engine: what the dismissal and keydown hooks read. They gate ESC /
 * click-outside / backdrop on `isRunning` and dispatch hotkeys, never closing *with data*, so none
 * has to become generic — an `ActionEngine<Result>` is an `ActionGate` whatever `Result` is.
 */
export type ActionGate = Omit<ActionEngine, 'run' | 'bindClose'>;

/** The two engine methods a declaration window needs, and nothing else. */
export type RenderWindow = {
  readonly beginRender: () => void;
  readonly endRender: () => void;
};

/**
 * Run a render pass inside the engine's declaration window — both hook bindings wrap their `render`
 * call in exactly this, so by the rule that decides what is core, it is core. The `finally` is what
 * makes it worth sharing: a `render` that throws must still close the window, or every later
 * `hasActions()` answers from a half-built map. It also has to live *outside* the hook, since the
 * React Compiler cannot lower a `try` with no `catch` and bails per function — inline, these four
 * lines leave the whole of `useDialog` uncompiled.
 *
 * @example
 * const content = runDeclarationWindow(engine, () => {
 *   return render(args);
 * });
 */
export function runDeclarationWindow<T>(engine: RenderWindow, render: () => T): T {
  engine.beginRender();
  try {
    return render();
  } finally {
    engine.endRender();
  }
}
