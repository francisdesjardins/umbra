import { expect, test } from '@playwright/test';
import { formatAriaKeyshortcuts, formatHotkeyLabel, parseHotkey } from '../hotkey-utils.js';

/**
 * `parseHotkey` — text back into a `HotkeyDef`, or nothing.
 *
 * The interesting assertions are the refusals. A parser that returns a value for everything is a
 * cast with extra steps, and the point of this one is that it hands back a member of a closed
 * union or admits it cannot.
 */

test('a plain key comes back canonically spelled', () => {
  expect(parseHotkey('Escape')).toBe('Escape');
  expect(parseHotkey('escape')).toBe('Escape');
  expect(parseHotkey('ESCAPE')).toBe('Escape');
});

test('a letter normalises to the table’s spelling', () => {
  // `Key.S` is `'s'` — what `KeyboardEvent.key` reports without Shift — so that is what comes out
  // whichever case went in.
  expect(parseHotkey('S')).toBe('s');
  expect(parseHotkey('s')).toBe('s');
});

test('modifiers are read in any case and returned in the union’s order', () => {
  expect(parseHotkey('ctrl+s')).toBe('Ctrl+s');
  expect(parseHotkey('CTRL+S')).toBe('Ctrl+s');
  // Written back to front: the output order is the type's, not the input's.
  expect(parseHotkey('Shift+Ctrl+Enter')).toBe('Ctrl+Shift+Enter');
});

test('the three-modifier shapes the union names round-trip', () => {
  expect(parseHotkey('Ctrl+Alt+Shift+a')).toBe('Ctrl+Alt+Shift+a');
  expect(parseHotkey('Ctrl+Alt+Meta+a')).toBe('Ctrl+Alt+Meta+a');
  expect(parseHotkey('Ctrl+Shift+Meta+a')).toBe('Ctrl+Shift+Meta+a');
});

test('a combination the union does not name is refused rather than invented', () => {
  // `Alt+Shift+Meta` and the four-modifier form are genuinely absent from `HotkeyDef`. Returning
  // them would hand back a string the type says does not exist.
  expect(parseHotkey('Alt+Shift+Meta+a')).toBeUndefined();
  expect(parseHotkey('Ctrl+Alt+Shift+Meta+a')).toBeUndefined();
});

test('anything that is not a key in the table is refused', () => {
  expect(parseHotkey('Escpae')).toBeUndefined();
  expect(parseHotkey('Ctrl+Nope')).toBeUndefined();
  expect(parseHotkey('')).toBeUndefined();
  expect(parseHotkey('Ctrl+')).toBeUndefined();
});

test('a modifier that is not one, or repeats, is refused', () => {
  expect(parseHotkey('Hyper+a')).toBeUndefined();
  // A repeat is a typo, not an intent — collapsing it silently would accept nonsense.
  expect(parseHotkey('Ctrl+Ctrl+a')).toBeUndefined();
});

test('a modifier key on its own is still a key', () => {
  // `Key.Shift` is a legitimate plain key, and the trailing token is read as the key rather than
  // as a modifier with nothing after it.
  expect(parseHotkey('Shift')).toBe('Shift');
  expect(parseHotkey('Control')).toBe('Control');
});

test('what it returns is what the formatters accept', () => {
  // The round trip is the contract: parsing produces a value the rest of the hotkey surface takes
  // without a cast, and the two formatters agree on it.
  const parsed = parseHotkey('ctrl+enter');
  expect(parsed).toBeDefined();
  expect(formatHotkeyLabel(parsed!)).toBe('Ctrl+Enter');
  expect(formatAriaKeyshortcuts(parsed!)).toBe('Control+Enter');
});
