// Shared visual tokens for playground template parity
export const spacing = {
  gapUnit: 2, // MUI theme spacing units, for numeric `sx` gaps
  content: 8, // px — `Content` helpers across templates
  small: 6, // px — kbd, tiny paddings
  medium: 12, // px
  large: 24, // px
};

/**
 * Room a bounded box leaves for a focus ring drawn outside its controls: the ring is a 2px outline
 * at 2px offset, reaching 4px past a button's border box, and a container that is not
 * `overflow: visible` clips at its padding box — a flush footer button then keeps the top and left
 * of its ring and loses the right and bottom. Spent as padding with a matching negative margin so
 * content does not move, as `--form-focus-ring-space` does in vanilla.
 */
export const focusRingSpace = '4px';

export const sizes = {
  minWidth: 475, // px
  maxWidth: 800, // px
  maxHeight: '70vh',
};

export const colors = {
  // Dialog surface background (kept in sync with vanilla CSS :root values)
  modalBgLight: '#ffffff',
  modalBgDark: '#121212',
};

export const motion = {
  durationMs: 240,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};
