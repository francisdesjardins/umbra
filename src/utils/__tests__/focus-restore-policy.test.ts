import { expect, test } from '@playwright/test';
import {
  chooseActionRunner,
  divergedFromMemory,
  preferredRestoreTarget,
  restoreOwnsTheFocus,
} from '../focus-restore-policy.js';

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

test.describe('restoreOwnsTheFocus', () => {
  // The guard `restoreFocusTo` is consulted behind. Identity only, so Node answers it: what makes
  // it worth a named function is that the two variants land on *different* values and both are
  // the restore's, while everything else is the reader's own and must be left alone.
  const body = { name: 'body' };
  const documentElement = { name: 'html' };
  const opener = { name: 'opener' };
  const owns = (active: { name: string } | null): boolean => {
    return restoreOwnsTheFocus({ active, insideDialog: false, opener, body, documentElement });
  };

  test('a close that stranded the keyboard is the restore’s', () => {
    // What a non-modal close produces: the content went away and nothing took focus.
    expect(owns(null)).toBe(true);
    expect(owns(body)).toBe(true);
    expect(owns(documentElement)).toBe(true);
  });

  test('and so is one the platform handed back to the opener', () => {
    // What a modal close produces: the close-the-dialog steps already restored, to the very
    // element `showDialog` captured. Without this the option would be dead on the modal variant.
    expect(owns(opener)).toBe(true);
  });

  test('and so is a keyboard still inside the dialog that is going away', () => {
    // WebKit focuses the `<dialog>` element on a click inside it, so the close pass can find focus
    // there. A node about to be `display: none` is nowhere, whatever `activeElement` says.
    const inside = { name: 'panel-close' };
    expect(
      restoreOwnsTheFocus({ active: inside, insideDialog: true, opener, body, documentElement })
    ).toBe(true);
  });

  test('a caret the reader put somewhere real is not', () => {
    expect(owns({ name: 'page-field' })).toBe(false);
  });

  test('with nothing captured, only the stranded answers stay true', () => {
    // `showDialog` records nothing when the page had no focus to begin with, and `undefined` must
    // not become a wildcard that matches every live element.
    const none = (active: { name: string } | null): boolean => {
      return restoreOwnsTheFocus({
        active,
        insideDialog: false,
        opener: undefined,
        body,
        documentElement,
      });
    };
    expect(none(null)).toBe(true);
    expect(none({ name: 'page-field' })).toBe(false);
  });
});

test.describe('divergedFromMemory', () => {
  // The stack watcher's question, and the reason it is a decision rather than a DOM read: it fires
  // on every snapshot the manager publishes, so a wrong answer either yanks the keyboard off where
  // the reader put it or leaves a dialog in front holding nobody.
  const dialog = live('dialog');

  const diverged = (
    active: { isConnected: boolean; name: string } | null,
    remembered: { isConnected: boolean; name: string } | null
  ): boolean => {
    return divergedFromMemory({ active, dialog, remembered });
  };

  test('focus standing where the memory says it should is not divergence', () => {
    const field = live('field');
    expect(diverged(field, field)).toBe(false);
  });

  test('focus somewhere else inside is', () => {
    // What a raise leaves behind: `close()` + `showModal()` focuses the first focusable, and the
    // caret the memory holds is the one to put back.
    expect(diverged(live('first-focusable'), live('field'))).toBe(true);
  });

  test('focus gone altogether is too', () => {
    // The reclaim's other trigger: nothing holds it, so there is nobody the answer could rob.
    expect(diverged(null, live('field'))).toBe(true);
  });

  test('focus on the dialog element itself is not', () => {
    // A dead-space click, which is never recorded — reading it as divergence would yank the
    // keyboard off a state `focus-containment.ct.tsx` pins.
    expect(diverged(dialog, live('field'))).toBe(false);
  });

  test('a memory that has left the DOM is no target, so nothing has diverged from it', () => {
    // Falling through with one sends `preferredRestoreTarget` to the `focusOnOpen` button,
    // re-honouring an opening choice over wherever the reader had got to.
    expect(diverged(live('field'), detached('unmounted'))).toBe(false);
  });

  test('nothing recorded yet is not divergence either', () => {
    expect(diverged(live('field'), null)).toBe(false);
  });
});
