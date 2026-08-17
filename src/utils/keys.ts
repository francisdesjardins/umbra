/** Common keyboard key values matching `KeyboardEvent.key`. */
export const Key = {
  // Modifier keys
  Alt: 'Alt',
  Control: 'Control',
  Meta: 'Meta',
  Shift: 'Shift',

  // Navigation
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  End: 'End',
  Home: 'Home',
  PageDown: 'PageDown',
  PageUp: 'PageUp',

  // Editing
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',

  // Whitespace / Action
  Enter: 'Enter',
  Escape: 'Escape',
  Space: ' ',
  Tab: 'Tab',

  // Function keys
  F1: 'F1',
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
  F6: 'F6',
  F7: 'F7',
  F8: 'F8',
  F9: 'F9',
  F10: 'F10',
  F11: 'F11',
  F12: 'F12',

  // Digits (KeyboardEvent.key produces the character, not the code)
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',

  // Letters — lowercase, as KeyboardEvent.key produces lowercase without Shift
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd',
  E: 'e',
  F: 'f',
  G: 'g',
  H: 'h',
  I: 'i',
  J: 'j',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  O: 'o',
  P: 'p',
  Q: 'q',
  R: 'r',
  S: 's',
  T: 't',
  U: 'u',
  V: 'v',
  W: 'w',
  X: 'x',
  Y: 'y',
  Z: 'z',
} as const;

/** Lowercase letter values in `Key` (a–z). */
type LowercaseLetter = (typeof Key)[
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'];

/**
 * All concrete key values from the built-in `Key` constant: named keys (Enter, Escape, F1–F12),
 * digits 0–9, letters a–z / A–Z. Deliberately closed — a key missing here (a media key, a
 * browser-specific one) is a one-line addition to `Key` that benefits everyone rather than type
 * gymnastics each consumer re-derives, and a closed union is what makes `'Escpae'` a compile error.
 */
export type KeyValue = (typeof Key)[keyof typeof Key] | Capitalize<LowercaseLetter>;
