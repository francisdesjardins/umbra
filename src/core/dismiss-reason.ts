/**
 * `'dismiss'` — the library's own close reason, in one place so it cannot drift.
 *
 * It means **the modal was dismissed rather than acted on**: the dismiss key, a backdrop click, a
 * click outside a non-modal panel, or teardown while it was still open. Every one of those closes
 * the store directly; none of them runs an action, because there is no action to run.
 *
 * That is why it is *reserved*. An action's reason is its identity, and a button named `'dismiss'`
 * would produce a close indistinguishable from the four above while behaving differently — the
 * button would run a handler and the dismiss key, which consults the engine by hotkey and never by
 * name, would not. One reason, two doors, and `onClose` unable to tell them apart. So the action
 * factory's `ActionReason` excludes it: name that button `'cancel'` or `'close'`, and `'dismiss'`
 * keeps meaning exactly one thing.
 *
 * It is excluded from an action's *name*, not from a close. `handle.close('dismiss')` stays legal
 * and is the right call for a control whose whole meaning is "I did not act on this" — a toast's
 * ✕. What it is not is an action: no hotkey, no running state, nothing to disable.
 *
 * **Both halves earn their place.** The type is what makes a change here impossible to ignore:
 * every producer takes `TReason | DismissReason`, so an edit to this line stops the whole library
 * compiling rather than leaving one path spelling it the old way. The constant covers what the
 * type cannot — the manager's DOM event details type `reason` as a plain `string`, where a
 * literal would sit unchecked.
 */
export const DISMISS_REASON = 'dismiss';

/** The type of {@link DISMISS_REASON} — see there for why this is one word in one file. */
export type DismissReason = typeof DISMISS_REASON;
