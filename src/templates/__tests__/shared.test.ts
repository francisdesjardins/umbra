import { expect, test } from '@playwright/test';
import { DEFAULT_FADE_ANIMATION, buildModalOptions } from '../shared.js';
import type { DialogStyle } from '../../core/style.js';

/**
 * The option mapping every template hook runs through — four of them now, across two bindings.
 *
 * It was reachable only through a rendered modal before, which meant the two rules that matter
 * were asserted by their *consequences* (a drawer came out the right width) rather than directly.
 * Both are the kind that fail silently in one direction only.
 */

const noop = () => {
  return null;
};

const base = { id: 'template', render: noop } as const;

test.describe('buildModalOptions', () => {
  test('the caller’s structural style is merged over the template’s, not instead of it', () => {
    // The template's placement is what makes it that template; the sizing is the caller's. A
    // replace would silently unposition a drawer that only asked to be 380px wide.
    const built = buildModalOptions<void, unknown, string, DialogStyle, null>(
      { ...base, style: { width: '380px' } },
      { animation: DEFAULT_FADE_ANIMATION, style: { position: 'fixed', width: '100%' } }
    );

    expect(built.style).toEqual({ position: 'fixed', width: '380px' });
  });

  test('either side alone survives, and neither becomes an empty object', () => {
    const templateOnly = buildModalOptions<void, unknown, string, DialogStyle, null>(base, {
      animation: DEFAULT_FADE_ANIMATION,
      style: { position: 'fixed' },
    });
    expect(templateOnly.style).toEqual({ position: 'fixed' });

    const callerOnly = buildModalOptions<void, unknown, string, DialogStyle, null>(
      { ...base, style: { width: '10px' } },
      { animation: DEFAULT_FADE_ANIMATION }
    );
    expect(callerOnly.style).toEqual({ width: '10px' });

    const neither = buildModalOptions<void, unknown, string, DialogStyle, null>(base, {
      animation: DEFAULT_FADE_ANIMATION,
    });
    expect(neither.style).toBeUndefined();
  });

  test('the caller’s animation replaces the template’s outright', () => {
    // Unlike `style`, an animation is a whole: half of one and half of another is a modal that
    // enters and leaves by different rules.
    const custom = { entrance: { opacity: 1 }, exit: { opacity: 0 }, duration: 5 };
    const built = buildModalOptions<void, unknown, string, DialogStyle, null>(
      { ...base, animation: custom },
      { animation: DEFAULT_FADE_ANIMATION }
    );

    expect(built.animation).toBe(custom);
    expect(
      buildModalOptions<void, unknown, string, DialogStyle, null>(base, {
        animation: DEFAULT_FADE_ANIMATION,
      }).animation
    ).toBe(DEFAULT_FADE_ANIMATION);
  });

  test('the template names itself, and the caller has no way to rename it', () => {
    // `modalType` is how a cross-cutting listener tells one kind of dialog from another, so it is
    // the template's to state. `TemplateCommonOptions` is stated as a *complement* — it omits the
    // five keys a template owns — which is what makes the override below a compile error rather
    // than a runtime rule someone has to remember to enforce.
    const built = buildModalOptions<void, unknown, string, DialogStyle, null>(base, {
      animation: DEFAULT_FADE_ANIMATION,
      modalType: 'slide',
    });
    expect(built.modalType).toBe('slide');

    void buildModalOptions<void, unknown, string, DialogStyle, null>(
      // @ts-expect-error a template's options deliberately have no `modalType` to pass
      { ...base, modalType: 'something-else' },
      { animation: DEFAULT_FADE_ANIMATION, modalType: 'slide' }
    );
  });

  test('everything else is passed through untouched', () => {
    const onClose = () => {};
    const built = buildModalOptions<void, unknown, 'ok', DialogStyle, null>(
      { ...base, id: 'kept', ariaLabel: 'Kept', dismissKey: false, onClose },
      { animation: DEFAULT_FADE_ANIMATION }
    );

    expect(built).toMatchObject({ id: 'kept', ariaLabel: 'Kept', dismissKey: false, onClose });
  });
});

test.describe('DEFAULT_FADE_ANIMATION', () => {
  test('leaves faster than it arrives, and declares the property it transitions', () => {
    // The exit is shorter on purpose: a dialog that lingers on the way out reads as lag. The
    // property list matters because the close waits on *its* `transitionend`.
    expect(DEFAULT_FADE_ANIMATION.exitDuration).toBeLessThan(DEFAULT_FADE_ANIMATION.duration);
    expect(DEFAULT_FADE_ANIMATION.transitionProperty).toBe('opacity');
    expect(DEFAULT_FADE_ANIMATION.entrance).toEqual({ opacity: 1 });
    expect(DEFAULT_FADE_ANIMATION.exit).toEqual({ opacity: 0 });
  });
});
