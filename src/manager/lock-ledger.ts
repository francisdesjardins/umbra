/**
 * Who currently wants a global lock held, and whether this call is the one that turns it.
 *
 * A globally-targeted lock — `document.body` is one body however many dialog managers a page builds
 * — cannot be a shared boolean: each manager releases when it observes a transition with nothing of
 * its own open, so last-writer-wins drops a lock another still holds. So claims are per owner and
 * idempotent, released only when the last goes; stacked dialogs within one manager claim once, and a
 * lock compensating the layout twice would shift the page it exists to hold still. **The two
 * booleans make this a decision rather than a `Set`**: a rule restated at the call site is one the
 * next call site gets slightly wrong.
 */

/** Nominal marker for {@link LockOwner}: never read, never assigned, only stops "any object". */
declare const LOCK_OWNER: unique symbol;

/**
 * Whoever holds a claim: an **identity**, not a value. Every comparison downstream is by reference,
 * so the requirement is only "equal to itself and to nothing else" — but the bare `object` keyword
 * reads as *any* non-primitive, inviting a domain object that happens to be in scope and making the
 * identity accidental. Branded, so an owner is something you **mint** via {@link createLockOwner}
 * rather than find. `WeakKey` is wrong here for a reason worth recording: it resolves to
 * `object | symbol`, and its name promises weak retention while the ledger holds owners in a
 * **strong** `Set` — which it must, because it reads `size`.
 */
export type LockOwner = { readonly [LOCK_OWNER]?: never };

/** Mint an owner. An empty object is the whole implementation; what it carries is the type. */
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
 * Build an empty ledger — one per lock, not one per claimant, the whole point being that every
 * claimant of a given lock counts against the same set.
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
