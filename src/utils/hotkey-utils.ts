import type { HotkeyDef } from '../actions/types.js';

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
 * Convert a `HotkeyDef` to a human-readable label (e.g. `"Ctrl+Enter"`).
 *
 * @example
 * formatHotkeyLabel('Ctrl+Enter'); // 'Ctrl+Enter'
 * formatHotkeyLabel('Shift+s'); // 'Shift+S' — the canonical form, and what reaches the DOM
 */
export function formatHotkeyLabel(def: HotkeyDef): string {
  const { key, ctrl, alt, shift, meta } = parse(def);
  const parts: string[] = [];
  if (ctrl) {
    parts.push('Ctrl');
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
  parts.push(key.length === 1 ? key.toUpperCase() : key);
  return parts.join('+');
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
