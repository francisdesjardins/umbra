import { expect, test } from '@playwright/test';
import { createLockLedger } from '../lock-ledger.js';

/**
 * The claim ledger, on its own.
 *
 * Its rule — claimed per owner, released only when the last claim goes — is the one that stops a
 * second dialog manager from dropping a lock the first is still holding. It was decidable only
 * through a browser with two managers open at once, because it lived inside `lockBodyScroll` behind
 * a `typeof document` guard that the unit project always takes. Nothing here needs a document.
 */

test.describe('the first claim and the last release', () => {
  test('the first claim is the edge, and the matching release is the other one', () => {
    const ledger = createLockLedger();
    const owner = {};

    expect(ledger.claim(owner)).toBe(true);
    expect(ledger.release(owner)).toBe(true);
  });

  test('a repeat claim by the same owner is not a second edge', () => {
    // Stacked modals within one manager claim on every open. A second `true` here is a second
    // application of the lock — for the body scroll lock, a second helping of compensating
    // padding, which shifts the page the compensation exists to hold still.
    const ledger = createLockLedger();
    const owner = {};

    expect(ledger.claim(owner)).toBe(true);
    expect(ledger.claim(owner)).toBe(false);
    expect(ledger.claim(owner)).toBe(false);

    // And the ledger did not count them: one release still lets go.
    expect(ledger.release(owner)).toBe(true);
  });

  test('a second owner claims without re-applying, and releasing it does not let go', () => {
    // The defect this ledger exists for. Each manager releases whenever it observes a transition
    // and finds nothing of its own open; with last-writer-wins, `second` going away would drop a
    // lock `first` is still holding and the page would scroll behind an open modal.
    const ledger = createLockLedger();
    const first = {};
    const second = {};

    expect(ledger.claim(first)).toBe(true);
    expect(ledger.claim(second)).toBe(false);

    expect(ledger.release(second)).toBe(false);
    expect(ledger.release(first)).toBe(true);
  });

  test('the last release is the last one out, whatever order the claims arrived in', () => {
    const ledger = createLockLedger();
    const a = {};
    const b = {};
    const c = {};

    ledger.claim(a);
    ledger.claim(b);
    ledger.claim(c);

    // Released in the order they claimed rather than in reverse: the ledger is a set, not a stack,
    // and managers unmount in whatever order their trees do.
    expect(ledger.release(a)).toBe(false);
    expect(ledger.release(b)).toBe(false);
    expect(ledger.release(c)).toBe(true);
  });
});

test.describe('claims that were never made', () => {
  test('releasing an owner that never claimed changes nothing', () => {
    // The teardown path of a binding that unmounted before it ever opened — and it must not be
    // read as the last release, or it lets go of a lock somebody else is holding.
    const ledger = createLockLedger();
    const holder = {};
    ledger.claim(holder);

    expect(ledger.release({})).toBe(false);
    // Still held, so the real owner's release is still the edge.
    expect(ledger.release(holder)).toBe(true);
  });

  test('releasing into an empty ledger is not an edge', () => {
    const ledger = createLockLedger();

    expect(ledger.release({})).toBe(false);
  });

  test('releasing the same owner twice reports one edge, not two', () => {
    const ledger = createLockLedger();
    const owner = {};
    ledger.claim(owner);

    expect(ledger.release(owner)).toBe(true);
    expect(ledger.release(owner)).toBe(false);
  });
});

test.describe('what an owner is', () => {
  test('owners are identity, so two equal-looking objects are two claimants', () => {
    // A manager's token is an empty object literal, so structural equality would collapse every
    // manager on the page into one claimant and the first release would let go for all of them.
    const ledger = createLockLedger();

    expect(ledger.claim({})).toBe(true);
    expect(ledger.claim({})).toBe(false);
  });

  test('two ledgers count separately', () => {
    // One ledger per lock, not one per process: a claim on one is not a claim on the other.
    const first = createLockLedger();
    const second = createLockLedger();
    const owner = {};

    expect(first.claim(owner)).toBe(true);
    expect(second.claim(owner)).toBe(true);
    expect(first.release(owner)).toBe(true);
    expect(second.release(owner)).toBe(true);
  });

  test('re-claiming after a full release is an edge again', () => {
    // A lock is not one-shot: a manager that closes its last modal and opens another has to apply
    // it a second time.
    const ledger = createLockLedger();
    const owner = {};

    expect(ledger.claim(owner)).toBe(true);
    expect(ledger.release(owner)).toBe(true);
    expect(ledger.claim(owner)).toBe(true);
  });
});
