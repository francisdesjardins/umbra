import { useState, useSyncExternalStore } from 'react';
import { createStore } from '../store/index.js';
import { clickHotkeyButton, formatHotkeyLabel, matchesHotkey } from '../utils/hotkey-utils.js';
import { createLogger } from '../utils/logger.js';
import { normalizeError } from '../utils/normalize-error.js';
import { ACTIONS_BRIDGE, type ActionsBridge } from './bridge.js';
import type {
  ActionCallable,
  ActionCloseFn,
  ActionDefinition,
  ActionPayload,
  ActionState,
  HotkeyDef,
  UseModalActionsReturn,
} from './types.js';

export type {
  ActionButtonProps,
  ActionCallable,
  ActionClickEvent,
  ActionCloseFn,
  ActionDefinition,
  ActionKeys,
  ActionOptions,
  ActionPayload,
  HotkeyDef,
  UseModalActionsReturn,
} from './types.js';

const log = createLogger('action');

/**
 * Marks a `useModalActions` config key as an action.
 *
 * The key it is assigned to **is** the action's identity: it names the callable
 * (`actions.confirm(…)`), it is the reason the modal closes with, and it is what
 * `ActionKeys<TConfig>` reports. There is nothing to keep in sync.
 *
 * @typeParam TData - Payload this action closes with. Defaults to `void`; declare it as
 *   `defineAction<Result>()` to type the action's `close(data)`.
 *
 *   **This is the payload's one declaration.** It flows from here into the modal — through
 *   `ActionPayload` and the action set you pass as `actions` — so `useModal({ actions })` picks
 *   `Result` up on its own and `useModal<Result>({ actions })` only restates what this already
 *   said. The template hooks infer it the same way. A modal still declares its own payload in
 *   the two cases where nothing carries one: when it has no `actions`, or when every action
 *   closes bare and the payload travels through `handle.close` instead.
 * @param options - Optional configuration
 * @param options.hotkey - Keyboard shortcut that triggers this action automatically.
 *   When set, `useModalActions` generates an `onKeyDown` handler and wires it
 *   into `useModal` via the actions bridge — no manual `onKeyDown` needed.
 *   If the hotkey matches the modal's `dismissKey`, dismiss is suppressed automatically.
 *
 * @example
 * const controller = useModalActions({
 *   cancel: defineAction({ hotkey: Key.Escape }),
 *   confirm: defineAction({ hotkey: Key.Enter }),
 * });
 *
 * // Action keys → callable. Omit the handler to auto-close with the action's reason.
 * const buttons = (
 *   <>
 *     <button
 *       {...controller.confirm(async (close) => {
 *         await api.confirm();
 *         close();
 *       })}
 *     >
 *       OK
 *     </button>
 *     <button {...controller.cancel()}>Cancel</button>
 *   </>
 * );
 */
export function defineAction<TData = void>(options?: {
  readonly hotkey?: HotkeyDef | undefined;
}): ActionDefinition<TData> {
  return { _type: 'dialog.action', hotkey: options?.hotkey };
}

function isActionControllerMarker(value: unknown): value is ActionDefinition<unknown> {
  // No cast needed: the `in` check narrows `value` to something with a `_type` key, which is
  // what makes the property access below type-safe on its own.
  return (
    typeof value === 'object' &&
    value !== null &&
    '_type' in value &&
    value['_type'] === 'dialog.action'
  );
}

// ── Action Engine ────────────────────────────────────────────────────────────
// Manages action execution and close-function bridging. Holds no handler registry: a
// callable already closes over its handler, so the button props it returns carry it to
// `runAction` directly — nothing has to be written during render to find it later.

type ActionHandler<TData> = (close: ActionCloseFn<TData>) => void | Promise<void>;

type ActionEngineSnapshot = {
  readonly actionStates: Record<string, ActionState>;
  /** Pre-computed: true when any action is running. */
  readonly isRunning: boolean;
  /** Pre-computed: first non-null error across all actions. */
  readonly error: Error | null;
};

function createActionEngine<TData>(
  actionKeys: readonly string[],
  hotkeyMap: ReadonlyMap<string, HotkeyDef>
) {
  const initialStates: Record<string, ActionState> = {};
  for (const key of actionKeys) {
    initialStates[key] = { isRunning: false, error: null };
  }

  // Annotate the snapshot and the builder's return rather than instantiating `createStore`
  // explicitly — the shape `createModalStore` uses, and the one that keeps `TData` flowing
  // into the methods without being named twice.
  const initial: ActionEngineSnapshot = {
    actionStates: initialStates,
    isRunning: false,
    error: null,
  };

  return createStore(initial, ({ get, set }): ActionEngineMethods<TData> => {
    let closeFn: ((reason: string, data?: TData) => void) | null = null;
    let modalId: string | undefined;

    /** Update a single action's state and recompute the aggregated fields. */
    function setActionState(key: string, state: ActionState) {
      const actionStates = { ...get().actionStates, [key]: state };
      let isRunning = false;
      let error: Error | null = null;
      for (const a of Object.values(actionStates)) {
        if (a.isRunning) {
          isRunning = true;
        }
        if (error === null && a.error !== null) {
          error = a.error;
        }
      }
      set({ actionStates, isRunning, error });
    }

    return {
      actionKeys,

      async runAction(key: string, handler: ActionHandler<TData>): Promise<void> {
        if (get().isRunning) {
          log.warn('Action overlap', { id: modalId, incoming: key });
        }
        setActionState(key, { isRunning: true, error: null });
        log('Action started', { id: modalId, reason: key });
        const startedAt = Date.now();
        try {
          await handler((data?: TData) => {
            // Log that the handler invoked close, and whether a payload came
            // with it — never the payload itself, which may carry user data.
            log('Action close', { id: modalId, reason: key, withData: data !== undefined });
            closeFn?.(key, data);
          });
          log('Action completed', { id: modalId, reason: key, ms: Date.now() - startedAt });
          setActionState(key, { isRunning: false, error: null });
        } catch (err: unknown) {
          const error = normalizeError(err);
          log.error('Action failed', {
            id: modalId,
            reason: key,
            error: error.message,
            ms: Date.now() - startedAt,
          });
          setActionState(key, { isRunning: false, error });
        }
      },

      getAggregated(): { isRunning: boolean; error: Error | null } {
        const { isRunning, error } = get();
        return { isRunning, error };
      },

      registerClose(fn: (reason: string, data?: TData) => void, id: string) {
        if (modalId === undefined) {
          modalId = id;
          for (const [action, hotkey] of hotkeyMap) {
            log('Hotkey registered', { id, action, hotkey: formatHotkeyLabel(hotkey) });
          }
        }
        closeFn = fn;
      },

      unregisterClose() {
        closeFn = null;
      },

      getModalId(): string | undefined {
        return modalId;
      },
    };
  });
}

type ActionEngineMethods<TData> = {
  actionKeys: readonly string[];
  runAction(key: string, handler: ActionHandler<TData>): Promise<void>;
  getAggregated(): { isRunning: boolean; error: Error | null };
  registerClose(fn: (reason: string, data?: TData) => void, id: string): void;
  unregisterClose(): void;
  getModalId(): string | undefined;
};

type ActionEngine<TData> = ReturnType<typeof createActionEngine<TData>>;

/**
 * Default handler for a callable invoked without one: auto-close with the reason.
 *
 * Typed at `never` rather than at the declared payload, which is what makes it usable as the
 * default for every action: a handler that ignores its `close` argument's payload is
 * assignable to any `ActionHandler<TData>`.
 */
const autoClose: ActionHandler<never> = (close) => {
  close();
};

/**
 * Builds the stable, symbol-keyed bridge `useModal` reads from the action set.
 * Created once per action-set identity so the modal's registration effect runs
 * once instead of every render.
 */
function createBridge<TData>(
  engine: ActionEngine<TData>,
  hotkeyMap: ReadonlyMap<string, HotkeyDef>
): ActionsBridge<TData> {
  const base: ActionsBridge<TData> = {
    getState: () => {
      return engine.getAggregated();
    },
    subscribe: engine.subscribe,
    registerClose: (fn, id) => {
      engine.registerClose(fn, id);
    },
    unregisterClose: () => {
      engine.unregisterClose();
    },
  };

  if (hotkeyMap.size === 0) {
    return base;
  }

  return {
    ...base,
    actionHotkeys: Array.from(hotkeyMap.values()),
    onKeyDown: (event: KeyboardEvent) => {
      if (engine.getSnapshot().isRunning) {
        return;
      }
      for (const [key, hotkey] of hotkeyMap) {
        if (matchesHotkey(event, hotkey)) {
          event.preventDefault();
          log('Hotkey hit', {
            id: engine.getModalId(),
            action: key,
            hotkey: formatHotkeyLabel(hotkey),
          });
          if (event.currentTarget instanceof HTMLElement) {
            clickHotkeyButton(event.currentTarget, hotkey);
          }
          return;
        }
      }
    },
  };
}

/**
 * React hook for modal action button management.
 *
 * Each action key (declared via `defineAction()`) becomes a
 * callable that returns button props (`{ onClick, loading, 'data-loading', disabled }`) to spread
 * onto your own button. Pass a handler for custom logic, or omit it to auto-close
 * the modal with the action's reason.
 *
 * **The config key is the action's reason.** `confirm: defineAction()` closes the
 * modal with `reason: 'confirm'`, so `ActionKeys<TConfig>` is both the callable names and the
 * set of reasons — one declaration, nothing to keep in sync.
 *
 * For custom state management, use `createStore`/`useStore` alongside this hook.
 *
 * @param config - Object mapping keys to action controllers
 *
 * @example
 * const controller = useModalActions({
 *   cancel: defineAction(),
 *   confirm: defineAction(),
 * });
 *
 * // In render — `isRunning` and `error` are the combined state of the whole set.
 * const footer = (
 *   <>
 *     <button {...controller.cancel()}>Cancel</button>
 *     <button
 *       {...controller.confirm(async (close) => {
 *         await api.confirm();
 *         close();
 *       })}
 *     >
 *       Confirm
 *     </button>
 *     {controller.error ? <p role="alert">{controller.error.message}</p> : null}
 *   </>
 * );
 */
export function useModalActions<TConfig extends Record<string, unknown>>(
  config: TConfig
): UseModalActionsReturn<TConfig> {
  const [init] = useState(() => {
    const actionKeys: string[] = [];
    const hotkeyMap = new Map<string, HotkeyDef>();

    for (const [key, value] of Object.entries(config)) {
      if (isActionControllerMarker(value)) {
        actionKeys.push(key);
        if (value.hotkey !== undefined) {
          hotkeyMap.set(key, value.hotkey);
        }
      }
    }

    const engine = createActionEngine<ActionPayload<TConfig>>(actionKeys, hotkeyMap);
    const bridge = createBridge(engine, hotkeyMap);

    return { engine, hotkeyMap, bridge };
  });

  const { engine, hotkeyMap, bridge } = init;
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  const result: Record<string | symbol, unknown> = {};

  const actions = snap.actionStates;
  // Aggregated state is pre-computed in the engine snapshot — O(1) read
  const anyRunning = snap.isRunning;
  const lastError = snap.error;

  for (const key of engine.actionKeys) {
    const actionState = actions[key];
    if (!actionState) {
      continue;
    }
    const hotkey = hotkeyMap.get(key);
    // Annotated with the same `ActionCallable` the return type maps each key to, rather than
    // restating its parameter and return types here. `result` is a `Record<…, unknown>` that is
    // asserted to `UseModalActionsReturn` at the end, so this annotation is what actually
    // checks the callable against the type users are handed.
    const callable: ActionCallable<ActionPayload<TConfig>> = (handlerOrOptions) => {
      const options = typeof handlerOrOptions === 'function' ? undefined : handlerOrOptions;
      const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : options?.onAction;
      const effective = handler ?? autoClose;
      const onClickBefore = options?.onClick;

      return {
        type: options?.type ?? 'button',
        onClick: async (event) => {
          // The caller's handler goes first and owns the veto, so composing a click never has
          // to mean replacing the action's. Same protocol as `useModal`'s `onKeyDown`.
          onClickBefore?.(event);
          if (event.defaultPrevented) {
            return;
          }
          await engine.runAction(key, effective);
        },
        loading: actionState.isRunning,
        'data-loading': actionState.isRunning,
        // Includes *this* action: a running button that stays clickable re-enters its own
        // handler on a double click, which for a submit means submitting twice.
        disabled: anyRunning || (options?.disabled ?? false),
        'aria-busy': actionState.isRunning,
        ...(hotkey !== undefined && { 'aria-keyshortcuts': formatHotkeyLabel(hotkey) }),
      };
    };
    result[key] = callable;
  }

  result['isRunning'] = anyRunning;
  result['error'] = lastError;
  result[ACTIONS_BRIDGE] = bridge;

  return result as UseModalActionsReturn<TConfig>;
}
