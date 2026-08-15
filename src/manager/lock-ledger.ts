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

/** A ledger of claims on one lock. Owners are compared by identity, so any object will do. */
export type LockLedger = {
  /**
   * Register `owner`'s interest.
   *
   * @returns whether the lock has to be applied now: `false` for a repeat claim, and `false` while
   *   somebody else is already holding it.
   */
  readonly claim: (owner: object) => boolean;
  /**
   * Drop `owner`'s interest.
   *
   * @returns whether the lock has to be released now: `false` for an owner that never claimed —
   *   the teardown of a binding that unmounted before it ever opened — and `false` while another
   *   claim is outstanding.
   */
  readonly release: (owner: object) => boolean;
};

/**
 * Build an empty ledger — one per lock, not one per claimant, since counting every claimant of a
 * given lock against the same set is the whole of what it does.
 */
export function createLockLedger(): LockLedger {
  const owners = new Set<object>();

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
