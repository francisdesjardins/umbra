/**
 * DOM event shapes for the unit project, which has no DOM.
 *
 * The cast is the one place the project's no-`as` rule gives way, and only here: the functions
 * under test read four properties off a `KeyboardEvent`, constructing a real one needs a browser,
 * and a unit test that had to launch Chromium to check that `'Ctrl+s'` parses would not be a unit
 * test. Shared rather than copied so the fake stays one shape — a second version that forgot
 * `metaKey` would make a hotkey look like it matched.
 */

/** A `KeyboardEvent` carrying exactly what `matchesHotkey` and the action engine read. */
export function keyboardEvent(
  key: string,
  modifiers: Partial<{
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
  }> = {}
): KeyboardEvent {
  return {
    key,
    ctrlKey: modifiers.ctrlKey ?? false,
    altKey: modifiers.altKey ?? false,
    shiftKey: modifiers.shiftKey ?? false,
    metaKey: modifiers.metaKey ?? false,
  } as KeyboardEvent;
}
