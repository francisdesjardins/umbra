/**
 * Who a settled action hands focus back to — the two decisions behind the restore, and no DOM.
 *
 * Beside `dismiss-gate.ts` and for its reason: a predicate every caller of a DOM operation shares,
 * kept where it can be asked without one. Both are generic over `{ isConnected }` because that
 * member is the whole of what they read, which is what makes the ordering a unit test rather than a
 * browser one — and the ordering is the part that fails silently, since a truthy-but-wrong candidate
 * looks exactly like a correct answer. The functions that *act* on the answer are
 * `core/focus-policy.ts`.
 */

/**
 * The target a settled action should return focus to: whoever ran it, or the opening focus as
 * the floor. A runner that has left the DOM (its button re-rendered away) is not a target.
 *
 * @internal
 */
export function preferredRestoreTarget<T extends { isConnected: boolean }>(
  runner: T | null,
  openingFocus: T | null
): T | null {
  return runner?.isConnected === true ? runner : openingFocus;
}

/**
 * Who ran the action, chosen from the candidates in order of how specific each answer is.
 *
 * The ordering is the policy, hence a named function rather than a `??` chain: a truthy-but-wrong
 * candidate silently disables every fallback behind it, and only a disagreeing engine surfaces
 * that (WebKit does not focus a clicked `<button>`). Callers pass who holds focus, who was last
 * activated, who held it last; a disconnected candidate is skipped at every position, since
 * checking only the winner drops past a live one sitting behind a dead one.
 *
 * @internal
 */
export function chooseActionRunner<T extends { isConnected: boolean }>(
  ...candidates: readonly (T | null | undefined)[]
): T | null {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && candidate.isConnected) {
      return candidate;
    }
  }
  return null;
}

/**
 * Whether the close left focus where the restore put it, and so is the restore's to redirect.
 *
 * Three shapes, because the variants and the engines land differently: a non-modal close **strands**
 * the keyboard, the close-the-dialog steps hand a modal one back to the element `showDialog`
 * captured, and WebKit focuses the `<dialog>` on a click inside it — so focus can still sit **within
 * the dialog that is going away**, which is nowhere once it is `display: none`.
 *
 * Anywhere else is the reader's own, and taking it would be theft rather than repair.
 *
 * @internal
 */
export function restoreOwnsTheFocus<T>(landed: {
  readonly active: T | null;
  readonly insideDialog: boolean;
  readonly opener: T | undefined;
  readonly body: T;
  readonly documentElement: T;
}): boolean {
  const { active, insideDialog, opener, body, documentElement } = landed;
  return (
    active === null ||
    insideDialog ||
    active === body ||
    active === documentElement ||
    active === opener
  );
}
