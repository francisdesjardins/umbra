import type { HotkeyDef } from './types.js';

/**
 * Symbol key under which an action set carries its private bridge to `useModal`.
 * Keeping it symbol-keyed keeps the plumbing (`getState`, `subscribe`, close
 * registration, generated `onKeyDown`) off the object's string-key surface — users
 * spreading or autocompleting an action never see it, honouring the "no abstraction
 * leakage" rule.
 */
export const ACTIONS_BRIDGE: unique symbol = Symbol('dialog.actions.bridge');

/**
 * Private interface `useModal` reads from an action set. Not part of the
 * public API — reachable only through the {@link ACTIONS_BRIDGE} symbol.
 *
 * @internal
 */
export type ActionsBridge<TData = never> = {
  /** Current aggregated action state — used to gate backdrop/ESC dismissal. */
  readonly getState: () => { readonly isRunning: boolean };
  /** Subscribe to action state changes. Returns an unsubscribe function. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Generated keydown handler from declared action hotkeys, if any. */
  readonly onKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  /** Hotkey defs declared on actions, for dismiss-key collision detection. */
  readonly actionHotkeys?: readonly HotkeyDef[] | undefined;
  /** Registers the modal's close function for action-bound close. */
  readonly registerClose: (
    closeFn: (reason: string, data?: TData) => void,
    modalId: string
  ) => void;
  /** Unregisters the modal's close function. */
  readonly unregisterClose: () => void;
};

/**
 * The payload-free half of the bridge: everything the dismissal and keydown hooks read.
 *
 * They gate ESC / click-outside / backdrop on `isRunning` and dispatch action hotkeys; none of
 * them ever closes *with data*, so none of them needs `registerClose` — the only member that
 * mentions the payload type. Handing them this instead of the full bridge is what keeps them
 * non-generic: a `ActionsBridge<Result>` is a `ActionsGate`, whatever `Result` is.
 *
 * @internal
 */
export type ActionsGate = Omit<ActionsBridge, 'registerClose' | 'unregisterClose'>;

/**
 * Structural marker for the `actions` option on `useModal`: anything carrying
 * an `ActionsBridge` under the `ACTIONS_BRIDGE` symbol.
 * `useModalActions`'s return value satisfies it.
 *
 * @typeParam TData - The close payload the actions produce. `TData` appears only inside a
 * callback parameter of `registerClose`, i.e. twice contravariantly, which makes the binding
 * **covariant**: an action set that closes with `Result` satisfies `useModal<Result>`, one
 * that closes bare (`never`) satisfies any modal, and one declaring a payload the modal does
 * not accept is a type error at the `actions` option.
 */
export type ActionsBinding<TData = never> = {
  /** The private bridge, symbol-keyed so it stays off the string-key surface. */
  readonly [ACTIONS_BRIDGE]: ActionsBridge<TData>;
};
