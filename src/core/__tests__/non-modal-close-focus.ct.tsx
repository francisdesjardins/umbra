import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { NonModalCloseRestoreHarness } from './non-modal-close-focus.story.js';

/**
 * Where the keyboard goes when a non-modal panel closes — a platform measurement.
 *
 * `showModal()`'s focus restore on close is well known; `show()`'s is not: the close-the-dialog
 * steps restore the previously focused element for both, but only when focus is still inside the
 * dialog at close time. The APG dialog pattern requires the return, the library adds nothing of
 * its own on this path, and the compatibility matrix cites this test as the measurement.
 */

const PANEL = 'dialog[data-modal-id="nonmodal-close-restore"]';

/** What has focus, by test id — or the tag, for anything that has none. */
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

    // Focus a control inside, the way a user who is about to close the panel holds one — the
    // spec's condition for the restore is that focus is still in the dialog at close time.
    await page.getByTestId('panel-close').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(PANEL)).not.toBeVisible();

    expect(await focused(page)).toBe('trigger');
  });

  test('still hands it back when an action closed it', async ({ mount, page }) => {
    // The path that loses the platform's restore without help: the button is `disabled` while its
    // action settles, Chromium blurs a disabled element, and by `close()` time the keyboard is on
    // `<body>` — outside the dialog, so the spec's condition fails and focus stays stranded.
    // Measured red on Chromium and green on Firefox and WebKit before the floor; the floor is
    // what makes it one answer on all three.
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
