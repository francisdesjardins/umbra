import { Key } from './keys.js';
import type { HotkeyDef } from '../actions/types.js';

/**
 * The modifier set spells it `ctrl`, not ARIA's `Control`: the output vocabulary is the platform's
 * and the input `HotkeyDef`'s, so a second spelling would make the runtime wider than the type —
 * and `Key.Control` is a legitimate plain key an alias would blur.
 */
function parse(def: HotkeyDef): {
  readonly key: string;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly meta: boolean;
} {
  const parts = def.split('+');
  // `split` never answers an empty array, so this fallback is `noUncheckedIndexedAccess` tax
  // rather than a case — and is why the line is not fully covered.
  const key = parts.pop() ?? def;
  const mods = new Set(
    parts.map((p) => {
      return p.toLowerCase();
    })
  );
  return {
    key,
    ctrl: mods.has('ctrl'),
    alt: mods.has('alt'),
    shift: mods.has('shift'),
    meta: mods.has('meta'),
  };
}

/**
 * One key token, in the spelling both serializers agree on. The spacebar is the exception:
 * `KeyboardEvent.key` reports `' '`, which reads as nothing in a label and is unparseable in the
 * *space-delimited* `aria-keyshortcuts` — so WAI-ARIA names it `Space`.
 */
function canonicalKey(key: string): string {
  if (key === Key.Space) {
    return 'Space';
  }
  return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * Modifiers first, then the key — ARIA's required order, in the fixed order both spellings share.
 * One function, so the label and the DOM value cannot drift where only a screen reader would notice.
 */
function serialize(def: HotkeyDef, control: 'Ctrl' | 'Control'): string {
  const { key, ctrl, alt, shift, meta } = parse(def);
  const parts: string[] = [];
  if (ctrl) {
    parts.push(control);
  }
  if (alt) {
    parts.push('Alt');
  }
  if (shift) {
    parts.push('Shift');
  }
  if (meta) {
    parts.push('Meta');
  }
  parts.push(canonicalKey(key));
  return parts.join('+');
}

/**
 * A `HotkeyDef` as a human-readable label (`"Ctrl+Enter"`) — for a menu item, a tooltip, a
 * shortcuts sheet, `Ctrl` being the spelling on the keycap. **Not** the `aria-keyshortcuts` value;
 * see {@link formatAriaKeyshortcuts}.
 *
 * @example
 * formatHotkeyLabel('Ctrl+Enter'); // 'Ctrl+Enter'
 * formatHotkeyLabel('Shift+s'); // 'Shift+S' — letter case is not significant, so it normalises
 */
export function formatHotkeyLabel(def: HotkeyDef): string {
  return serialize(def, 'Ctrl');
}

/**
 * A `HotkeyDef` as the DOM's `aria-keyshortcuts` value — **a different string from
 * {@link formatHotkeyLabel}, and not cosmetically**: every token must be a UI Events
 * `KeyboardEvent.key` value, so Control is `"Control"`, and the spacebar (key value `' '`, which
 * cannot appear in a space-delimited list) is the spec's own exception, `"Space"`. The canonical
 * form — what the library writes onto a button, what hotkey dispatch queries the DOM by, and what
 * decides whether two hotkeys are one; a wrapper that *builds* the attribute must build it here.
 *
 * @example
 * formatAriaKeyshortcuts('Ctrl+Enter'); // 'Control+Enter'
 * formatAriaKeyshortcuts('Ctrl+ '); // 'Control+Space'
 */
export function formatAriaKeyshortcuts(def: HotkeyDef): string {
  return serialize(def, 'Control');
}

/**
 * Strict-match a `KeyboardEvent` against a `HotkeyDef` — every declared modifier held, every
 * undeclared one not. Single-character keys compare case-insensitively, `Key.A` being `'a'` because
 * that is what `KeyboardEvent.key` reports *without* Shift, so a literal comparison would silently
 * unmatch every `Shift+<letter>`; nothing blurs, the modifier comparison staying exact. Shifted
 * *digits* and punctuation are a different, unsolved problem — `Shift+1` is `'!'` on a US layout
 * and something else elsewhere, with no layout-independent mapping.
 *
 * @example
 * element.addEventListener('keydown', (event) => {
 *   if (matchesHotkey(event, 'Ctrl+Enter')) {
 *     submit();
 *   }
 * });
 */
export function matchesHotkey(event: KeyboardEvent, def: HotkeyDef): boolean {
  const { key, ctrl, alt, shift, meta } = parse(def);
  const keyMatches =
    key.length === 1 ? event.key.toLowerCase() === key.toLowerCase() : event.key === key;
  return (
    keyMatches &&
    event.ctrlKey === ctrl &&
    event.altKey === alt &&
    event.shiftKey === shift &&
    event.metaKey === meta
  );
}

/**
 * The `Key` values indexed by lowercase spelling, so a lookup is one map read. Built from the
 * table rather than restated: a key added to `Key` becomes parseable with no second edit.
 */
const KEYS_BY_LOWERCASE = new Map(
  Object.values(Key).map((value) => {
    return [value.toLowerCase(), value];
  })
);

/**
 * Read a hotkey out of a string, or `undefined` when it is not one — **for shortcuts that arrive as
 * data**: a config file, a user preference, a server value, a library whose own type is `string`,
 * where the alternative is an unchecked cast exactly where the input is least trustworthy.
 *
 * Nothing is asserted: the key is *found* in `Key`, carrying that table's type out, and each
 * modifier arrangement is rebuilt from literal pieces — what cannot be built is rejected, the union
 * naming fourteen shapes rather than every subset. Case is not significant, matching the type, and
 * the canonical spelling comes back out.
 *
 * @example
 * parseHotkey('Ctrl+S'); // 'Ctrl+s'
 * parseHotkey('escape'); // 'Escape'
 * parseHotkey('Ctrl+Nope'); // undefined — not a key in the table
 * parseHotkey(''); // undefined
 */
export function parseHotkey(input: string): HotkeyDef | undefined {
  const parts = input.split('+');
  const rawKey = parts.pop();
  if (rawKey === undefined || rawKey === '') {
    return undefined;
  }

  const key = KEYS_BY_LOWERCASE.get(rawKey.toLowerCase());
  if (key === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  for (const part of parts) {
    const modifier = part.toLowerCase();
    // A repeat is a typo, not an intent, and silently collapsing it would accept `'Ctrl+Ctrl+s'`.
    if (!['ctrl', 'alt', 'shift', 'meta'].includes(modifier) || seen.has(modifier)) {
      return undefined;
    }
    seen.add(modifier);
  }

  // The fixed order the union is written in, and the only orders it names. A `default` rather than
  // an exhaustive map because the union is deliberately not every subset — see the type.
  const order = ['ctrl', 'alt', 'shift', 'meta'].filter((modifier) => {
    return seen.has(modifier);
  });
  switch (order.join('+')) {
    case '':
      return key;
    case 'ctrl':
      return `Ctrl+${key}`;
    case 'alt':
      return `Alt+${key}`;
    case 'shift':
      return `Shift+${key}`;
    case 'meta':
      return `Meta+${key}`;
    case 'ctrl+shift':
      return `Ctrl+Shift+${key}`;
    case 'ctrl+alt':
      return `Ctrl+Alt+${key}`;
    case 'ctrl+meta':
      return `Ctrl+Meta+${key}`;
    case 'alt+shift':
      return `Alt+Shift+${key}`;
    case 'alt+meta':
      return `Alt+Meta+${key}`;
    case 'shift+meta':
      return `Shift+Meta+${key}`;
    case 'ctrl+alt+shift':
      return `Ctrl+Alt+Shift+${key}`;
    case 'ctrl+alt+meta':
      return `Ctrl+Alt+Meta+${key}`;
    case 'ctrl+shift+meta':
      return `Ctrl+Shift+Meta+${key}`;
    default:
      return undefined;
  }
}
