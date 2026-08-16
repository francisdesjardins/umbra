import { expect, test } from '@playwright/test';
import { dialogPlacement } from '../../core/placement.js';
import type { ModalAnimation } from '../../core/types.js';
import {
  DEFAULT_DURATION,
  DEFAULT_TRANSITION_PROPERTY,
  getDialogAnimationStyles,
  getPrimaryTransitionProperty,
  resolveAnimation,
} from '../animation-utils.js';

const baseAnimation: ModalAnimation = {
  entrance: { opacity: 1, transform: 'scale(1)' },
  exit: { opacity: 0, transform: 'scale(0.95)' },
  duration: 200,
  exitDuration: 150,
  transitionProperty: 'opacity, transform',
};

test.describe('getPrimaryTransitionProperty', () => {
  test('returns a single property unchanged', () => {
    expect(getPrimaryTransitionProperty('opacity')).toBe('opacity');
  });

  test('returns the first value from a comma-separated list', () => {
    expect(getPrimaryTransitionProperty('opacity, transform')).toBe('opacity');
  });

  test('trims leading whitespace from the first value', () => {
    expect(getPrimaryTransitionProperty('  transform,  opacity')).toBe('transform');
  });
});

test.describe('resolveAnimation', () => {
  test('passes through every explicitly set field', () => {
    expect(resolveAnimation(baseAnimation)).toEqual({
      entranceDuration: 200,
      exitDuration: 150,
      transitionProperty: 'opacity, transform',
      primaryProperty: 'opacity',
    });
  });

  test('defaults duration and transitionProperty when omitted', () => {
    const anim: ModalAnimation = { entrance: { opacity: 1 }, exit: { opacity: 0 } };
    const resolved = resolveAnimation(anim);
    expect(resolved.entranceDuration).toBe(DEFAULT_DURATION);
    expect(resolved.transitionProperty).toBe(DEFAULT_TRANSITION_PROPERTY);
    expect(resolved.primaryProperty).toBe(DEFAULT_TRANSITION_PROPERTY);
  });

  test('exitDuration falls back to the entrance duration', () => {
    const resolved = resolveAnimation({ ...baseAnimation, exitDuration: undefined });
    expect(resolved.exitDuration).toBe(200);
  });

  test('exitDuration of 0 is honoured, not treated as absent', () => {
    expect(resolveAnimation({ ...baseAnimation, exitDuration: 0 }).exitDuration).toBe(0);
  });

  test('primaryProperty is the first entry of a comma-separated list', () => {
    const resolved = resolveAnimation({
      ...baseAnimation,
      transitionProperty: 'transform, opacity',
    });
    expect(resolved.primaryProperty).toBe('transform');
  });

  test('agrees with the transition the style builder emits', () => {
    // The exit listener waits on `primaryProperty` for `exitDuration`; both must
    // match the inline `transition` actually applied to the <dialog>, or the
    // close never finalizes until the fallback timeout fires.
    const anim: ModalAnimation = { entrance: { opacity: 1 }, exit: { opacity: 0 } };
    const { primaryProperty, exitDuration } = resolveAnimation(anim);
    const transition = String(getDialogAnimationStyles('closing', { animation: anim }).transition);
    expect(transition).toBe(`${primaryProperty} ${String(exitDuration)}ms ease-out`);
  });
});

test.describe('getDialogAnimationStyles', () => {
  test('includes base dialog reset styles', () => {
    const styles = getDialogAnimationStyles('closing', { animation: baseAnimation });
    expect(styles.margin).toBe('auto');
    expect(styles.padding).toBe(0);
    expect(styles.border).toBe('none');
    expect(styles.background).toBe('transparent');
  });

  test('applies entrance CSS while open', () => {
    const styles = getDialogAnimationStyles('open', { animation: baseAnimation });
    expect(styles.opacity).toBe(1);
    expect(styles.transform).toBe('scale(1)');
  });

  test('applies exit CSS while closing', () => {
    const styles = getDialogAnimationStyles('closing', { animation: baseAnimation });
    expect(styles.opacity).toBe(0);
    expect(styles.transform).toBe('scale(0.95)');
  });

  test('uses entrance duration during entrance', () => {
    const styles = getDialogAnimationStyles('open', { animation: baseAnimation });
    expect(styles.transition).toContain('200ms');
  });

  test('uses exitDuration during exit', () => {
    const styles = getDialogAnimationStyles('closing', { animation: baseAnimation });
    expect(styles.transition).toContain('150ms');
  });

  test('each property in a comma-separated list receives the duration', () => {
    // "opacity, transform" must expand to "opacity 150ms ease-out, transform 150ms ease-out"
    // so that every property fires transitionend — a bare "opacity," prefix yields 0s duration
    // for opacity which never fires transitionend, causing the animation fallback timeout.
    const styles = getDialogAnimationStyles('closing', { animation: baseAnimation });
    const transition = String(styles.transition);
    expect(transition).toBe('opacity 150ms ease-out, transform 150ms ease-out');
  });

  test('falls back to duration when exitDuration is omitted', () => {
    const anim: ModalAnimation = { ...baseAnimation, exitDuration: undefined };
    const styles = getDialogAnimationStyles('closing', { animation: anim });
    expect(styles.transition).toContain('200ms');
  });

  test('defaults transitionProperty to "opacity" when not set', () => {
    const anim: ModalAnimation = { entrance: { opacity: 1 }, exit: { opacity: 0 } };
    const styles = getDialogAnimationStyles('closing', { animation: anim });
    expect(String(styles.transition)).toContain('opacity');
  });

  test('defaults duration to 200ms when not set', () => {
    const anim: ModalAnimation = { entrance: { opacity: 1 }, exit: { opacity: 0 } };
    const styles = getDialogAnimationStyles('open', { animation: anim });
    expect(styles.transition).toContain('200ms');
  });

  test('merges custom styles', () => {
    const styles = getDialogAnimationStyles('closing', {
      animation: baseAnimation,
      customStyle: { color: 'red' },
    });
    expect(styles.color).toBe('red');
  });

  test('animation styles override custom styles for the same property', () => {
    // customStyle sets opacity: 0.5 but exit animation applies opacity: 0 last
    const styles = getDialogAnimationStyles('closing', {
      animation: baseAnimation,
      customStyle: { opacity: 0.5 },
    });
    expect(styles.opacity).toBe(0);
  });

  test('applies the placement it is handed, and none of its own', () => {
    const portaled = getDialogAnimationStyles('closing', {
      animation: baseAnimation,
      placement: dialogPlacement({ nonModal: true, portal: true }),
    });
    expect(portaled.position).toBe('fixed');

    const contained = getDialogAnimationStyles('closing', {
      animation: baseAnimation,
      placement: dialogPlacement({ nonModal: true }),
    });
    expect(contained.position).toBe('absolute');

    // A modal dialog is placed by the top layer — nothing here may position it.
    expect(
      getDialogAnimationStyles('closing', { animation: baseAnimation }).position
    ).toBeUndefined();
  });

  test('a closed dialog is out of layout, whatever else it was given', () => {
    // The inline `display: flex` outranks the UA's `dialog:not([open]) { display: none }`, so
    // without this a closed contained dialog stays a full-region, invisible hit target.
    const closed = getDialogAnimationStyles('closed', {
      animation: baseAnimation,
      customStyle: { width: 200 },
      placement: dialogPlacement({ nonModal: true }),
    });
    expect(closed.display).toBe('none');
    expect(getDialogAnimationStyles('open', { animation: baseAnimation }).display).toBe('flex');
    expect(getDialogAnimationStyles('closing', { animation: baseAnimation }).display).toBe('flex');
  });

  test('a custom style wins over the placement it would fight', () => {
    // Template styles are merged after the placement on purpose: a template that wants to
    // place the dialog itself (a slide panel pinning one edge) has to be able to.
    const styles = getDialogAnimationStyles('closing', {
      animation: baseAnimation,
      customStyle: { position: 'static' },
      placement: dialogPlacement({ nonModal: true, portal: true }),
    });
    expect(styles.position).toBe('static');
  });
});
