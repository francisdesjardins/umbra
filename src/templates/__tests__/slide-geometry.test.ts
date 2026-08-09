import { expect, test } from '@playwright/test';
import {
  slideAnimation,
  slideDialogStyle,
  type SlideAlign,
  type SlideDirection,
} from '../slide-geometry.js';

/**
 * The slide panel's geometry, now that both bindings read it from one table.
 *
 * That is exactly why it is worth unit-testing rather than leaving to the component tests: a
 * regression here is a regression in two templates at once, and the component suite only covers
 * one of them.
 */

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
    // Transform is one property and the slide owns it, so a separately-set cross-axis translate
    // would be overwritten the moment the slide ran. Present in only one keyframe, the panel
    // would jump half its size at the start or the end of the animation.
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
    // All four insets are set explicitly because a non-modal dialog receives `inset: 0` from the
    // placement layer; leaving the opposite edge unset lets that `0` leak in and over-constrain
    // the box — `right: 0` plus a leaked `left: 0` is a full-width panel, not a content-width one.
    for (const direction of DIRECTIONS) {
      const style = slideDialogStyle(direction, false, 'start');
      expect(style[direction]).toBe(0);
      for (const other of DIRECTIONS.filter((edge) => {
        return edge !== direction;
      })) {
        expect(style[other], `${direction} leaked ${other}`).not.toBeUndefined();
      }
    }
  });

  test('contained panels size to their container, free ones to the viewport', () => {
    expect(slideDialogStyle('right', true, 'stretch')).toMatchObject({
      position: 'absolute',
      height: '100%',
    });
    expect(slideDialogStyle('right', false, 'stretch')).toMatchObject({
      position: 'fixed',
      height: '100dvh',
    });
    expect(slideDialogStyle('bottom', false, 'stretch').width).toBe('100dvw');
  });

  test('stretch fills the cross axis; the others cap it and pin one edge', () => {
    expect(slideDialogStyle('right', false, 'stretch')).toMatchObject({ top: 0, bottom: 0 });

    const start = slideDialogStyle('right', false, 'start');
    expect(start).toMatchObject({ top: 0, maxHeight: '100dvh' });
    expect(start.height).toBeUndefined();

    expect(slideDialogStyle('right', false, 'end')).toMatchObject({ bottom: 0 });
    expect(slideDialogStyle('right', false, 'center')).toMatchObject({ top: '50%' });
    expect(slideDialogStyle('bottom', false, 'center')).toMatchObject({ left: '50%' });
  });

  test('clears the UA’s max sizing so a full-bleed panel is not capped', () => {
    expect(slideDialogStyle('left', false, 'stretch')).toMatchObject({
      margin: 0,
      maxWidth: 'none',
      maxHeight: 'none',
    });
  });
});
