import { expect, test } from '@playwright/test';
import { chooseActionRunner, preferredRestoreTarget } from '../focus-policy.js';

/**
 * The ordering that decides who a settled action hands focus back to.
 *
 * It is tested here, in Node, because it is a decision rather than a DOM operation — the
 * candidates only have to answer `isConnected`. That is the whole point of the extraction: while
 * this lived as a `??` chain inside the focus scheduler, the only way to observe it was to run a
 * browser and look at where focus ended up, and a wrong-but-truthy first candidate looked
 * exactly like a correct one. WebKit is what eventually noticed.
 */

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
    // WebKit: clicking a button focuses nothing, so the first read has no answer and the button
    // that was pressed is known only from the click.
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
    // The regression this function exists for, one half of it: a runner whose button was
    // re-rendered away used to be taken and then discarded by the caller, which meant the live
    // candidate sitting behind it never got asked.
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
    // Stated as its own case because the ordering is the contract. Reversing the argument order
    // at a call site is a real defect and would pass every test above.
    const focused = live('focused');
    const result = chooseActionRunner(focused, live('activated'), live('lastFocused'));
    expect(result?.name).toBe('focused');
  });
});

/**
 * The other half of the restore decision, and the sibling `chooseActionRunner` names.
 *
 * Its `HTMLElement` signature was never a DOM dependency — `isConnected` is the whole of what it
 * reads — so it sat in a browser-only file with no unit test while the function directly beneath it
 * had nine. The two are asked in sequence at every restore: this one picks between a runner and the
 * opening focus, `chooseActionRunner` decides which candidate is the runner in the first place.
 */
test.describe('preferredRestoreTarget', () => {
  test('a connected runner wins over the opening focus', () => {
    const runner = { isConnected: true };
    const opening = { isConnected: true };
    expect(preferredRestoreTarget(runner, opening)).toBe(runner);
  });

  test('a disconnected runner falls through to the opening focus', () => {
    // The button re-rendered away while its action ran — the case `chooseActionRunner`'s doc
    // records as the second thing the old `??` chain got wrong.
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
    // Deliberate, and worth pinning rather than discovering: `restoreFocus` verifies where focus
    // actually landed and drops back to the dialog, so a stale opening focus costs a no-op rather
    // than a wrong answer. A check here would be a second guard for one hazard.
    const opening = { isConnected: false };
    expect(preferredRestoreTarget(null, opening)).toBe(opening);
  });
});
