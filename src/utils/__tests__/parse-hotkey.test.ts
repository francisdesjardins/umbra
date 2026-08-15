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
    test(`${shape} comes back as itself, in any case it was written`, () => {
      expect(parseHotkey(shape)).toBe(shape);
      // Case is not significant on the way in and the canonical spelling comes out — which is the
      // half that catches an arm returning a *differently* wrong shape rather than a malformed one.
      expect(parseHotkey(shape.toLowerCase())).toBe(shape);
      expect(parseHotkey(shape.toUpperCase())).toBe(shape);
    });
  }

  test('no two arrangements answer with the same hotkey', () => {
    // The round trips above would each pass if two arms swapped their literals only when both
    // inputs were written the other arm's way. Fourteen distinct answers is what rules that out.
    const parsed = SHAPES.map((shape) => {
      return parseHotkey(shape);
    });

    expect(new Set(parsed).size).toBe(SHAPES.length);
  });

  test('the modifiers reach both formatters, in each one’s own spelling', () => {
    // `Ctrl` is the keycap and `Control` is the `KeyboardEvent.key` value, and every arm carrying
    // the modifier has to survive into both — the label a person reads and the attribute hotkey
    // dispatch queries the DOM by.
    expect(formatHotkeyLabel('Ctrl+Alt+Meta+a')).toBe('Ctrl+Alt+Meta+A');
    expect(formatAriaKeyshortcuts('Ctrl+Alt+Meta+a')).toBe('Control+Alt+Meta+A');
    expect(formatHotkeyLabel('Shift+Meta+a')).toBe('Shift+Meta+A');
    expect(formatAriaKeyshortcuts('Shift+Meta+a')).toBe('Shift+Meta+A');
  });
});
