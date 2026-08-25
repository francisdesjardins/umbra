/**
 * Who sits in front of whom, decided by a policy instead of by who opened last: `orderStack`
 * answers *what the order should be*, {@link planRaises} *what has to move to get there*. The
 * platform paints top-layer elements in the order they were added and `z-index` does not apply
 * between them (measured: a dialog at `z-index: 9999` still paints under one added after it), so
 * lifting one means closing and re-showing it — every plan entry is a real DOM round-trip, hence a
 * minimal plan. The DOM half is `raiseDialog` in `core/dialog-lifecycle.ts`; the wiring is
 * `dialog-manager.ts`.
 */

import type { RegisteredDialogInfo } from './types.js';

/**
 * What a stack policy is told about a dialog: what it **is**, not what it is doing. The three
 * fields {@link RegisteredDialogInfo} has and this does not are the design — `isForeground` is what
 * the policy decides, and a priority keyed on `phase`/`isPreparing` would restack the top layer
 * under the user's hands.
 */
export type StackDialog = Pick<RegisteredDialogInfo, 'id' | 'template' | 'nonModal'>;

/**
 * How far to the front a dialog belongs. Higher is nearer the user; ties keep open order, so a
 * policy only says where it disagrees, and it ranks a dialog **among its own family** — see
 * `orderStack`. Called on every open dialog whenever the stack changes, so it must be cheap
 * and must not depend on anything that moves: {@link StackDialog} is what it may read, and
 * `DialogManager.prioritize` has the whole story.
 *
 * @example
 * // The session warning outranks whatever a deep link raised.
 * dialogManager.prioritize((dialog) => {
 *   return dialog.template === 'alert' ? 100 : 0;
 * });
 */
export type StackPriority = (dialog: StackDialog) => number;

/** What `orderStack` needs of a candidate: the policy's input, plus the open order. */
export type StackCandidate = StackDialog & {
  /** The manager's monotonic open counter — the tiebreak, and the whole order with no policy. */
  readonly openSequence: number;
};

/**
 * Ask the policy once per dialog, and never let its answer break the sort: it is user code on the
 * path that recomputes the manager's snapshot, so a throw would take out an innocent dialog's
 * bookkeeping, and a `NaN` rank makes the comparator sort arbitrarily. Both fall back to `0` — no
 * opinion, the dialog keeping its open-order place.
 */
function rankOf(candidate: StackCandidate, priority: StackPriority): number {
  let rank: number;
  try {
    rank = priority({
      id: candidate.id,
      template: candidate.template,
      nonModal: candidate.nonModal,
    });
  } catch {
    return 0;
  }
  return Number.isFinite(rank) ? rank : 0;
}

/**
 * Order open dialogs bottom-first — by modality, then by priority, then by the order they opened.
 *
 * **Modality is the primary key and it is not a preference**: every non-modal dialog sorts under
 * every modal one before the policy is consulted, because the platform paints every top-layer
 * dialog above every ordinary one, so an order claiming otherwise would be false rather than
 * opinionated. Out of the policy's reach is what makes `prioritize`'s rule enforceable and stops
 * {@link planRaises} planning a lift the top layer would refuse.
 *
 * Generic in the candidate so the manager hands its own records through, reading only the three
 * policy fields and `openSequence`. With no policy every rank is equal, which makes `prioritize`
 * opt-in — not a no-op, since the modality key applies either way.
 */
export function orderStack<T extends StackCandidate>(
  candidates: readonly T[],
  priority: StackPriority | undefined
): T[] {
  // Ranked once, up front: a comparator calling the policy would call it O(n log n) times, and a
  // policy is allowed to be a lookup rather than arithmetic.
  const ranked = candidates.map((candidate) => {
    return { candidate, rank: priority ? rankOf(candidate, priority) : 0 };
  });

  return ranked
    .toSorted((a, b) => {
      // Modality first, and it is not a policy — see this function's doc. A non-modal dialog opened
      // last is still *behind* a modal one, whatever the open counter says.
      if (a.candidate.nonModal !== b.candidate.nonModal) {
        return a.candidate.nonModal ? -1 : 1;
      }
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return a.candidate.openSequence - b.candidate.openSequence;
    })
    .map(({ candidate }) => {
      return candidate;
    });
}

/**
 * Which dialogs have to re-enter the top layer, bottom-first, for `current` to read as `desired`.
 *
 * Re-showing always puts a dialog in front and nothing can push one back, so the cheapest plan keeps
 * the longest **prefix of `desired` that is a subsequence of `current`** and lifts the rest — not
 * their common prefix, and the difference is one whole DOM round-trip: turning `[a, b]` into
 * `[b, a]` needs only `a` lifted, since no amount of re-showing could make `b` lower. Both arrays
 * are top-layer members only, so a non-modal dialog — ordered by `z-index` — never appears here.
 */
export function planRaises(desired: readonly string[], current: readonly string[]): string[] {
  let kept = 0;
  let from = 0;
  for (const id of desired) {
    const found = current.indexOf(id, from);
    if (found === -1) {
      break;
    }
    from = found + 1;
    kept += 1;
  }
  return desired.slice(kept);
}
