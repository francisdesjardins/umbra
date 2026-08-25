/**
 * `'dismiss'` — the library's own close reason, in one place so it cannot drift.
 *
 * It means **the dialog was dismissed rather than acted on**: the dismiss key, a backdrop click, a
 * click outside a non-modal panel, or teardown while it was still open. None of them runs an
 * action, because there is no action to run — the first three close the store directly unless the
 * caller asked to answer for them ({@link DismissCause}), and teardown asks nobody.
 *
 * That is why it is *reserved*. An action's reason is its identity, and a button named `'dismiss'`
 * would produce a close indistinguishable from the four above while behaving differently — the
 * button would run a handler and the dismiss key, which consults the engine by hotkey and never by
 * name, would not. One reason, two doors, and `onClose` unable to tell them apart. So the action
 * factory's `ActionReason` excludes it: name that button `'cancel'` or `'close'`, and `'dismiss'`
 * keeps meaning exactly one thing.
 *
 * **The exclusion reaches as far as the declared union does, and no further.** `ActionReason` is
 * an `Exclude`, and `Exclude<string, 'dismiss'>` is `string` — so a dialog that left `TReason` at
 * its default is told nothing by the checker, which is why the engine warns at declaration too.
 * Belt and braces, and the braces are the only thing holding for the call site that skipped the
 * one rule the design asks for.
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

/**
 * Which door a user-initiated dismissal came through, handed to `onDismissRequest` so that an
 * owner answering for all of them can tell them apart.
 *
 * The names are the options' own words — `dismissKey`, `dismissOnBackdropClick`,
 * `dismissOnClickOutside` — because a cause a caller cannot map back to the option that produced
 * it is a string they have to look up.
 *
 * **Three, not the four doors above.** Teardown while open closes the store directly and asks
 * nobody: the surface that would have answered is the one going away, so a request it could not
 * act on would be a call with no correct response.
 */
export type DismissCause = 'dismiss-key' | 'backdrop-click' | 'click-outside';
