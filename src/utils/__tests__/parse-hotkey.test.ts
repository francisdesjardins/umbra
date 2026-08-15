import { expect, test } from '@playwright/test';
import { formatAriaKeyshortcuts, formatHotkeyLabel, parseHotkey } from '../hotkey-utils.js';
import type { HotkeyDef } from '../../actions/types.js';

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

/**
 * Every modifier arrangement the union names, checked against the `switch` that restates it.
 *
 * `HotkeyDef` is the specification and `parseHotkey`'s fourteen-arm `switch` is a second writing of
 * it, each arm rebuilding a distinct literal from pieces. Spot-checking a few leaves the rest as
 * strings nobody has ever read back: a transposed prefix (`Alt+Meta` answering `Meta+Alt+`) is a
 * `HotkeyDef` the type accepts, so it fails nowhere — it fails at a keyboard, as a shortcut that
 * matches no button.
 *
 * The set is derived rather than listed. Pinning the key to `a` makes it finite, and `${string}+a`
 * then matches exactly the arrangements the union carries — so `_everyShapeIsCovered` below is a
 * compile error the day the union grows a fifteenth and this table does not.
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
    // One assertion, and it is the whole contract: the arm has to rebuild the exact arrangement it
    // was handed. An arm answering with a *different* valid shape fails here too, which is why
    // there is no separate check that the fourteen answers are distinct.
    test(`${shape} comes back as itself`, () => {
      expect(parseHotkey(shape)).toBe(shape);
    });
  }
});
