import { formatHotkeyLabel } from '../utils/hotkey-utils.js';
import type { ActionEngine, EngineSnapshot } from '../actions/action-engine.js';
import type { ActionCloseFn, ActionFactory, ActionState } from '../actions/types.js';

/**
 * What an action does when it is given no handler: close with its own reason.
 *
 * Typed at `never` rather than at the modal's payload, which is what makes it usable as the
 * default for every action — a handler that ignores its `close` argument fits any payload.
 */
const autoClose: (close: ActionCloseFn) => void = (close) => {
  close();
};

const IDLE: ActionState = { isRunning: false, error: null };

/**
 * Build the `action` factory a modal's `render` is handed.
 *
 * Calling the factory declares the action — the only place an action is ever declared — and
 * returns the props for its button. None of that is renderer work: the props are DOM props, the
 * declaration is a write to the engine, and the reason is the action's identity in every
 * framework.
 *
 * **The three live fields are getters**, and that is what lets one factory serve both bindings.
 * A virtual-DOM renderer spreads the object during render and reads them once, which is exactly
 * the snapshot it wanted. A fine-grained renderer spreads it inside a tracking scope, so reading
 * `disabled` subscribes that one attribute to the engine — no re-render, no wrapper, and no
 * second factory that returns accessors instead.
 *
 * @param engine - The modal's action engine; `declare` and `run` go here.
 * @param readState - The engine's state *as the binding sees it*. React passes its
 *   `useSyncExternalStore` value, Solid passes a signal accessor — which is the whole reason
 *   this is a parameter rather than a call to `engine.getSnapshot()` inside.
 *
 * @internal Not part of the public API — `useModal` builds one and hands out the result.
 */
export function createActionFactory<TData, TReason extends string = string>(
  engine: ActionEngine<TData, TReason>,
  readState: () => EngineSnapshot
): ActionFactory<TData, TReason> {
  return (reason, handlerOrOptions) => {
    const opts = typeof handlerOrOptions === 'function' ? undefined : handlerOrOptions;
    const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : opts?.onAction;
    const effective = handler ?? autoClose;
    const onClickBefore = opts?.onClick;
    const hotkey = opts?.hotkey;

    engine.declare(reason, hotkey);

    const stateOf = (): ActionState => {
      return readState().states[reason] ?? IDLE;
    };

    return {
      type: opts?.type ?? 'button',
      onClick: async (event) => {
        // The caller's handler goes first and owns the veto, so composing a click never has to
        // mean replacing the action's. Same protocol as `onKeyDown`.
        onClickBefore?.(event);
        if (event.defaultPrevented) {
          return;
        }
        await engine.run(reason, effective);
      },
      get 'data-loading'() {
        return stateOf().isRunning;
      },
      // Includes *this* action: a running button that stays clickable re-enters its own handler
      // on a double click, which for a submit means submitting twice.
      get disabled() {
        return readState().hasRunningAction || (opts?.disabled ?? false);
      },
      get 'aria-busy'() {
        return stateOf().isRunning;
      },
      ...(hotkey !== undefined && { 'aria-keyshortcuts': formatHotkeyLabel(hotkey) }),
      ...(opts?.focusOnOpen === true && { 'data-focus-on-open': true }),
    };
  };
}
