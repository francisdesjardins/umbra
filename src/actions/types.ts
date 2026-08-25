import type { DismissReason } from '../core/dismiss-reason.js';
import type { KeyValue } from '../utils/keys.js';

/**
 * What an action may be *named*: every declared reason except the reserved `'dismiss'`
 * ({@link DismissReason}), which the library raises itself and never runs an action for — excluded
 * by type, since declaring it in your own union is legitimate and `onClose` sees it.
 * `Exclude<string, 'dismiss'>` is `string`, so the `TReason = string` default is untouched and the
 * engine warns at declaration there instead.
 */
export type ActionReason<TReason extends string> = Exclude<TReason, DismissReason>;

// ── Hotkey ───────────────────────────────────────────────────────────────────

/**
 * A hotkey as one string — any `KeyValue` with up to three of Ctrl/Alt/Shift/Meta: `Key.Enter`,
 * `"Ctrl+Enter"`, `"Shift+Tab"`, `"Ctrl+Shift+S"`, `"Alt+F4"`. **Letter case is not
 * significant**: whether Shift is held is decided by the modifier list alone, so `'Shift+s'` and
 * `'Shift+S'` are one hotkey and CapsLock cannot change which fires.
 */
export type HotkeyDef =
  | KeyValue
  | `Ctrl+${KeyValue}`
  | `Alt+${KeyValue}`
  | `Shift+${KeyValue}`
  | `Meta+${KeyValue}`
  | `Ctrl+Shift+${KeyValue}`
  | `Ctrl+Alt+${KeyValue}`
  | `Ctrl+Meta+${KeyValue}`
  | `Alt+Shift+${KeyValue}`
  | `Alt+Meta+${KeyValue}`
  | `Shift+Meta+${KeyValue}`
  | `Ctrl+Alt+Shift+${KeyValue}`
  | `Ctrl+Alt+Meta+${KeyValue}`
  | `Ctrl+Shift+Meta+${KeyValue}`;

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Closes the dialog with its action's reason, taking the dialog's declared payload if it has one.
 *
 * @example
 * action('confirm', async (close) => {
 *   await api.confirm();
 *   close(); // closes with reason 'confirm'
 * });
 */
export type ActionCloseFn<TData = never> = (data?: TData) => void;

/**
 * The part of a click event an action needs — structural rather than `React.MouseEvent`, so a DOM
 * event and a synthetic React one both satisfy it and a non-React binding can use this module.
 */
export type ActionClickEvent = {
  /** Read after your own `onClick` to see whether it vetoed the action. */
  readonly defaultPrevented: boolean;
  /** Call it to stop the action from running. */
  readonly preventDefault: () => void;
};

/**
 * Props returned by an action, for spreading onto a button. **Every field is a DOM prop, and that
 * is the whole rule**: a core agnostic of the UI put into it cannot ship a prop named for one
 * family of component libraries, so this set spreads onto a bare `<button>`, a library's, or your
 * own without guessing what they are called.
 */
export type ActionButtonProps = {
  /**
   * `'button'` unless the action opts into `'submit'` — explicit because a `<button>` inside a
   * `<form>` defaults to submitting, so the spread is safe in a form without the caller knowing.
   */
  type: 'button' | 'submit';
  /**
   * Click handler wrapped with action tracking; receives the event so a caller can veto the action
   * — see {@link ActionOptions}. {@link ActionClickEvent} is a structural subset of a React mouse
   * event, so only a wrapper declaring `onClick: () => void` is rejected, and it is lying.
   */
  onClick: (event: ActionClickEvent) => Promise<void>;
  /**
   * True only when THIS action is running, as a DOM attribute — the only form a UI-agnostic library
   * can honestly ship, MUI and Mantine calling the busy flag `loading` where others say `busy` or
   * `pending` and a headless one has none. CSS reaches it with `[data-loading='true']`; a wrapper
   * maps it to its own (`<MuiButton loading={props['data-loading']} />`). Contrast `disabled`, true
   * while *any* action runs.
   */
  'data-loading': boolean;
  /** True while any action runs — including this one, which is what stops a double click. */
  disabled: boolean;
  /** Announces the busy state to assistive technology while this action runs. */
  'aria-busy': boolean;
  /** ARIA keyboard shortcut label, set when the action declared a `hotkey`. */
  'aria-keyshortcuts'?: string | undefined;
  /** The dialog's opening focus, set when the action declared `focusOnOpen` — see its doc. */
  'data-focus-on-open'?: true | undefined;
  /**
   * The action's reason, so its button can be **found again** rather than remembered.
   *
   * The focus restore after an action needs the button that ran it, and a remembered element is not
   * that button on a renderer that replaces the node when the action's state changes — every
   * captured candidate answers `isConnected === false`, which drops the restore to the dialog. The
   * reason outlives the node, so the coordinator re-queries by this instead. A custom button wrapper
   * **must forward it**, the rule `aria-keyshortcuts` and `data-focus-on-open` also carry.
   */
  'data-action-reason': string;
};

/**
 * What an action accepts when a bare handler is not enough: `disabled` is **or**-ed with the
 * action's own reasons (it may add one, such as an invalid form, but never remove one), and
 * `onClick` runs **before** the action and can cancel it with `preventDefault()` — the protocol
 * `useDialog`'s `onKeyDown` uses. Fixed, so that spreading cannot quietly lose behaviour.
 *
 * @typeParam TData - The dialog's close payload.
 */
export type ActionOptions<TData = never> = {
  /** What the action does. Omit to auto-close the dialog with the action's reason. */
  readonly onAction?: ((close: ActionCloseFn<TData>) => void | Promise<void>) | undefined;
  /** Runs first; call `preventDefault()` to stop the action from running. */
  readonly onClick?: ((event: ActionClickEvent) => void) | undefined;
  /** An extra reason to disable, or-ed with the action's own. */
  readonly disabled?: boolean | undefined;
  /** Opt the button back into submitting its form. Default `'button'`. */
  readonly type?: 'button' | 'submit' | undefined;
  /**
   * Keyboard shortcut, dispatched by finding the button whose `aria-keyshortcuts` matches — so it
   * runs exactly the path a click does. A collision with the dialog's `dismissKey` defers dismissal.
   */
  readonly hotkey?: HotkeyDef | undefined;
  /**
   * Take the dialog's opening focus instead of the first focusable element in it: `showModal()`
   * focuses a form's first input, rarely what a confirmation dialog wants and never what a
   * destructive one does, so mark the starting point and `Enter` acts on the choice you meant.
   *
   * Focus after a *failed* action belongs to the button that was pressed; this is the fallback for
   * when nothing inside the dialog held it. Two buttons declaring it is a contradiction the DOM
   * cannot express — the first rendered wins. Carried as `data-focus-on-open`, applied once the
   * dialog is open, because React never emits native `autofocus`; a custom wrapper must forward it
   * like `aria-keyshortcuts`.
   */
  readonly focusOnOpen?: boolean | undefined;
};

/**
 * Declares an action and returns the props to spread onto its button, at the single place the
 * action is used: nothing is passed into `useDialog`, an action existing because it is rendered, and
 * `reason` **is** its identity — the name and the close reason both, so nothing drifts.
 *
 * @typeParam TData - The dialog's close payload, so `close(data)` is as typed as the dialog.
 * @typeParam TReason - The declared reasons; at the `string` default any is accepted, so declare a
 *   union on `useDialog` for autocomplete and an exhaustive `switch` in `onClose`.
 *
 * @example
 * render: ({ action }) => {
 *   return (
 *     <>
 *       <button {...action('cancel')}>Cancel</button>
 *       <button
 *         {...action('confirm', async (close) => {
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
    reason: ActionReason<TReason>,
    handlerOrOptions?:
      ((close: ActionCloseFn<TData>) => void | Promise<void>) | ActionOptions<TData>
  ): ActionButtonProps;
  /**
   * Whether **that** action is running — the per-action question, asked away from its button.
   * `data-loading` is the same fact *on* the button and reaches only whoever spreads the props;
   * this reaches everything else — a header spinner, a field disabled for one action, a label that
   * changes for `'save'` but not `'cancel'`. Asking never declares; only calling does.
   *
   * @example
   * render: ({ action }) => {
   *   return (
   *     <header>
   *       <button {...action('save', save)}>Save</button>
   *       {action.isRunning('save') ? <Spinner /> : null}
   *     </header>
   *   );
   * };
   */
  // A property holding a closure, not a method: it never touches `this`, so it survives being
  // detached — which `umbra/vanilla` does, handing it straight to the controller.
  readonly isRunning: (reason: ActionReason<TReason>) => boolean;
};

// ── Internal ────────────────────────────────────────────────────────────────

/**
 * Per-action state. `isRunning` is **this** action's — the object it hangs on says so — while the
 * dialog-wide aggregate is `hasRunningAction`, a bare flag having to name its own scope.
 */
export type ActionState = { isRunning: boolean; error: Error | null };
