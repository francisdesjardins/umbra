/**
 * DOM event shapes for the unit project, which has no DOM — the one place the no-`as` rule gives
 * way. Shared, because a copy that forgot `metaKey` would make a hotkey look like it matched.
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
