import { Key } from './keys.js';
import type { HotkeyDef } from '../actions/types.js';

/**
 * The modifier set is `ctrl`, deliberately, and stays that way even though the ARIA form below
 * spells it `Control`. The output vocabulary is the platform's and the input vocabulary is the
 * library's: `HotkeyDef` is a closed union whose job is making `'Escpae'` a compile error, so
 * teaching this a second spelling would make the runtime wider than the type. `Key.Control` is
 * also a legitimate plain key, which an alias would blur.
 */
function parse(def: HotkeyDef): {
  readonly key: string;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly meta: boolean;
} {
  const parts = def.split('+');
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
 * One key token, in the spelling both serializers agree on.
 *
 * The spacebar is the one key `KeyboardEvent.key` cannot be quoted verbatim for: its value is
 * `' '`, which reads as nothing at all in a label and is unparseable in `aria-keyshortcuts` — a
 * *space-delimited* list. WAI-ARIA names that exception itself and spells it `Space`.
 */
function canonicalKey(key: string): string {
  if (key === Key.Space) {
    return 'Space';
  }
  return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * Modifiers first, then the key — the order ARIA requires, in the fixed order both spellings
 * share. One function so the label and the DOM value cannot drift apart in a way only a screen
 * reader would notice.
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
 * Convert a `HotkeyDef` to a human-readable label (e.g. `"Ctrl+Enter"`) — for a menu item, a
 * tooltip, a keyboard-shortcuts sheet.
 *
 * **Not the `aria-keyshortcuts` value.** That attribute's tokens must be `KeyboardEvent.key`
 * values, where the Control modifier is `"Control"` — see {@link formatAriaKeyshortcuts}, which is
 * what the library writes onto a button. This one is for what a person reads, and `Ctrl` is the
 * spelling on the keycap.
 *
 * @example
 * formatHotkeyLabel('Ctrl+Enter'); // 'Ctrl+Enter'
 * formatHotkeyLabel('Shift+s'); // 'Shift+S' — letter case is not significant, so it normalises
 */
export function formatHotkeyLabel(def: HotkeyDef): string {
  return serialize(def, 'Ctrl');
}

/**
 * Convert a `HotkeyDef` to the value the DOM's `aria-keyshortcuts` attribute takes.
 *
 * **A different string from {@link formatHotkeyLabel}, and the difference is not cosmetic.** Every
 * token of `aria-keyshortcuts` must be a UI Events `KeyboardEvent.key` value, and the Control
 * modifier's key value is `"Control"` — so `"Ctrl+Enter"` is a label a person reads and
 * `"Control+Enter"` is what assistive technology parses. The spacebar is the spec's own exception:
 * its key value is `' '`, and a space cannot appear in a space-delimited list, so it is `"Space"`.
 *
 * This is the canonical form: what the library writes onto an action's button, what hotkey
 * dispatch queries the DOM by, and what decides whether two hotkeys are the same one. A custom
 * button wrapper that *builds* the attribute rather than forwarding it must build it with this.
 *
 * @example
 * formatAriaKeyshortcuts('Ctrl+Enter'); // 'Control+Enter'
 * formatAriaKeyshortcuts('Ctrl+ '); // 'Control+Space'
 */
export function formatAriaKeyshortcuts(def: HotkeyDef): string {
  return serialize(def, 'Control');
}

/**
 * Strict-match a `KeyboardEvent` against a `HotkeyDef` — every declared modifier must be held
 * and every undeclared one must not be.
 *
 * Single-character keys compare case-insensitively. `Key.A` is `'a'` because that is what
 * `KeyboardEvent.key` reports *without* Shift; hold Shift and the browser reports `'S'`, so a
 * literal comparison would make every `Shift+<letter>` hotkey — a combination `HotkeyDef`
 * explicitly offers — silently unmatchable. Case-insensitivity does not blur the two, because
 * the modifier comparison below is still exact: `'s'` requires Shift *up*, `'Shift+s'`
 * requires it down.
 *
 * Shifted *digits* and punctuation are a different problem and not solved here: `Shift+1`
 * reports `'!'` on a US layout and something else elsewhere, so there is no layout-independent
 * mapping to compare against.
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
 * The `Key` values, indexed by their lowercase spelling, so a lookup is one map read.
 *
 * Built once from the table rather than restated: a key added to `Key` becomes parseable with no
 * second edit, which is the whole reason the table is the single source.
 */
const KEYS_BY_LOWERCASE = new Map(
  Object.values(Key).map((value) => {
    return [value.toLowerCase(), value];
  })
);

/**
 * Read a hotkey out of a string, or `undefined` when the string is not one.
 *
 * **The inverse the library was missing.** Three functions turn a `HotkeyDef` into text — a label,
 * an `aria-keyshortcuts` value, a match against an event — and nothing turned text back into a
 * `HotkeyDef`. That is fine while every shortcut is written in the source, where the closed union
 * makes `'Escpae'` a compile error. It stops being fine the moment shortcuts arrive as *data*: a
 * configuration file, a user preference, a value from a server, a string handed over by another
 * library whose own type is `string`. Without a parser the only crossings are an unchecked cast —
 * which throws the union's guarantee away exactly where the input is least trustworthy — or a
 * hand-rolled validator per call site.
 *
 * Nothing is asserted here. The key is *found* in `Key`, so it carries that table's type out with
 * it, and each modifier arrangement is rebuilt from literal pieces. What cannot be built is
 * rejected: the union names fourteen shapes and not every subset of the four modifiers, so
 * `'Alt+Shift+Meta+a'` parses as far as its parts and then returns `undefined` rather than
 * inventing a type that does not exist.
 *
 * Case is not significant, matching the type's own rule: `'ctrl+s'`, `'Ctrl+S'` and `'CTRL+s'` are
 * one hotkey, and the canonical spelling comes back out.
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
