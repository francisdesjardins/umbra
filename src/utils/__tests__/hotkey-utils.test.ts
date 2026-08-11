import { test, expect } from '@playwright/test';
import { keyboardEvent as makeEvent } from '../../__tests__/fake-events.js';
import { formatAriaKeyshortcuts, formatHotkeyLabel, matchesHotkey } from '../hotkey-utils.js';
import { Key } from '../keys.js';

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

  test('names the spacebar rather than printing it', () => {
    // `Key.Space` is `' '`, which as a label is nothing at all on the screen.
    expect(formatHotkeyLabel(Key.Space)).toBe('Space');
    expect(formatHotkeyLabel('Ctrl+ ')).toBe('Ctrl+Space');
  });
});

test.describe('formatAriaKeyshortcuts', () => {
  test('spells the Control modifier the way the platform does', () => {
    // Every token of `aria-keyshortcuts` is a `KeyboardEvent.key` value, and Control's is
    // `'Control'` — `'Ctrl'` is a keycap, not a key value, so it names no key to a screen reader.
    expect(formatAriaKeyshortcuts('Ctrl+Enter')).toBe('Control+Enter');
    expect(formatAriaKeyshortcuts('Ctrl+Shift+S')).toBe('Control+Shift+S');
  });

  test('leaves the three modifiers that were already key values alone', () => {
    // The change is surgical: `Alt`, `Shift` and `Meta` are what UI Events calls them already.
    expect(formatAriaKeyshortcuts('Alt+F4')).toBe('Alt+F4');
    expect(formatAriaKeyshortcuts('Shift+Tab')).toBe('Shift+Tab');
    expect(formatAriaKeyshortcuts('Meta+k')).toBe('Meta+K');
  });

  test('writes the spacebar as Space, which the spec asks for by name', () => {
    // The attribute takes a space-*delimited* list, so the one key whose value is a space cannot
    // be quoted verbatim. WAI-ARIA states that exception itself.
    expect(formatAriaKeyshortcuts(Key.Space)).toBe('Space');
    expect(formatAriaKeyshortcuts('Ctrl+ ')).toBe('Control+Space');
  });

  test('never produces a token containing a space', () => {
    // The property the grammar actually needs, asserted as a property: a future key whose value
    // contains a space fails here without anyone remembering to add a case for it.
    for (const def of [Key.Space, 'Ctrl+ ', 'Shift+ ', 'Ctrl+Alt+Shift+ '] as const) {
      expect(formatAriaKeyshortcuts(def)).not.toContain(' ');
    }
  });

  test('is unchanged for the unmodified keys everything else asserts', () => {
    // `Enter` and `Escape` are identical under both spellings, which is exactly why they cannot
    // be the only hotkeys a suite exercises.
    expect(formatAriaKeyshortcuts('Enter')).toBe('Enter');
    expect(formatAriaKeyshortcuts('Escape')).toBe('Escape');
    expect(formatAriaKeyshortcuts('s')).toBe('S');
  });

  test('is a different string from the label, on purpose', () => {
    // Two audiences, two spellings. Collapsing them is what put `Ctrl` in the DOM.
    expect(formatHotkeyLabel('Ctrl+Enter')).toBe('Ctrl+Enter');
    expect(formatAriaKeyshortcuts('Ctrl+Enter')).not.toBe(formatHotkeyLabel('Ctrl+Enter'));
  });
});

test.describe('the ARIA spelling is an output, not an input', () => {
  test('`Control+…` is neither a HotkeyDef nor a match for one', () => {
    // The output vocabulary is the platform's and the input vocabulary is the library's; the
    // `@ts-expect-error` is half the assertion, and fails the build if `HotkeyDef` ever grows the
    // ARIA spelling. Without it `parse` would degrade `'Control+Enter'` to a plain `Enter`.
    // @ts-expect-error — `Control` is the ARIA modifier token; the input spelling is `Ctrl`.
    expect(matchesHotkey(makeEvent('Enter', { ctrlKey: true }), 'Control+Enter')).toBe(false);
  });

  test('`Control` on its own is still a legitimate key', () => {
    // Which is the other reason not to alias the two: `Key.Control` names a real key.
    expect(matchesHotkey(makeEvent('Control'), Key.Control)).toBe(true);
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
