// Visual tokens a template needs as a value rather than as CSS: a measurement the markup computes
// with, or one the shell has to agree with. Anything a stylesheet can hold belongs in the template's
// own CSS module, which is what a reader copies out.

/**
 * Room a bounded box leaves for a focus ring drawn outside its controls: the ring is a 2px outline
 * at 2px offset, reaching 4px past a button's border box, and a container that is not
 * `overflow: visible` clips at its padding box — a flush footer button then keeps the top and left
 * of its ring and loses the right and bottom. Spent as padding with a matching negative margin so
 * content does not move, as `--form-focus-ring-space` does in vanilla.
 */
export const focusRingSpace = '4px';

export const colors = {
  // Dialog surface background (kept in sync with vanilla CSS :root values)
  dialogBgLight: '#ffffff',
  dialogBgDark: '#121212',
};
