import { expect, test } from '@playwright/test';
import { noop } from '../../__tests__/noop.js';
import { DEFAULT_FADE_ANIMATION, buildDialogOptions } from '../shared.js';
import type { DialogStyle } from '../../core/style.js';

// The option mapping every template hook runs through — four of them, across two bindings. Both
// rules that matter fail silently in one direction only, so they are asserted here directly.

/** A `render` that draws nothing — a node is required, so this is not the shared `noop`. */
const renderNothing = () => {
  return null;
};

const base = { id: 'template', render: renderNothing } as const;

test.describe('buildDialogOptions', () => {
  test('the caller’s structural style is merged over the template’s, not instead of it', () => {
    // The template's placement makes it that template; a replace would unposition a 380px drawer.
    const built = buildDialogOptions<void, unknown, string, DialogStyle, null>(
      { ...base, style: { width: '380px' } },
      { animation: DEFAULT_FADE_ANIMATION, style: { position: 'fixed', width: '100%' } }
    );

    expect(built.style).toEqual({ position: 'fixed', width: '380px' });
  });

  test('either side alone survives, and neither becomes an empty object', () => {
    const templateOnly = buildDialogOptions<void, unknown, string, DialogStyle, null>(base, {
      animation: DEFAULT_FADE_ANIMATION,
      style: { position: 'fixed' },
    });
    expect(templateOnly.style).toEqual({ position: 'fixed' });

    const callerOnly = buildDialogOptions<void, unknown, string, DialogStyle, null>(
      { ...base, style: { width: '10px' } },
      { animation: DEFAULT_FADE_ANIMATION }
    );
    expect(callerOnly.style).toEqual({ width: '10px' });

    const neither = buildDialogOptions<void, unknown, string, DialogStyle, null>(base, {
      animation: DEFAULT_FADE_ANIMATION,
    });
    expect(neither.style).toBeUndefined();
  });

  test('the caller’s animation replaces the template’s outright', () => {
    // An animation is a whole: half of one and half of another enters and leaves by two rules.
    const custom = { entrance: { opacity: 1 }, exit: { opacity: 0 }, duration: 5 };
    const built = buildDialogOptions<void, unknown, string, DialogStyle, null>(
      { ...base, animation: custom },
      { animation: DEFAULT_FADE_ANIMATION }
    );

    expect(built.animation).toBe(custom);
    expect(
      buildDialogOptions<void, unknown, string, DialogStyle, null>(base, {
        animation: DEFAULT_FADE_ANIMATION,
      }).animation
    ).toBe(DEFAULT_FADE_ANIMATION);
  });

  test('the template names itself, and the caller has no way to rename it', () => {
    // `template` tells a cross-cutting listener one kind of dialog from another, so it is the
    // template's to state — `TemplateCommonOptions` omits it, making the override a compile error.
    const built = buildDialogOptions<void, unknown, string, DialogStyle, null>(base, {
      animation: DEFAULT_FADE_ANIMATION,
      template: 'slide',
    });
    expect(built.template).toBe('slide');

    void buildDialogOptions<void, unknown, string, DialogStyle, null>(
      // @ts-expect-error a template's options deliberately have no `template` to pass
      { ...base, template: 'something-else' },
      { animation: DEFAULT_FADE_ANIMATION, template: 'slide' }
    );
  });

  test('everything else is passed through untouched', () => {
    const onClose = noop;
    const built = buildDialogOptions<void, unknown, 'ok', DialogStyle, null>(
      { ...base, id: 'kept', ariaLabel: 'Kept', dismissKey: false, onClose },
      { animation: DEFAULT_FADE_ANIMATION }
    );

    expect(built).toMatchObject({ id: 'kept', ariaLabel: 'Kept', dismissKey: false, onClose });
  });
});

test.describe('DEFAULT_FADE_ANIMATION', () => {
  test('leaves faster than it arrives, and declares the property it transitions', () => {
    // A dialog that lingers on the way out reads as lag; the close waits on the listed property.
    expect(DEFAULT_FADE_ANIMATION.exitDuration).toBeLessThan(DEFAULT_FADE_ANIMATION.duration);
    expect(DEFAULT_FADE_ANIMATION.transitionProperty).toBe('opacity');
    expect(DEFAULT_FADE_ANIMATION.entrance).toEqual({ opacity: 1 });
    expect(DEFAULT_FADE_ANIMATION.exit).toEqual({ opacity: 0 });
  });
});
