import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  AsymmetricKeyframesHarness,
  NameTranslationHarness,
  UndefinedClearsHarness,
} from './apply-style.story';

// `applyStyle` — the one way the library writes a style object onto an element, and a root export
// userland may use. The clearing half is on trial: neither shipped animation exercises it (both
// keyframes carry the same properties), so a regression there surfaces only in a consumer's.

test.describe('applyStyle', () => {
  test('clears a property the next style no longer carries', async ({ mount, page }) => {
    await mount(<AsymmetricKeyframesHarness />);
    const target = page.getByTestId('target-el');

    await expect(target).toHaveCSS('opacity', '0');
    await expect(target).toHaveCSS('transform', 'matrix(0.5, 0, 0, 0.5, 0, 0)');

    await page.getByTestId('advance').click();

    await expect(target).toHaveCSS('opacity', '1');
    // Without the clear the element would be fully opaque and still scaled to half size.
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

    // A missed translation is silent: `setProperty` ignores an unknown name, the value stays put.
    await expect(target).toHaveCSS('margin-inline-start', '7px');

    // `webkitMaskImage` hyphenates to `webkit-mask-image`, not a property — the dash goes back.
    await expect(target).toHaveCSS(
      '-webkit-mask-image',
      'linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0))'
    );

    // Passed through untouched, so `--dialog-backdrop` uses the same door as everything else.
    const custom = await target.evaluate((element) => {
      return getComputedStyle(element).getPropertyValue('--probe-token').trim();
    });
    expect(custom).toBe('9px');
  });
});
