import { createStore } from '../store/index.js';
import { formatAriaKeyshortcuts, matchesHotkey } from '../utils/hotkey-utils.js';
import { createLogger } from '../utils/logger.js';
import { normalizeError } from '../utils/normalize-error.js';
import { DISMISS_REASON, type DismissReason } from '../core/dismiss-reason.js';
import type { ActionCloseFn, ActionReason, ActionState, HotkeyDef } from './types.js';

const log = createLogger('action');

/**
 * Execution and state for a modal's actions.
 *
 * React-free on purpose: it is a store plus a handler runner, and a second binding needs it
 * unchanged. `useModal` owns one of these and hands out the `action()` factory that writes to
 * it, which is why there is no bridge — nothing has to be handed *in*.
 *
 * Actions are declared by being rendered. Each render pass re-declares the ones it draws, so
 * the hotkey table always describes the buttons currently on screen rather than every button
 * ever drawn — which matters because a stale hotkey would keep suppressing the dismiss key.
 */

/**
 * The engine's public state. Exported because a binding reads it *reactively* — the action
 * factory's `disabled` and `data-loading` are computed from a snapshot the binding hands in,
 * not from the engine's own getters, so a fine-grained renderer can track them.
 */
export type ActionEngineSnapshot = {
  readonly states: Readonly<Record<string, ActionState>>;
  /**
   * Pre-computed: true when **any** action is running — the same flag the hook publishes as
   * `hasRunningAction`, under the same name. Contrast `ActionState.isRunning`, which is one
   * action's own: the object it hangs on says whose it is, this one has to say it itself.
   */
  readonly hasRunningAction: boolean;
  /** Pre-computed: first non-null error across all actions. */
  readonly error: Error | null;
};

const IDLE: ActionState = { isRunning: false, error: null };

export function createActionEngine<TData, TReason extends string = string>(modalId: string) {
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
            log.warn('Action overlap', { id: modalId, incoming: reason });
          }
          setState(reason, { isRunning: true, error: null });
          log('Action started', { id: modalId, reason });
          const startedAt = Date.now();
          try {
            await handler((data?: TData) => {
              // Log that close was called and whether a payload came with it — never the payload
              // itself, which may carry user data.
              log('Action close', { id: modalId, reason, withData: data !== undefined });
              closeFn?.(reason, data);
            });
            log('Action completed', { id: modalId, reason, ms: Date.now() - startedAt });
            setState(reason, { isRunning: false, error: null });
          } catch (err: unknown) {
            const error = normalizeError(err);
            log.error('Action failed', {
              id: modalId,
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

    /** The modal's own close function, bound once by `useModal`. */
    bindClose(fn: (reason: TReason | DismissReason, data?: TData) => void): void {
      closeFn = fn;
    },

    // ── Render-pass declaration ───────────────────────────────────────────────

    beginRender(): void {
      pending = new Map();
    },

    /**
     * Called by the `action()` factory as each button is drawn.
     *
     * The guard is the runtime half of a compile-time rule, and it is needed because the type
     * only half-delivers: `ActionReason` is `Exclude<TReason, DismissReason>`, and
     * `Exclude<string, 'dismiss'>` is `string` — so a modal that left `TReason` at its default
     * gets no error at all, which is precisely the modal most likely to name a button
     * `'dismiss'` without meaning what that produces. Warned rather than refused: the button
     * works, it is the close it reports that stops being distinguishable from the four the
     * library raises on its own. Said once per engine, because React re-declares every pass.
     */
    declare(reason: ActionReason<TReason>, hotkey: HotkeyDef | undefined): void {
      if (!warnedDismiss && reason === DISMISS_REASON) {
        warnedDismiss = true;
        log.warn('Action declared with the reserved dismiss reason — name it cancel or close', {
          id: modalId,
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
     * Drop an action's declaration.
     *
     * The counterpart to {@link declare} for a binding whose render is not a *pass*. React
     * re-runs `render` wholesale and the `beginRender`/`endRender` swap is what expires a
     * declaration; a fine-grained renderer never re-runs the parent, so a button removed by its
     * own conditional has to say so. Without it the hotkey outlives the button, and — because
     * `hasActions()` decides whether backdrop click dismisses — a modal that has drawn its last
     * action silently stays opt-in.
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
     * Whether an action already owns the modal's dismiss key. Read at keydown rather than
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
     * Whether this modal drew any actions at all. Backdrop dismissal is opt-out without them
     * and opt-in with them, on the reasoning that a modal offering buttons wants to be
     * dismissed through one.
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
 * The payload-free half of the engine: what the dismissal and keydown hooks read.
 *
 * They gate ESC / click-outside / backdrop on `isRunning` and dispatch hotkeys; none of them
 * ever closes *with data*, so none of them has to become generic. An `ActionEngine<Result>` is
 * an `ActionGate` whatever `Result` is.
 */
export type ActionGate = Omit<ActionEngine, 'run' | 'bindClose'>;

/** The two engine methods a declaration window needs, and nothing else. */
export type RenderWindow = {
  readonly beginRender: () => void;
  readonly endRender: () => void;
};

/**
 * Run a render pass inside the engine's declaration window.
 *
 * Both hook bindings wrap their `render` call in exactly this, so by the rule that decides what
 * is core, it is core. The `finally` is what makes it worth sharing rather than inlining: a
 * `render` that throws must still close the window, or the engine keeps the half-built map of a
 * pass that never finished and every later `hasActions()` answers from it.
 *
 * It also has to live *outside* the hook, which is a second reason and the less obvious one. The
 * React Compiler cannot lower a `try` with no `catch`, and it bails per function — so with these
 * four lines inline, the whole of `useModal` went uncompiled. Out here they are an ordinary
 * function the compiler ignores, and the hook compiles.
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
