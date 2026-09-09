import { expect, test } from '../../__tests__/ct-coverage.js';

/**
 * Changing `nonModal` under a dialog that is already open answers the open — exactly once.
 *
 * The option is read once per open: today the change is a teardown, since the two variants render
 * different trees and the top layer is enterable only through a `showModal()` an open element
 * cannot be asked for twice. That mechanism is stated in the `nonModal` row of the compatibility
 * matrix, which is where a fact about how the library behaves belongs. What is held here is the
 * narrower property that outlives it: whatever the change does to the element, an owner waiting on
 * the close is answered and not left holding a promise nothing settles.
 */
test.describe('nonModal changed on an open dialog', () => {
  test('answers the open exactly once', async ({ mount, page }) => {
    await mount('ModalitySwitchHarness');
    await page.getByRole('button', { name: 'Open Switch' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('flip').click();

    // Both halves of "once": the callback ran, and the promise `openAndWait` handed back settled
    // with the same answer rather than hanging.
    await expect(page.getByTestId('closes')).toHaveText('dismiss');
    await expect(page.getByTestId('settled')).toHaveText('settled:dismiss');

    // And nothing lingers to report a second time.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('closes')).toHaveText('dismiss');
  });
});
