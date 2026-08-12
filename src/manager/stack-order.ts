/**
 * Who sits in front of whom, decided by a policy instead of by who opened last.
 *
 * Two pure functions and a type. The first answers *what the order should be*, the second answers
 * *what has to move to get there* — and the second exists because moving a `<dialog>` inside the
 * top layer is not free: the platform paints top-layer elements in the order they were added and
 * `z-index` does not apply between them (measured: a dialog at `z-index: 9999` still paints under
 * one added after it), so the only way to lift one is to close and re-show it. Every entry in the
 * plan therefore costs a real DOM round-trip, which is why the plan is minimal rather than "re-show
 * everything from the bottom up".
 *
 * The DOM half is `raiseDialog` in `core/dialog-lifecycle.ts`; the wiring is `dialog-manager.ts`.
 */

import type { RegisteredModalInfo } from './types.js';

/**
 * What a stack policy is told about a dialog: what it **is**, not what it is doing.
 *
 * Derived from {@link RegisteredModalInfo} rather than restated, and the three fields it does *not*
 * carry are the design. `isForeground` is what the policy decides, so feeding it back in would be
 * circular. `phase` and `isPreparing` change while a dialog is on screen, and a priority that moved
 * with them would restack the top layer under the user's hands — a modal that finished loading
 * would change places. A policy keys on identity: the id, the template that built it, and whether
 * it is modal at all.
 */
export type StackModal = Pick<RegisteredModalInfo, 'id' | 'template' | 'nonModal'>;

/**
 * How far to the front a dialog belongs. Higher is nearer the user; ties keep the order the opens
 * arrived in, so a policy only has to say where it disagrees with that.
 *
 * It ranks a dialog **among its own family**: every non-modal dialog is under every modal one
 * before this is consulted, because that is the platform's rule about the top layer rather than
 * something a policy may answer. A big number on a panel orders it against the other panels.
 *
 * Called on every open dialog whenever the stack changes, so it must be cheap and must not depend
 * on anything that moves — see {@link StackModal} for what it is allowed to read, and
 * `DialogManager.prioritize` for the whole story.
 *
 * @example
 * // The session warning outranks whatever a deep link raised.
 * dialogManager.prioritize((modal) => {
 *   return modal.template === 'alert' ? 100 : 0;
 * });
 */
export type StackPriority = (modal: StackModal) => number;

/** What {@link orderStack} needs of a candidate: the policy's input, plus the open order. */
export type StackCandidate = StackModal & {
  /** The manager's monotonic open counter — the tiebreak, and the whole order with no policy. */
  readonly openSequence: number;
};

/**
 * Ask the policy once per dialog, and never let its answer break the sort.
 *
 * A policy is user code on the path that recomputes the manager's snapshot — every store
 * transition of every dialog — so a throw here would take out the registry's bookkeeping for a
 * dialog that has nothing wrong with it. `NaN` is the quieter version of the same accident (a
 * lookup that missed, an `undefined` in the arithmetic): a comparator that returns `NaN` sorts
 * arbitrarily, so the whole stack order would become unstable from one bad answer. Both fall back
 * to `0`, which is "no opinion" — the dialog keeps its open-order place.
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
 * Order open dialogs bottom-first — by priority, then by the order they opened.
 *
 * Generic in the candidate so the manager can hand its own records through and get them back
 * ordered; only the three policy fields and `openSequence` are read. With no policy this is exactly
 * the sort the manager has always done, which is what makes `prioritize` opt-in rather than a new
 * default.
 */
export function orderStack<T extends StackCandidate>(
  candidates: readonly T[],
  priority: StackPriority | undefined
): T[] {
  // Ranked once, up front: a comparator calling the policy would call it O(n log n) times, and a
  // policy is allowed to be a lookup rather than arithmetic. With no policy every rank is the same
  // and the sort falls through to open order, which is what makes `prioritize` opt-in.
  const ranked = candidates.map((candidate) => {
    return { candidate, rank: priority ? rankOf(candidate, priority) : 0 };
  });

  return ranked
    .toSorted((a, b) => {
      // Modality first, and it is not a policy: the platform paints every top-layer dialog above
      // every ordinary one, and no `z-index` reaches between them. So a non-modal dialog opened
      // last is *behind* a modal one, whatever the open counter says — and an order that claimed
      // otherwise would not be an opinion, it would be false. Measured in a real application: an
      // interruption raised over a side panel was reported as the foreground while Escape went to
      // the panel, because the panel had opened half a second later.
      //
      // Keeping it out of the policy's reach is what makes the rule `prioritize` documents
      // enforceable rather than advisory, and it is what stops `planRaises` from planning a lift
      // across the boundary that the top layer would refuse to perform.
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
 * Re-showing a dialog always puts it in front, and nothing can push one back — so the dialogs that
 * are *not* re-shown keep their relative order and end up underneath every dialog that is. The
 * cheapest plan therefore keeps the longest run that already reads as the start of `desired` and
 * lifts the rest.
 *
 * That run is the longest **prefix of `desired` that is a subsequence of `current`** — not their
 * common prefix, and the difference is one whole DOM round-trip: turning `[a, b]` into `[b, a]`
 * needs `a` lifted and nothing else, because `b` is already the lowest and no amount of re-showing
 * could make it lower.
 *
 * Both arrays are top-layer members only. A non-modal dialog is not in the top layer, so it is
 * ordered by `z-index` and never appears here.
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
