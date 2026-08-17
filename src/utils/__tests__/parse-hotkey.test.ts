import { expect, test } from '@playwright/test';
import { formatAriaKeyshortcuts, formatHotkeyLabel, parseHotkey } from '../hotkey-utils.js';
import type { HotkeyDef } from '../../actions/types.js';

// `parseHotkey` — text back into a `HotkeyDef`, or nothing. The refusals are the interesting
// assertions: a parser that returns a value for everything is a cast with extra steps.

test('a plain key comes back canonically spelled', () => {
  expect(parseHotkey('Escape')).toBe('Escape');
  expect(parseHotkey('escape')).toBe('Escape');
  expect(parseHotkey('ESCAPE')).toBe('Escape');
});

test('a letter normalises to the table’s spelling', () => {
  // `Key.S` is `'s'` — what `KeyboardEvent.key` reports without Shift — whichever case went in.
  expect(parseHotkey('S')).toBe('s');
  expect(parseHotkey('s')).toBe('s');
});

test('modifiers are read in any case and returned in the union’s order', () => {
  expect(parseHotkey('ctrl+s')).toBe('Ctrl+s');
  expect(parseHotkey('CTRL+S')).toBe('Ctrl+s');
  // Written back to front: the output order is the type's, not the input's.
  expect(parseHotkey('Shift+Ctrl+Enter')).toBe('Ctrl+Shift+Enter');
});

test('a combination the union does not name is refused rather than invented', () => {
  // `Alt+Shift+Meta` and the four-modifier form are genuinely absent from `HotkeyDef`.
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
  // `Key.Shift` is a plain key: the trailing token reads as the key, not a dangling modifier.
  expect(parseHotkey('Shift')).toBe('Shift');
  expect(parseHotkey('Control')).toBe('Control');
});

test('what it returns is what the formatters accept', () => {
  // The round trip is the contract: the rest of the hotkey surface takes it without a cast.
  const parsed = parseHotkey('ctrl+enter');
  expect(parsed).toBeDefined();
  expect(formatHotkeyLabel(parsed!)).toBe('Ctrl+Enter');
  expect(formatAriaKeyshortcuts(parsed!)).toBe('Control+Enter');
});

/**
 * Every arrangement the union names, against the fourteen-arm `switch` that restates it. A
 * transposed prefix (`Alt+Meta` answering `Meta+Alt+`) is still a `HotkeyDef`, so it fails at a
 * keyboard rather than at the type. The set is derived — `${string}+a` matches exactly the
 * arrangements the union carries — so `_everyShapeIsCovered` breaks the day the union grows one.
 */
type ShapeOfA = Extract<HotkeyDef, `${string}+a`> | 'a';

const SHAPES = [
  'a',
  'Ctrl+a',
  'Alt+a',
  'Shift+a',
  'Meta+a',
  'Ctrl+Shift+a',
  'Ctrl+Alt+a',
  'Ctrl+Meta+a',
  'Alt+Shift+a',
  'Alt+Meta+a',
  'Shift+Meta+a',
  'Ctrl+Alt+Shift+a',
  'Ctrl+Alt+Meta+a',
  'Ctrl+Shift+Meta+a',
] as const satisfies readonly ShapeOfA[];

/** Compile error unless `A` and `B` are mutually assignable, i.e. the same type. */
type Equals<A extends B, B extends C, C = A> = A;

/** Compile error if the union names a shape the table above leaves out, or the other way round. */
export type _everyShapeIsCovered = Equals<ShapeOfA, (typeof SHAPES)[number]>;

test.describe('every shape the union names round-trips', () => {
  for (const shape of SHAPES) {
    // The arm must rebuild the exact arrangement handed in; a different valid shape fails here too.
    test(`${shape} comes back as itself`, () => {
      expect(parseHotkey(shape)).toBe(shape);
    });
  }
});
