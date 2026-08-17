import { formatAriaKeyshortcuts } from '../utils/hotkey-utils.js';
import type { ActionEngine, ActionEngineSnapshot } from '../actions/action-engine.js';
import type { ActionCloseFn, ActionFactory, ActionReason, ActionState } from '../actions/types.js';

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
 * The factory's call half, derived rather than restated.
 *
 * `Object.assign` needs a plain function to attach `isRunning` to, and a bare arrow cannot be
 * annotated `ActionFactory` while that method is still missing. Deriving the signature means a
 * change to it in `actions/types.ts` lands here without an edit — and the assembled result is
 * still checked against `ActionFactory` by this module's return type.
 */
type DeclareAction<TData, TReason extends string> = (
  ...args: Parameters<ActionFactory<TData, TReason>>
) => ReturnType<ActionFactory<TData, TReason>>;

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
  readState: () => ActionEngineSnapshot
): ActionFactory<TData, TReason> {
  /**
   * One action's state, as the binding currently sees it. Hoisted out of the factory because
   * `isRunning` asks the same question from outside any single action's props.
   */
  const stateOf = (reason: string): ActionState => {
    return readState().states[reason] ?? IDLE;
  };

  const declare: DeclareAction<TData, TReason> = (reason, handlerOrOptions) => {
    const opts = typeof handlerOrOptions === 'function' ? undefined : handlerOrOptions;
    const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : opts?.onAction;
    const effective = handler ?? autoClose;
    const onClickBefore = opts?.onClick;
    const hotkey = opts?.hotkey;

    engine.declare(reason, hotkey);

    return {
      type: opts?.type ?? 'button',
      // Not a getter: the reason is the action's identity and cannot change for a given button, and
      // the focus restore has to be able to find it again — see `ActionButtonProps`.
      'data-action-reason': reason,
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
        return stateOf(reason).isRunning;
      },
      // Includes *this* action: a running button that stays clickable re-enters its own handler
      // on a double click, which for a submit means submitting twice.
      get disabled() {
        return readState().hasRunningAction || (opts?.disabled ?? false);
      },
      get 'aria-busy'() {
        return stateOf(reason).isRunning;
      },
      ...(hotkey !== undefined && { 'aria-keyshortcuts': formatAriaKeyshortcuts(hotkey) }),
      ...(opts?.focusOnOpen === true && { 'data-focus-on-open': true }),
    };
  };

  // Assigned rather than declared alongside the props: `isRunning` reads the same `readState`
  // the live props do, so a binding that tracks one tracks the other — React re-renders on the
  // snapshot it already subscribes to, Solid subscribes the one expression that called this.
  // Neither binding contributes a line.
  return Object.assign(declare, {
    isRunning: (reason: ActionReason<TReason>): boolean => {
      return stateOf(reason).isRunning;
    },
  });
}
