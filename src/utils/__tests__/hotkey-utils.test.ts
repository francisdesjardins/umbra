import { test, expect } from '@playwright/test';
import { formatHotkeyLabel, matchesHotkey } from '../hotkey-utils.js';

// Pure object that satisfies the property subset accessed by matchesHotkey.
// KeyboardEvent is a DOM type; casting lets us test without a live browser.
function makeEvent(
  key: string,
  mods: Partial<{
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
  }> = {}
): KeyboardEvent {
  return {
    key,
    ctrlKey: mods.ctrlKey ?? false,
    altKey: mods.altKey ?? false,
    shiftKey: mods.shiftKey ?? false,
    metaKey: mods.metaKey ?? false,
  } as KeyboardEvent;
}

test.describe('formatHotkeyLabel', () => {
  test('returns multi-char key as-is', () => {
    expect(formatHotkeyLabel('Enter')).toBe('Enter');
  });

  test('uppercases single-character keys', () => {
    expect(formatHotkeyLabel('s')).toBe('S');
  });

  test('formats Ctrl+key', () => {
    expect(formatHotkeyLabel('Ctrl+Enter')).toBe('Ctrl+Enter');
  });

  test('formats Alt+key', () => {
    expect(formatHotkeyLabel('Alt+F4')).toBe('Alt+F4');
  });

  test('formats Shift+key', () => {
    expect(formatHotkeyLabel('Shift+Tab')).toBe('Shift+Tab');
  });

  test('formats Meta+key and uppercases single char', () => {
    expect(formatHotkeyLabel('Meta+k')).toBe('Meta+K');
  });

  test('formats Ctrl+Shift+key', () => {
    expect(formatHotkeyLabel('Ctrl+Shift+S')).toBe('Ctrl+Shift+S');
  });

  test('formats Escape', () => {
    expect(formatHotkeyLabel('Escape')).toBe('Escape');
  });
});

test.describe('matchesHotkey', () => {
  test('matches a plain key', () => {
    expect(matchesHotkey(makeEvent('Enter'), 'Enter')).toBe(true);
  });

  test('returns false for wrong key', () => {
    expect(matchesHotkey(makeEvent('Escape'), 'Enter')).toBe(false);
  });

  test('matches Ctrl+Enter', () => {
    expect(matchesHotkey(makeEvent('Enter', { ctrlKey: true }), 'Ctrl+Enter')).toBe(true);
  });

  test('returns false when required modifier is missing', () => {
    expect(matchesHotkey(makeEvent('Enter'), 'Ctrl+Enter')).toBe(false);
  });

  test('returns false when an extra modifier is present', () => {
    expect(matchesHotkey(makeEvent('Enter', { ctrlKey: true, shiftKey: true }), 'Ctrl+Enter')).toBe(
      false
    );
  });

  test('matches Alt+F4', () => {
    expect(matchesHotkey(makeEvent('F4', { altKey: true }), 'Alt+F4')).toBe(true);
  });

  test('matches Shift+Tab', () => {
    expect(matchesHotkey(makeEvent('Tab', { shiftKey: true }), 'Shift+Tab')).toBe(true);
  });

  test('matches Ctrl+Shift+S', () => {
    expect(matchesHotkey(makeEvent('S', { ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+S')).toBe(
      true
    );
  });

  test('letter case is not significant — the modifiers do the discriminating', () => {
    // `'s'` and `'S'` name the same physical key. Treating them as different keys made
    // `'S'` mean "S with no modifiers", which a keyboard only produces with CapsLock on —
    // so CapsLock silently changed which hotkey fired. Both spellings now match, and
    // whether Shift is held is decided by the modifier list, exactly.
    expect(matchesHotkey(makeEvent('s'), 'S')).toBe(true);
    expect(matchesHotkey(makeEvent('S'), 's')).toBe(true);
    expect(matchesHotkey(makeEvent('S', { shiftKey: true }), 'S')).toBe(false);
  });
});

test.describe('matchesHotkey — Shift + letter', () => {
  test('matches the uppercase key the browser reports when Shift is held', () => {
    // `Key.A` is `'a'` because that is what `KeyboardEvent.key` reports *without* Shift.
    // With Shift held the browser reports `'S'`, so a literal comparison against the
    // declared `'s'` can never match and a `Shift+<letter>` hotkey silently never fires.
    expect(matchesHotkey(makeEvent('S', { shiftKey: true }), 'Shift+s')).toBe(true);
  });

  test('both spellings of the same combination match', () => {
    // `Shift+${Key.S}` produces the lowercase form; `'Shift+S'` is what a user types by hand.
    expect(matchesHotkey(makeEvent('S', { shiftKey: true }), 'Shift+S')).toBe(true);
    expect(matchesHotkey(makeEvent('S', { shiftKey: true }), 'Shift+s')).toBe(true);
  });

  test('still requires the declared modifiers exactly', () => {
    // The case-insensitive comparison must not turn `'s'` into "any S press": Shift is not
    // declared here, so a shifted press is a different hotkey.
    expect(matchesHotkey(makeEvent('S', { shiftKey: true }), 's')).toBe(false);
    expect(matchesHotkey(makeEvent('s'), 'Shift+s')).toBe(false);
  });

  test('multi-character keys are unaffected', () => {
    expect(matchesHotkey(makeEvent('Tab', { shiftKey: true }), 'Shift+Tab')).toBe(true);
    expect(matchesHotkey(makeEvent('tab', { shiftKey: true }), 'Shift+Tab')).toBe(false);
  });
});
