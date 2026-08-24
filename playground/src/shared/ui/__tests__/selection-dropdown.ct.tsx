import { expect, test } from '@playwright/experimental-ct-react';
import { SelectionDropdownHarness } from './selection-dropdown.story';

/**
 * `SelectionDropdown` — the one assertion the browser cannot make for itself. `appearance: none`
 * takes the control out of the UA's themed painting and Chrome canvases the option popup with the
 * select's own background-color, so a transparent one renders the popup white — in dark mode, the
 * labels are then white on white and the popup is unreadable. Nothing in the DOM looks wrong; the
 * popup is not in the page. Asserting both halves are opaque is what catches the return of it.
 */

const OPAQUE = /^rgb\(\d+, \d+, \d+\)$/;

for (const scheme of ['light', 'dark'] as const) {
  test(`the control paints an opaque background in ${scheme} mode`, async ({ mount }) => {
    const c = await mount(<SelectionDropdownHarness scheme={scheme} />);

    await expect(c.getByTestId('dropdown')).toHaveCSS('background-color', OPAQUE);
  });

  test(`its options paint one too in ${scheme} mode`, async ({ mount, page }) => {
    await mount(<SelectionDropdownHarness scheme={scheme} />);

    // Not `toHaveCSS` — an <option> is not a visible box, so the locator never settles.
    const background = await page
      .locator('option')
      .first()
      .evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

    expect(background).toMatch(OPAQUE);
  });
}

test('the two schemes do not paint the same background', async ({ mount, page }) => {
  // A token that failed to resolve falls back identically in both, which every assertion above
  // would still pass. One mount, because a second into the same container is refused.
  await mount(<SelectionDropdownHarness scheme="light" />);
  const select = page.locator('select');
  const read = (scheme: 'light' | 'dark') => {
    return select.evaluate((el, mode) => {
      document.documentElement.setAttribute('data-color-scheme', mode);
      return window.getComputedStyle(el).backgroundColor;
    }, scheme);
  };

  expect(await read('light')).not.toBe(await read('dark'));
});
