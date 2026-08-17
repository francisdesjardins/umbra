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

/**
 * That room, as the pair of declarations that spends it: padding to hold the ring inside the clip,
 * and a matching negative margin so the box still occupies what it did and nothing on screen moves.
 *
 * Handed out by `useScrollRegion` as `regionSx`, because "this box clips" and "this box needs ring
 * room" are the same fact, and reserving it per container is how one ends up with the a11y half and
 * not this one.
 *
 * **Spend it only on an axis whose padding is under the reach.** It is a reserve, not a decoration:
 * stacked on a side that already pads 24px it adds a fourth 4px and pulls the box 4px outward,
 * which moves content for no gain. `slide-modal`'s content pads on every side and takes none of it;
 * `message-modal`'s pads on none and takes all of it.
 */
export const focusRingRoom = {
  padding: focusRingSpace,
  margin: `calc(-1 * ${focusRingSpace})`,
  /**
   * The resting case is the padding; this is the scrolled one. Tabbing to a control below the fold
   * makes the browser scroll it into view flush against the edge, where the padding it would have
   * sat inside has scrolled away with it.
   */
  scrollPadding: focusRingSpace,
} as const;

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
