// Shared visual tokens for playground template parity
export const spacing = {
  // `gapUnit` is intended for MUI `sx` numeric gap values (theme spacing units)
  gapUnit: 2, // MUI spacing units (theme.spacing(3))
  // Content gap used by `Content` helpers across templates (pixels)
  content: 8,
  small: 6, // px — small gaps (kbd, tiny paddings)
  medium: 12, // px
  large: 24, // px
};

/**
 * Room a bounded box has to leave for a focus ring drawn outside its controls.
 *
 * The app's ring is a 2px outline at a 2px offset, so it reaches 4px past a button's border box —
 * and a container that is not `overflow: visible` clips at its padding box. A footer button sits
 * flush against that edge, so without this its ring loses the two sides that reach it: visible on
 * the top and left, gone on the right and bottom, which reads as a rendering glitch rather than
 * as the missing focus indicator it is.
 *
 * Spent as padding with a matching negative margin, so the content does not move — the same trade
 * the vanilla form modal makes with `--form-focus-ring-space`.
 */
export const focusRingSpace = '4px';

export const sizes = {
  minWidth: 475, // px
  maxWidth: 800, // px
  maxHeight: '70vh',
};

export const colors = {
  // Modal surface background (kept in sync with vanilla CSS :root values)
  modalBgLight: '#ffffff',
  modalBgDark: '#121212',
};

export const motion = {
  durationMs: 240,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};
