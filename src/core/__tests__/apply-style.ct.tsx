import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  AsymmetricKeyframesHarness,
  NameTranslationHarness,
  UndefinedClearsHarness,
} from './apply-style.story';

/**
 * `applyStyle` — the one way the library writes a style object onto an element, and a root export
 * a userland connector is invited to use.
 *
 * The clearing half is what is really on trial. Neither shipped animation exercises it (both
 * keyframes of the default fade and of every slide carry the same properties), so a regression
 * there would pass the whole suite and only surface in a consumer's asymmetric animation.
 */

test.describe('applyStyle', () => {
  test('clears a property the next style no longer carries', async ({ mount, page }) => {
    await mount(<AsymmetricKeyframesHarness />);
    const target = page.getByTestId('target-el');

    await expect(target).toHaveCSS('opacity', '0');
    await expect(target).toHaveCSS('transform', 'matrix(0.5, 0, 0, 0.5, 0, 0)');

    await page.getByTestId('advance').click();

    await expect(target).toHaveCSS('opacity', '1');
    // The point of the whole function: without the clear, the element would be fully opaque and
    // still scaled to half size.
    await expect(target).toHaveCSS('transform', 'none');
  });

  test('an explicit undefined removes rather than writing "undefined"', async ({ mount, page }) => {
    await mount(<UndefinedClearsHarness />);
    const target = page.getByTestId('target-el');

    await expect(target).toHaveCSS('opacity', '0.25');

    await page.getByTestId('advance').click();

    await expect(target).toHaveCSS('opacity', '1');
    await expect(target).toHaveCSS('position', 'absolute');
  });

  test('translates camelCase, vendor prefixes and custom properties', async ({ mount, page }) => {
    await mount(<NameTranslationHarness />);
    const target = page.getByTestId('target-el');

    // `marginInlineStart` → `margin-inline-start`. A missed translation is silent: `setProperty`
    // ignores a name it does not know, and the computed value stays at its initial.
    await expect(target).toHaveCSS('margin-inline-start', '7px');

    // `webkitMaskImage` hyphenates to `webkit-mask-image`, which is not a property — the leading
    // dash has to be put back.
    await expect(target).toHaveCSS(
      '-webkit-mask-image',
      'linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0))'
    );

    // A custom property is passed through untouched, so `--dialog-backdrop` and friends can be
    // set through the same door as everything else.
    const custom = await target.evaluate((element) => {
      return getComputedStyle(element).getPropertyValue('--probe-token').trim();
    });
    expect(custom).toBe('9px');
  });
});
