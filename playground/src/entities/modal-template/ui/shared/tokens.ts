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
