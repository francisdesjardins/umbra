import { expect, test } from '@playwright/test';
import {
  slideAnimation,
  slideDialogStyle,
  type SlideAlign,
  type SlideDirection,
} from '../slide-geometry.js';

// Both bindings read the slide geometry from one table, so a regression here hits two templates
// while the component suite covers only one of them.

const DIRECTIONS: readonly SlideDirection[] = ['left', 'right', 'top', 'bottom'];

test.describe('slideAnimation', () => {
  test('each direction exits past its own edge and enters to zero', () => {
    expect(slideAnimation('left', 'stretch')).toMatchObject({
      entrance: { transform: 'translateX(0)' },
      exit: { transform: 'translateX(-100%)' },
      transitionProperty: 'transform',
    });
    expect(slideAnimation('right', 'stretch').exit.transform).toBe('translateX(100%)');
    expect(slideAnimation('top', 'stretch').exit.transform).toBe('translateY(-100%)');
    expect(slideAnimation('bottom', 'stretch').exit.transform).toBe('translateY(100%)');
  });

  test('align: center folds its cross-axis shift into BOTH keyframes', () => {
    // Transform is one property and the slide owns it, so a separate cross-axis translate would be
    // overwritten; present in only one keyframe, the panel jumps half its size.
    const horizontal = slideAnimation('right', 'center');
    expect(horizontal.entrance.transform).toContain('translateY(-50%)');
    expect(horizontal.exit.transform).toContain('translateY(-50%)');

    const vertical = slideAnimation('bottom', 'center');
    expect(vertical.entrance.transform).toContain('translateX(-50%)');
    expect(vertical.exit.transform).toContain('translateX(-50%)');
  });

  test('no other alignment shifts the panel', () => {
    for (const align of ['stretch', 'start', 'end'] satisfies SlideAlign[]) {
      expect(slideAnimation('right', align).entrance.transform).toBe('translateX(0)');
    }
  });
});

test.describe('slideDialogStyle', () => {
  test('pins the edge the panel slides in from, and sets the other three to auto', () => {
    // All four insets are set explicitly: a non-modal dialog gets `inset: 0` from the placement
    // layer, and a leaked `left: 0` beside `right: 0` is a full-width panel, not a content one.
    for (const direction of DIRECTIONS) {
      const style = slideDialogStyle({ direction, contained: false, align: 'start' });
      expect(style[direction]).toBe(0);
      for (const other of DIRECTIONS.filter((edge) => {
        return edge !== direction;
      })) {
        expect(style[other], `${direction} leaked ${other}`).not.toBeUndefined();
      }
    }
  });

  test('contained panels size to their container, free ones to the viewport', () => {
    expect(
      slideDialogStyle({ direction: 'right', contained: true, align: 'stretch' })
    ).toMatchObject({
      position: 'absolute',
      height: '100%',
    });
    expect(
      slideDialogStyle({ direction: 'right', contained: false, align: 'stretch' })
    ).toMatchObject({
      position: 'fixed',
      height: '100dvh',
    });
    expect(
      slideDialogStyle({ direction: 'bottom', contained: false, align: 'stretch' }).width
    ).toBe('100dvw');
  });

  test('stretch fills the cross axis; the others cap it and pin one edge', () => {
    expect(
      slideDialogStyle({ direction: 'right', contained: false, align: 'stretch' })
    ).toMatchObject({ top: 0, bottom: 0 });

    const start = slideDialogStyle({ direction: 'right', contained: false, align: 'start' });
    expect(start).toMatchObject({ top: 0, maxHeight: '100dvh' });
    expect(start.height).toBeUndefined();

    expect(slideDialogStyle({ direction: 'right', contained: false, align: 'end' })).toMatchObject({
      bottom: 0,
    });
    expect(
      slideDialogStyle({ direction: 'right', contained: false, align: 'center' })
    ).toMatchObject({ top: '50%' });

    // The cross axis swaps with the direction (a bottom panel aligns left/right): two branches.
    const verticalStart = slideDialogStyle({
      direction: 'bottom',
      contained: false,
      align: 'start',
    });
    expect(verticalStart).toMatchObject({ left: 0, maxWidth: '100dvw' });
    expect(verticalStart.width).toBeUndefined();

    expect(slideDialogStyle({ direction: 'bottom', contained: false, align: 'end' })).toMatchObject(
      { right: 0 }
    );
    expect(
      slideDialogStyle({ direction: 'bottom', contained: false, align: 'center' })
    ).toMatchObject({ left: '50%' });
  });

  test('clears the UA’s max sizing so a full-bleed panel is not capped', () => {
    expect(
      slideDialogStyle({ direction: 'left', contained: false, align: 'stretch' })
    ).toMatchObject({
      margin: 0,
      maxWidth: 'none',
      maxHeight: 'none',
    });
  });
});
