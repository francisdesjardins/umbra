/**
 * The order the shared lifecycle is wired in, as data.
 *
 * **This is the director's specification, written before the director.** Every framework-free
 * piece of this library is a decision the core owns — `canDismiss`, `orderStack`,
 * `chooseActionRunner` — and each is named, documented and tested. The *sequence* those decisions
 * are asked in was the one that was not: it existed only as the order of statements in three
 * binding files, and a sequence nobody named is a sequence nobody can test.
 *
 * It is data rather than an executor because the executor is the part with the risk. React wires
 * these across twelve `useEffect`s with distinct dependency arrays and Solid across seven
 * `createEffect`s; collapsing them into one call would change *how often each re-attaches*, which
 * is a behaviour change wearing a refactor's clothes. The order can be shared today. The
 * scheduling cannot, yet.
 *
 * **What is established.** Both divergences that existed were tested by moving the step and
 * running three engines, and neither changed a result. Neither is observable in principle either:
 * every step here runs inside a single synchronous flush — React's effects and Solid's
 * `createEffect`s both run in declaration order within one task — so no event can be dispatched
 * between two of them and no user can tell which went first. That is the licence to share the
 * order; it is not a licence to share the scheduling.
 *
 * **What this does not cover.** Steps that run during render rather than from an effect —
 * `setDialogAttributes` and `getDialogAnimationStyles` — are deliberately absent. Their position
 * is not comparable across bindings: React calls `getDialogAnimationStyles` in its render body, so
 * it runs before every effect while appearing last in the file. A sequence that mixed the two
 * would be comparing a commit against a paint.
 *
 * `umbra/vanilla` deliberately does **not** follow this list; see `wiring-order.test.ts`, which
 * holds the hook pair to it and records the controller's order instead. The controller is a
 * different kind of binding with no mirror to keep, and bringing it in line is a decision to make
 * on purpose rather than a tidy-up.
 *
 * @internal Not part of the public API. The list is a contract between the bindings and the gate
 *   that checks them, not something a consumer can act on.
 */
export const MODAL_LIFECYCLE_SEQUENCE = [
  /** Advance the native lifecycle — the `showModal()` / `show()` that puts the dialog on screen. */
  'syncOpenSequence',
  /** Report an unresolvable `aria-labelledby`, or a dialog with no accessible name at all. */
  'syncLabellingDiagnostics',
  /** Arm the exit: the `transitionend` the close waits on, and the finalisation behind it. */
  'syncCloseSequence',
  /** Hotkeys and the dismiss key, scoped to this dialog's own subtree. */
  'attachDialogKeydown',
  /** The platform's own cancel, which Escape raises before any listener of ours sees it. */
  'attachDialogCancel',
  /** The dismiss key for a non-modal dialog, which the window has to answer for. */
  'attachWindowDismissKey',
  /**
   * Settle the opening focus, and restore it when an action lands.
   *
   * Ahead of the two below because it decides *where focus belongs*, and they only guard it once
   * it is there. Nothing can observe the difference — it is one flush — but the reading order is
   * the argument for the writing order.
   */
  'focus.sync',
  /** The Tab wrap a `<dialog>` does not get from `show()`, opt-in through `containFocus`. */
  'attachFocusContainment',
  /** Dismissal by a click that landed outside, once the four-step gate agrees. */
  'attachClickOutside',
] as const;

/** One step of the shared lifecycle, in the order {@link MODAL_LIFECYCLE_SEQUENCE} declares. */
export type ModalLifecycleStep = (typeof MODAL_LIFECYCLE_SEQUENCE)[number];
