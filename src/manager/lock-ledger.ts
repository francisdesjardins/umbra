/**
 * Who currently wants a global lock held, and whether this call is the one that turns it.
 *
 * A lock whose target is global — `document.body` is one body however many dialog managers a page
 * builds — cannot be a shared boolean. Each manager releases whenever it observes a transition and
 * finds nothing of its own open, so with last-writer-wins one of them releasing drops a lock
 * another is still holding: a page with a provider-scoped manager beside the singleton scrolls
 * behind a modal that is still on screen.
 *
 * So a lock is claimed per owner and let go only when the last claim goes. Claims are idempotent,
 * which is the same rule read from the other side: stacked modals within one manager claim once,
 * and a lock that compensated the layout twice would shift the page it exists to hold still.
 *
 * **The two booleans are what makes this a decision rather than a `Set`.** A caller handed the set
 * has to restate the transition rule to read an answer out of it, and a rule restated at the call
 * site is a rule the next call site gets slightly wrong. So the ledger answers the only question a
 * caller actually has — *is this call the edge?* — and the DOM work sits behind that `if`.
 */

/**
 * Nominal marker for {@link LockOwner}. Never read at runtime and never assigned — its only job is
 * to stop the type meaning "any object".
 */
declare const LOCK_OWNER: unique symbol;

/**
 * Whoever holds a claim: an **identity**, not a value.
 *
 * Every comparison downstream is by reference — the ledger is a `Set` and nothing ever reads a
 * field off an owner — so the requirement is only "a thing that is equal to itself and to nothing
 * else". Spelling that as the bare `object` keyword says something else: it reads as *any*
 * non-primitive, which invites handing over a domain object that happens to be in scope and makes
 * the lock's identity accidental rather than declared.
 *
 * Branded, so an owner is something you **mint** rather than something you find. A stray
 * `{ id: 1 }`, a function, a string, a number are all rejected; what survives is a token from
 * {@link createLockOwner}.
 *
 * `WeakKey` was the other candidate and is wrong here for a reason worth recording: it resolves to
 * `object | symbol`, and its name promises weak retention while the ledger below holds owners in a
 * **strong** `Set` — which it must, because it reads `size`.
 */
export type LockOwner = { readonly [LOCK_OWNER]?: never };

/**
 * Mint an owner.
 *
 * An empty object is the whole implementation: the token carries no data because none is ever read,
 * only compared. What it carries is the type.
 */
export function createLockOwner(): LockOwner {
  return {};
}

/** A ledger of claims on one lock. */
export type LockLedger = {
  /**
   * Register `owner`'s interest.
   *
   * @returns whether the lock has to be applied now: `false` for a repeat claim, and `false` while
   *   somebody else is already holding it.
   */
  readonly claim: (owner: LockOwner) => boolean;
  /**
   * Drop `owner`'s interest.
   *
   * @returns whether the lock has to be released now: `false` for an owner that never claimed —
   *   the teardown of a binding that unmounted before it ever opened — and `false` while another
   *   claim is outstanding.
   */
  readonly release: (owner: LockOwner) => boolean;
};

/**
 * Build an empty ledger.
 *
 * One per lock, not one per claimant: the whole point is that every claimant of a given lock counts
 * against the same set.
 *
 * @example
 * const lock = createLockLedger();
 * if (lock.claim(owner)) {
 *   // …first claim: apply the lock
 * }
 */
export function createLockLedger(): LockLedger {
  const owners = new Set<LockOwner>();

  return {
    claim(owner) {
      if (owners.has(owner)) {
        return false;
      }
      owners.add(owner);
      return owners.size === 1;
    },
    release(owner) {
      return owners.delete(owner) && owners.size === 0;
    },
  };
}
