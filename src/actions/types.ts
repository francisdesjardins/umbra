import type { KeyValue } from '../utils/keys.js';
import type { ActionsBinding } from './bridge.js';

// ── Hotkey & action types ────────────────────────────────────────────────────

/**
 * A hotkey definition expressed as a single string.
 *
 * Template literal types give autocomplete and type-safety for all combinations of
 * `Key` values (including letters `a–z`, digits `0–9`, navigation, function keys, etc.)
 * with up to three modifiers (Ctrl, Alt, Shift, Meta):
 *
 * - Plain key: `Key.Enter`, `Key.Escape`, `Key.A`, `Key.Digit3`
 * - With modifiers: `"Ctrl+Enter"`, `"Shift+Tab"`, `"Ctrl+Shift+S"`, `"Alt+F4"`
 *
 * The union is closed, which is what makes a mistyped `'Escpae'` a compile error. A key that
 * is genuinely missing (a media key, a browser-specific one) belongs in `Key` — a one-line
 * addition that every consumer gets.
 *
 * **Letter case is not significant.** `'Shift+s'` (what `` `Shift+${Key.S}` `` produces) and
 * `'Shift+S'` (what you type by hand) are the same hotkey; whether Shift is held is decided by
 * the modifier list alone, so CapsLock cannot change which hotkey fires.
 */
export type HotkeyDef =
  // Plain key
  | KeyValue

  // Single modifier + key
  | `Ctrl+${KeyValue}`
  | `Alt+${KeyValue}`
  | `Shift+${KeyValue}`
  | `Meta+${KeyValue}`
  // Double modifier + key
  | `Ctrl+Shift+${KeyValue}`
  | `Ctrl+Alt+${KeyValue}`
  | `Ctrl+Meta+${KeyValue}`
  | `Alt+Shift+${KeyValue}`
  | `Alt+Meta+${KeyValue}`
  | `Shift+Meta+${KeyValue}`
  // Triple modifier + key
  | `Ctrl+Alt+Shift+${KeyValue}`
  | `Ctrl+Alt+Meta+${KeyValue}`
  | `Ctrl+Shift+Meta+${KeyValue}`;

/**
 * Type-only key under which a marker carries its close-payload type.
 *
 * `declare` means nothing is emitted, so a marker never actually has this property — it exists
 * so `ActionDefinition<TData>` is distinguishable by `TData` and the payload can be
 * recovered with `infer`. It sits under a symbol for the same reason the actions bridge
 * does: off the string-key surface, invisible to autocomplete.
 */
export declare const ACTION_PAYLOAD: unique symbol;

/**
 * Marker returned by `defineAction()`, identifying a `useModalActions` config key
 * as an action.
 *
 * The action's **close reason is the config key**, not anything stored here — see
 * `useModalActions`. What the marker does carry is the payload type that key closes with.
 *
 * @typeParam TData - What this action's `close(data)` accepts. Defaults to `void` (no payload).
 */
export type ActionDefinition<TData = void> = {
  /** Discriminant that marks this config key as an action. */
  readonly _type: 'dialog.action';
  /** Keyboard shortcut wired automatically; see `defineAction`. */
  readonly hotkey?: HotkeyDef | undefined;
  /** Phantom key carrying `TData`; never present at runtime. */
  readonly [ACTION_PAYLOAD]?: TData;
};

/**
 * The payload-agnostic shape of a marker: what makes a config key an action, with nothing
 * said about its payload. Used wherever the question is "is this an action?" rather than
 * "what does it close with?" — `ActionDefinition<void>` would answer the first question
 * wrongly for any action that declares a payload.
 */
type AnyActionMarker = { readonly _type: 'dialog.action' };

/** Recover the payload type a marker declares. */
type PayloadOf<TMarker> = TMarker extends { readonly [ACTION_PAYLOAD]?: infer TData }
  ? TData
  : void;

/**
 * The close payload an action set can produce: the union of its actions' payloads, with
 * `void` removed.
 *
 * Dropping `void` is what makes the common mixed case work. If `confirm` closes with a
 * `Result` and `cancel` closes with nothing, the payload is `Result` — not `Result | void`,
 * which no modal could accept, since `ActionsBinding` is covariant in the payload and
 * `useModal<Result>` asks for `ActionsBinding<Result>`. A set whose actions all close bare
 * lands on `never`, which is assignable to every modal.
 */
export type ActionPayload<TConfig> = Exclude<
  {
    [K in ActionKeys<TConfig> & keyof TConfig]: PayloadOf<TConfig[K]>;
  }[ActionKeys<TConfig> & keyof TConfig],
  void
>;

/**
 * Function provided to action handlers for closing the modal with the action's reason
 * (the config key). Accepts the payload the actions declare, if any.
 *
 * @example
 * actions.confirm(async (close) => {
 *   await api.confirm();
 *   close(); // closes with reason 'confirm'
 *   close(someData); // closes with reason 'confirm' + data
 * });
 */
export type ActionCloseFn<TData = never> = (data?: TData) => void;

/**
 * Props returned by a callable action, for spreading onto a button.
 *
 * The set is spreadable onto a bare `<button>` and onto a component library's button alike.
 * `loading` is the odd one out — React does not forward it to a DOM element, so it reaches a
 * component that declares it (MUI, Mantine and most others call it exactly that) and quietly
 * evaporates on a plain button. `data-loading` carries the same state as an attribute, which is
 * what a plain button needs: it is stylable (`button[data-loading='true'] { … }`) without
 * threading the flag through JSX by hand.
 */
export type ActionButtonProps = {
  /**
   * `'button'` unless the action opts into `'submit'`.
   *
   * Explicit because a `<button>` inside a `<form>` defaults to `type="submit"`, so an action
   * button in a form modal would submit the form *and* run its handler. The default here means
   * the spread is safe in a form without the caller having to know that.
   */
  type: 'button' | 'submit';
  /**
   * Click handler wrapped with action tracking. Receives the event, so a caller can compose
   * one that vetoes the action — see {@link ActionOptions}.
   *
   * A button component that forwards `onClick` to a real `<button>` types it with React's own
   * `MouseEventHandler` (or `ComponentProps<'button'>['onClick']`) and accepts this as-is,
   * because {@link ActionClickEvent} is a structural subset of a React mouse event. Only a
   * wrapper that declares `onClick: () => void` is rejected — and that wrapper is lying about
   * what it passes on.
   */
  onClick: (event: ActionClickEvent) => Promise<void>;
  /** True only when THIS action is running. For a button component that renders a spinner. */
  loading: boolean;
  /**
   * The same state as `loading`, as a DOM attribute — the form a plain `<button>` can use.
   * React writes it out as `"true"`/`"false"`, so CSS reaches it with `[data-loading='true']`.
   */
  'data-loading': boolean;
  /** True while any action runs — including this one, which is what stops a double click. */
  disabled: boolean;
  /** Announces the busy state to assistive technology while this action runs. */
  'aria-busy': boolean;
  /** ARIA keyboard shortcut label, set when the action was declared with a `hotkey` option */
  'aria-keyshortcuts'?: string | undefined;
};

/**
 * The part of a click event an action needs.
 *
 * Structural rather than `React.MouseEvent` so this module stays usable from a binding that is
 * not React — the shape is satisfied by a synthetic React event and by a DOM one alike.
 */
export type ActionClickEvent = {
  /** Read after your own `onClick` to see whether it vetoed the action. */
  readonly defaultPrevented: boolean;
  /** Call it to stop the action from running. */
  readonly preventDefault: () => void;
};

/**
 * What a callable action accepts, when the handler alone is not enough.
 *
 * The spread stays the binding pattern; this is how a caller adds to it without taking it
 * apart. Composition rules are fixed so that spreading can never quietly lose behaviour:
 *
 * - `disabled` is **or**-ed with the action's own reasons. It can add a reason (a form is
 *   invalid) but cannot remove one — nothing lets you click through a running action.
 * - `onClick` runs **before** the action and can cancel it with `preventDefault()`, the same
 *   protocol `useModal`'s `onKeyDown` already uses.
 *
 * @typeParam TData - The close payload this controller's actions declare.
 */
export type ActionOptions<TData = never> = {
  /** What the action does. Omit to auto-close the modal with the action's reason. */
  readonly onAction?: ((close: ActionCloseFn<TData>) => void | Promise<void>) | undefined;
  /** Runs first; call `preventDefault()` to stop the action from running. */
  readonly onClick?: ((event: ActionClickEvent) => void) | undefined;
  /** An extra reason to disable, or-ed with the action's own. */
  readonly disabled?: boolean | undefined;
  /** Opt the button back into submitting its form. Default `'button'`. */
  readonly type?: 'button' | 'submit' | undefined;
};

// ── Type Utilities ──────────────────────────────────────────────────────────

/**
 * The action key names in a `useModalActions` config — and, because the key *is* the close
 * reason, the exact set of reasons the modal can close with.
 */
export type ActionKeys<TConfig> = Extract<
  keyof {
    [K in keyof TConfig as TConfig[K] extends AnyActionMarker ? K : never]: true;
  },
  string
>;

/**
 * What one action key becomes: a function producing the props to spread onto a button.
 *
 * Named rather than written inline in {@link UseModalActionsReturn} because
 * `useModalActions` has to *build* one of these per key, and its return is assembled through a
 * `Record<string | symbol, unknown>` — the shape is asserted at the end, not checked. Stating
 * the signature once means the implementation annotates its callable with this type and the
 * compiler checks the two agree, instead of two identical-looking copies drifting behind a
 * cast. (Contravariance still lets a *widened* parameter through; a narrowed one or a changed
 * return is caught.)
 *
 * @typeParam TData - The close payload this action set declares, from `ActionPayload`.
 */
export type ActionCallable<TData = never> = (
  handlerOrOptions?: ((close: ActionCloseFn<TData>) => void | Promise<void>) | ActionOptions<TData>
) => ActionButtonProps;

/**
 * Return type of `useModalActions`.
 *
 * - Each declared action key becomes an {@link ActionCallable}, returning `ActionButtonProps`
 *   to spread onto a button: `{...actions.confirm(handler)}`. The handler is
 *   optional — omit it to auto-close the modal with the action's reason — and can be
 *   replaced by an {@link ActionOptions} object to add a `disabled` reason, compose an
 *   `onClick`, or opt into `type: 'submit'`.
 * - Combined action state: `isRunning`, `error`.
 * - The `useModal` bridge rides under a hidden symbol, off the string-key surface.
 */
export type UseModalActionsReturn<TConfig extends Record<string, unknown>> = {
  readonly [K in keyof TConfig as TConfig[K] extends AnyActionMarker ? K : never]: ActionCallable<
    ActionPayload<TConfig>
  >;
} & {
  /** True if any action is currently running */
  readonly isRunning: boolean;
  /** The last error from any action, or null */
  readonly error: Error | null;
} & ActionsBinding<ActionPayload<TConfig>>;

// ── Internal Types ──────────────────────────────────────────────────────────

export type ActionState = { isRunning: boolean; error: Error | null };
