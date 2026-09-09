import { expect, test } from '../../__tests__/ct-coverage.js';

const DIALOG = 'dialog[data-dialog-id="modality-switch"]';

/**
 * What `nonModal` does when it changes under a dialog that is already open.
 *
 * It is read once per open, and the answer is a teardown: the two variants render different trees —
 * a contained panel sits in a library-owned wrapper, a modal one does not — and only `showModal()`
 * enters the top layer, which an open element cannot be asked for twice. So the dialog closes
 * rather than switching. Coherent, and nothing said so or held it: a refactor that stopped the
 * close would leave the element non-modal while the dismiss handling had already swapped to the
 * modal path, and Escape would answer to nobody.
 */
test.describe('nonModal changed on an open dialog', () => {
  test('a non-modal dialog answers the dismiss key', async ({ mount, page }) => {
    // The baseline the case below is measured against — without it, "closed" proves nothing.
    await mount('ModalitySwitchHarness');
    await page.getByRole('button', { name: 'Open Switch' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('closes')).toHaveText('dismiss');
  });

  test('flipping the option closes the dialog rather than switching it', async ({
    mount,
    page,
  }) => {
    await mount('ModalitySwitchHarness');
    await page.getByRole('button', { name: 'Open Switch' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.locator(DIALOG)).toHaveAttribute('data-dialog-type', 'non-modal');

    await page.getByTestId('flip').click();

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    // The attribute follows the flag while the element does not follow the attribute: the table is
    // rendered, the modality is not, and this is the pair that documents the difference.
    await expect(page.locator(DIALOG)).toHaveAttribute('data-dialog-type', 'dialog');
    expect(
      await page.locator(DIALOG).evaluate((node) => {
        return (node as HTMLDialogElement).open;
      })
    ).toBe(false);

    // Reported as a teardown, which is what `DismissReason` already covers, and settled **once**:
    // an owner waiting on the close is answered rather than stranded.
    await expect(page.getByTestId('closes')).toHaveText('dismiss');
    await expect(page.getByTestId('settled')).toHaveText('settled:dismiss');

    // And nothing lingers: the dismiss key finds no dialog, so no second close is reported.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('closes')).toHaveText('dismiss');
  });
});
