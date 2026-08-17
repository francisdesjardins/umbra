import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { NonModalCloseRestoreHarness } from './non-modal-close-focus.story.js';

// Where the keyboard goes when a non-modal panel closes — a platform measurement. The close steps
// restore the previously focused element for `show()` too, but only when focus is still inside the
// dialog at close time. The library adds nothing here; the matrix cites this as the measurement.

const PANEL = 'dialog[data-modal-id="nonmodal-close-restore"]';

async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active?.getAttribute('data-testid') ?? active?.tagName ?? 'none';
  });
}

test.describe('closing a non-modal panel', () => {
  test('hands the keyboard back to the trigger that opened it', async ({ mount, page }) => {
    const component = await mount(<NonModalCloseRestoreHarness closeVia="handle" />);

    // Open from the keyboard, so the trigger is the focused element `show()` records.
    await component.getByTestId('trigger').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(PANEL)).toBeVisible();

    // The spec's condition for the restore: focus still inside the dialog at close time.
    await page.getByTestId('panel-close').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(PANEL)).not.toBeVisible();

    expect(await focused(page)).toBe('trigger');
  });

  test('still hands it back when an action closed it', async ({ mount, page }) => {
    // The path that loses the platform's restore: the button is `disabled` while its action
    // settles, Chromium blurs a disabled element, and by `close()` the keyboard is on `<body>` —
    // outside the dialog, so the condition fails. Red on Chromium, green on Firefox and WebKit.
    const component = await mount(<NonModalCloseRestoreHarness closeVia="action" />);

    await component.getByTestId('trigger').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('panel-close').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(PANEL)).not.toBeVisible();

    expect(await focused(page)).toBe('trigger');
  });
});
