import type { KeyValue } from '../utils/keys.js';

// ── Hotkey ───────────────────────────────────────────────────────────────────

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

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Function handed to an action's handler for closing the modal with that action's reason.
 * Accepts the modal's declared payload, if it has one.
 *
 * @example
 * action('confirm', async (close) => {
 *   await api.confirm();
 *   close(); // closes with reason 'confirm'
 * });
 */
export type ActionCloseFn<TData = never> = (data?: TData) => void;

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
 * Props returned by an action, for spreading onto a button.
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
  /** ARIA keyboard shortcut label, set when the action declared a `hotkey`. */
  'aria-keyshortcuts'?: string | undefined;
  /**
   * Marks this button as the modal's opening focus, set when the action declared
   * `focusOnOpen`. A data attribute rather than `autoFocus` because React does not put the
   * native `autofocus` attribute in the DOM, and `showModal()`'s focusing steps read exactly
   * that attribute — so the modal applies it itself once the dialog is open.
   */
  'data-focus-on-open'?: true | undefined;
};

/**
 * What an action accepts when a bare handler is not enough.
 *
 * The spread stays the binding pattern; this is how a caller adds to it without taking it
 * apart. Composition rules are fixed so that spreading can never quietly lose behaviour:
 *
 * - `disabled` is **or**-ed with the action's own reasons. It can add a reason (a form is
 *   invalid) but cannot remove one — nothing lets you click through a running action.
 * - `onClick` runs **before** the action and can cancel it with `preventDefault()`, the same
 *   protocol `useModal`'s `onKeyDown` already uses.
 *
 * @typeParam TData - The modal's close payload.
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
  /**
   * Keyboard shortcut that triggers this action. Wired automatically: the modal dispatches it
   * by finding the button whose `aria-keyshortcuts` matches, so the hotkey runs exactly the
   * path a real click does. If it collides with the modal's `dismissKey`, dismissal defers.
   */
  readonly hotkey?: HotkeyDef | undefined;
  /**
   * Take the modal's opening focus, instead of the first focusable element in it.
   *
   * `showModal()` focuses the first thing it can find, which for a form is its first input —
   * rarely what a confirmation dialog wants, and never what a destructive one wants. Mark the
   * button that should be the starting point (`Cancel` on a delete, `Confirm` on an
   * acknowledgement) and the modal opens with focus there, so `Enter` acts on the choice you
   * meant to offer.
   *
   * This decides where the modal *opens*. Where focus returns after a failed action is a
   * separate question, answered by whoever ran it: the retry is under the hand of the button
   * that was pressed, which is not necessarily this one. This is the fallback for when nothing
   * inside the dialog held focus — an action run from the pointer, for instance.
   *
   * Two buttons declaring it is a contradiction the DOM cannot express — the first one rendered
   * wins. React does not emit the native `autofocus` attribute, so this is carried as
   * `data-focus-on-open` and applied once the dialog is actually open; a custom button wrapper
   * has to forward it, exactly like `aria-keyshortcuts`.
   */
  readonly focusOnOpen?: boolean | undefined;
};

/**
 * Declares an action and returns the props to spread onto its button — one expression, at the
 * single place the action is used.
 *
 * There is no separate declaration step and nothing to pass into `useModal`: an action exists
 * because it is rendered. The `reason` argument **is** the action's identity — it names the
 * action and it is the reason the modal closes with, so there is nothing to keep in sync.
 *
 * @typeParam TData - The modal's close payload, so `close(data)` is as typed as the modal.
 * @typeParam TReason - The reasons the modal declares. Left at `string`, any reason is
 *   accepted; declare a union on `useModal` to get autocomplete, rejection of a mistyped
 *   reason, and an exhaustive `switch` on `result.reason` in `onClose`.
 *
 * @example
 * render: ({ action }) => {
 *   return (
 *     <>
 *       <button {...action.dom('cancel')}>Cancel</button>
 *       <button
 *         {...action.dom('confirm', async (close) => {
 *           await api.confirm();
 *           close();
 *         })}
 *       >
 *         Confirm
 *       </button>
 *     </>
 *   );
 * };
 */
export type ActionFactory<TData = never, TReason extends string = string> = {
  (
    reason: TReason | 'dismiss',
    handlerOrOptions?:
      ((close: ActionCloseFn<TData>) => void | Promise<void>) | ActionOptions<TData>
  ): ActionButtonProps;
  /**
   * The same action, minus the one prop a DOM element cannot take.
   *
   * `loading` is for a button *component* that declares it — MUI, Mantine — and React drops it
   * on a real `<button>` with a warning. Both directions matter and only one is loud: leaving it
   * in the default spread costs a console warning on a bare button, taking it out would silently
   * cost the spinner on every component one. So the default keeps it and this is the door for
   * markup you write yourself. `data-loading` carries the same state either way.
   *
   * @example
   * // A bare button, with the hotkey and the opening focus still wired.
   * <button {...action.dom('ok', { hotkey: Key.Enter, focusOnOpen: true })}>OK</button>;
   */
  dom(
    reason: TReason | 'dismiss',
    handlerOrOptions?:
      ((close: ActionCloseFn<TData>) => void | Promise<void>) | ActionOptions<TData>
  ): DomActionButtonProps;
};

/**
 * {@link ActionButtonProps} narrowed to what a DOM element accepts — every field but `loading`.
 *
 * Derived, so a prop added to the action's props reaches this one too and there is no second
 * list to keep in step.
 */
export type DomActionButtonProps = Omit<ActionButtonProps, 'loading'>;

// ── Internal ────────────────────────────────────────────────────────────────

/** Per-action state, tracked by the engine. */
export type ActionState = { isRunning: boolean; error: Error | null };
