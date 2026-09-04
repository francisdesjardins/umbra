import { expect, test } from '@playwright/test';
import { noop } from '../../__tests__/noop.js';
import {
  DEFAULT_FADE_ANIMATION,
  buildDialogOptions,
  messageDialogOptions,
  slideDialogOptions,
} from '../shared.js';
import type { DialogStyle } from '../../core/style.js';
import type { SlideDirection } from '../slide-geometry.js';
import type { BaseRenderContext, SlideDialogRenderContext } from '../shared.js';

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

// The two mappings the four template hooks now share. Each binding calls one of them and adds only
// its node type, so a defect here is a defect in both bindings at once — and the component suites
// that would catch it run one binding each.

test.describe('messageDialogOptions', () => {
  test('names itself and fades, unless the caller brought an animation', () => {
    const built = messageDialogOptions<void, string, DialogStyle, null>(base);

    expect(built.template).toBe('message');
    expect(built.animation).toBe(DEFAULT_FADE_ANIMATION);

    const custom = { entrance: { opacity: 1 }, exit: { opacity: 0 } };
    expect(
      messageDialogOptions<void, string, DialogStyle, null>({ ...base, animation: custom })
        .animation
    ).toBe(custom);
  });

  test('the render callback is forwarded, not replaced', () => {
    // The mapping restates `render` to retype its argument against the template's context, so it is
    // an easy line to drop: `buildDialogOptions` already spread one in, and the dialog would draw
    // with the untyped copy while every test above still passed.
    const seen: string[] = [];
    const built = messageDialogOptions<void, string, DialogStyle, null>({
      ...base,
      render: (ctx) => {
        seen.push(ctx.phase);
        return null;
      },
    });

    built.render({ phase: 'open' } as never);
    expect(seen).toEqual(['open']);
  });

  test('it sets no style of its own, so a caller’s survives whole', () => {
    // The fade is the only opinion: a message dialog is sized by whoever renders into it.
    expect(messageDialogOptions<void, string, DialogStyle, null>(base).style).toBeUndefined();
    expect(
      messageDialogOptions<void, string, DialogStyle, null>({ ...base, style: { width: '20rem' } })
        .style
    ).toEqual({ width: '20rem' });
  });
});

test.describe('slideDialogOptions', () => {
  const slideBase = { ...base, direction: 'right' } as const;

  /** The React half of the one line the two bindings disagree about. */
  const spread = (
    args: BaseRenderContext,
    extra: { readonly direction: SlideDirection }
  ): SlideDialogRenderContext => {
    return { ...args, ...extra };
  };

  test('the geometry answers the direction, and the wrapper is always clipped', () => {
    const built = slideDialogOptions<void, string, DialogStyle, null>(slideBase, spread);

    expect(built.template).toBe('slide');
    // A panel translating past its container edge would otherwise widen the document.
    expect(built.clipContainer).toBe(true);
    expect(built.animation).toMatchObject({ entrance: { transform: 'translateX(0)' } });
    expect(built.style).toMatchObject({ right: 0 });
  });

  test('align defaults to stretch, and a caller’s style still merges over the geometry', () => {
    const stretched = slideDialogOptions<void, string, DialogStyle, null>(slideBase, spread);
    const pinned = slideDialogOptions<void, string, DialogStyle, null>(
      { ...slideBase, align: 'center' },
      spread
    );
    expect(stretched.style).not.toEqual(pinned.style);

    const sized = slideDialogOptions<void, string, DialogStyle, null>(
      { ...slideBase, style: { width: '380px' } },
      spread
    );
    // The placement makes it a slide; the width is the caller's.
    expect(sized.style).toMatchObject({ right: 0, width: '380px' });
  });

  test('a contained panel positions absolute, a portaled one fixed', () => {
    // `isContainedArrangement` is asked rather than re-derived — and only the non-modal, non-portal
    // arrangement is contained, so both halves are needed to prove the mapping consults it.
    const contained = slideDialogOptions<void, string, DialogStyle, null>(
      { ...slideBase, nonModal: true },
      spread
    );
    const portaled = slideDialogOptions<void, string, DialogStyle, null>(
      { ...slideBase, nonModal: true, portal: true },
      spread
    );

    expect(contained.style).toMatchObject({ position: 'absolute' });
    expect(portaled.style).toMatchObject({ position: 'fixed' });
  });

  test('the direction reaches the render context through the merger, not a spread here', () => {
    // The one parameter, because Solid must merge with `mergeProps` to keep the args' getters live.
    const seen: unknown[] = [];
    const built = slideDialogOptions<void, string, DialogStyle, null>(
      {
        ...slideBase,
        render: (ctx) => {
          seen.push(ctx.direction);
          return null;
        },
      },
      spread
    );

    built.render({} as never);
    expect(seen).toEqual(['right']);
  });
});
