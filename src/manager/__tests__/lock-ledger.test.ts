import { expect, test } from '@playwright/test';
import { createLockLedger, createLockOwner } from '../lock-ledger.js';

/**
 * The claim ledger alone: claimed per owner, released only on the last claim, so a second manager
 * cannot drop a lock the first holds — behind `lockBodyScroll`'s guard, that needed a browser.
 */

test.describe('the first claim and the last release', () => {
  test('the first claim is the edge, and the matching release is the other one', () => {
    const ledger = createLockLedger();
    const owner = createLockOwner();

    expect(ledger.claim(owner)).toBe(true);
    expect(ledger.release(owner)).toBe(true);
  });

  test('a repeat claim by the same owner is not a second edge', () => {
    // Stacked dialogs claim on every open; a second `true` is a second helping of padding.
    const ledger = createLockLedger();
    const owner = createLockOwner();

    expect(ledger.claim(owner)).toBe(true);
    expect(ledger.claim(owner)).toBe(false);
    expect(ledger.claim(owner)).toBe(false);

    expect(ledger.release(owner)).toBe(true);
  });

  test('a second owner claims without re-applying, and releasing it does not let go', () => {
    // Each manager releases when it sees nothing of its own open; with last-writer-wins, `second`
    // going away drops a lock `first` still holds and the page scrolls behind an open dialog.
    const ledger = createLockLedger();
    const first = createLockOwner();
    const second = createLockOwner();

    expect(ledger.claim(first)).toBe(true);
    expect(ledger.claim(second)).toBe(false);

    expect(ledger.release(second)).toBe(false);
    expect(ledger.release(first)).toBe(true);
  });
});

test.describe('claims that were never made', () => {
  test('releasing an owner that never claimed changes nothing', () => {
    // A binding unmounting before it opened: must not read as the last release.
    const ledger = createLockLedger();
    const holder = createLockOwner();
    ledger.claim(holder);

    expect(ledger.release(createLockOwner())).toBe(false);
    expect(ledger.release(holder)).toBe(true);
  });

  test('releasing the same owner twice reports one edge, not two', () => {
    const ledger = createLockLedger();
    const owner = createLockOwner();
    ledger.claim(owner);

    expect(ledger.release(owner)).toBe(true);
    expect(ledger.release(owner)).toBe(false);
  });
});

test.describe('what an owner is', () => {
  test('owners are identity, so two freshly minted tokens are two claimants', () => {
    // A token carries no data, so structural equality would collapse every manager into one.
    const ledger = createLockLedger();

    expect(ledger.claim(createLockOwner())).toBe(true);
    expect(ledger.claim(createLockOwner())).toBe(false);
  });

  test('re-claiming after a full release is an edge again', () => {
    // Not one-shot: a manager closing its last dialog and opening another applies it again.
    const ledger = createLockLedger();
    const owner = createLockOwner();

    expect(ledger.claim(owner)).toBe(true);
    expect(ledger.release(owner)).toBe(true);
    expect(ledger.claim(owner)).toBe(true);
  });
});
