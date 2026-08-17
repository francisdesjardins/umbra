import { expect, test } from '@playwright/test';
import { chooseActionRunner, preferredRestoreTarget } from '../focus-restore-policy.js';

// The ordering that decides who a settled action hands focus back to. Tested in Node because it is
// a decision, not a DOM operation — candidates only answer `isConnected`. As a `??` chain inside
// the focus scheduler, a wrong-but-truthy first candidate looked exactly like a correct one.

const live = (name: string) => {
  return { isConnected: true, name };
};
const detached = (name: string) => {
  return { isConnected: false, name };
};

test.describe('chooseActionRunner', () => {
  test('takes the first candidate when it is live', () => {
    const focused = live('focused');
    expect(chooseActionRunner(focused, live('activated'), live('lastFocused'))).toBe(focused);
  });

  test('falls through to the activation when nothing holds focus', () => {
    // WebKit: clicking a button focuses nothing, so the pressed one is known only from the click.
    const activated = live('activated');
    expect(chooseActionRunner(null, activated, live('lastFocused'))).toBe(activated);
  });

  test('falls through to the last focused when nothing was activated', () => {
    // A hotkey on a control that already had focus, or an action started programmatically.
    const lastFocused = live('lastFocused');
    expect(chooseActionRunner(null, null, lastFocused)).toBe(lastFocused);
  });

  test('returns null when every candidate is absent', () => {
    expect(chooseActionRunner(null, null, null)).toBeNull();
  });

  test('skips a disconnected candidate and keeps looking', () => {
    // Half the regression this exists for: a runner whose button was re-rendered away is taken
    // and then discarded by the caller, so the live candidate behind it is never asked.
    const activated = live('activated');
    expect(chooseActionRunner(detached('focused'), activated, live('lastFocused'))).toBe(activated);
  });

  test('skips every disconnected candidate rather than only the first', () => {
    const lastFocused = live('lastFocused');
    expect(chooseActionRunner(detached('focused'), detached('activated'), lastFocused)).toBe(
      lastFocused
    );
  });

  test('returns null when the only candidates are disconnected', () => {
    expect(chooseActionRunner(detached('a'), detached('b'), null)).toBeNull();
  });

  test('treats undefined like a missing candidate', () => {
    const lastFocused = live('lastFocused');
    expect(chooseActionRunner(undefined, undefined, lastFocused)).toBe(lastFocused);
  });

  test('is ordered, not merely first-non-null: a live third never beats a live first', () => {
    // The ordering is the contract: reversing the arguments at a call site passes every test above.
    const focused = live('focused');
    const result = chooseActionRunner(focused, live('activated'), live('lastFocused'));
    expect(result?.name).toBe('focused');
  });
});

// The other half of the restore decision. Its `HTMLElement` signature was never a DOM dependency —
// `isConnected` is all it reads. The two run in sequence at every restore: this picks between a
// runner and the opening focus, `chooseActionRunner` decides which candidate is the runner.
test.describe('preferredRestoreTarget', () => {
  test('a connected runner wins over the opening focus', () => {
    const runner = { isConnected: true };
    const opening = { isConnected: true };
    expect(preferredRestoreTarget(runner, opening)).toBe(runner);
  });

  test('a disconnected runner falls through to the opening focus', () => {
    // The button re-rendered away while its action ran — the `??` chain's second mistake.
    const opening = { isConnected: true };
    expect(preferredRestoreTarget({ isConnected: false }, opening)).toBe(opening);
  });

  test('no runner falls through to the opening focus', () => {
    const opening = { isConnected: true };
    expect(preferredRestoreTarget(null, opening)).toBe(opening);
  });

  test('the opening focus is the floor, and it may be nothing', () => {
    expect(preferredRestoreTarget(null, null)).toBeNull();
    expect(preferredRestoreTarget({ isConnected: false }, null)).toBeNull();
  });

  test('the fallback is not itself checked for being connected', () => {
    // Deliberate: `restoreFocus` verifies where focus landed and drops back to the dialog, so a
    // stale opening focus costs a no-op. A check here would be a second guard for one hazard.
    const opening = { isConnected: false };
    expect(preferredRestoreTarget(null, opening)).toBe(opening);
  });
});
