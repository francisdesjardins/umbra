import { expect, test } from '@playwright/test';
import { dismissKeyIsOwnedByAction } from '../dismiss-key-gate.js';
import { Key } from '../keys.js';

test.describe('dismissKeyIsOwnedByAction', () => {
  test('an action declaring the dismiss key owns it', () => {
    expect(dismissKeyIsOwnedByAction(Key.Escape, [Key.Escape])).toBe(true);
    expect(dismissKeyIsOwnedByAction(Key.Delete, [Key.Enter, Key.Delete])).toBe(true);
  });

  test('actions on other keys leave dismiss alone', () => {
    expect(dismissKeyIsOwnedByAction(Key.Escape, [Key.Enter])).toBe(false);
    expect(dismissKeyIsOwnedByAction(Key.Escape, [])).toBe(false);
  });

  test('no controller means nothing owns the key', () => {
    expect(dismissKeyIsOwnedByAction(Key.Escape, undefined)).toBe(false);
  });

  test('dismissKey: false is never owned', () => {
    // The guard matters: with key dismissal disabled there is no key to collide with, and a
    // truthy result here would make the non-modal path redirect a keypress to a button that
    // was never bound to it.
    expect(dismissKeyIsOwnedByAction(false, [Key.Escape])).toBe(false);
    expect(dismissKeyIsOwnedByAction(false, undefined)).toBe(false);
  });

  test('modifier combinations are compared exactly', () => {
    // 'Ctrl+Enter' and 'Enter' are different bindings; a prefix match would hijack the wrong one.
    expect(dismissKeyIsOwnedByAction('Ctrl+Enter', ['Enter'])).toBe(false);
    expect(dismissKeyIsOwnedByAction('Enter', ['Ctrl+Enter'])).toBe(false);
    expect(dismissKeyIsOwnedByAction('Ctrl+Enter', ['Ctrl+Enter'])).toBe(true);
  });
});

test.describe('dismissKeyIsOwnedByAction — spelling', () => {
  test('two spellings of the same hotkey collide', () => {
    // `'Shift+s'` and `'Shift+S'` are one hotkey — `matchesHotkey` treats them the same and
    // they produce the same `aria-keyshortcuts` label. If the collision test disagreed, the
    // dismiss path would fire for a key an action already owns.
    expect(dismissKeyIsOwnedByAction('Shift+s', ['Shift+S'])).toBe(true);
    expect(dismissKeyIsOwnedByAction('Shift+S', ['Shift+s'])).toBe(true);
  });

  test('different hotkeys still do not collide', () => {
    expect(dismissKeyIsOwnedByAction('Shift+s', ['Shift+d'])).toBe(false);
    expect(dismissKeyIsOwnedByAction('s', ['Shift+s'])).toBe(false);
  });
});
