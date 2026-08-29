import { expect, test } from '../../__tests__/ct-coverage.js';
import { SilentExitHarness, ThrowingCloseHarness } from './close-failure.story.js';

// A caller's failing `onClose` is not the dialog's problem, and it is not the dialog's to hide
// either: it runs detached, so `onError` is the only place it can surface.

test.describe('an onClose that throws', () => {
  test('is reported through onError, and the close still completes', async ({ mount, page }) => {
    await mount(<ThrowingCloseHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('visible')).toHaveText('open');

    await page.getByTestId('close').click();

    await expect(page.getByTestId('failure')).toHaveText('onClose:onClose exploded');
    await expect(page.getByTestId('visible')).toHaveText('closed');
  });
});

test.describe('an exit transition that never fires', () => {
  test('is finished by the safety timer rather than left on screen', async ({ mount, page }) => {
    // Two clocks, not one: the style write and the recalculation that starts the transition are
    // separate, so the timer is armed here and re-armed from `transitionstart`. With no transition
    // at all there is no second arming, and this is the only thing that closes the dialog.
    await mount(<SilentExitHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('visible')).toHaveText('open');

    await page.getByTestId('close').click();

    await expect(page.getByTestId('visible')).toHaveText('closed');
    // The element stays; what the timer had to settle is whether it is still open.
    expect(
      await page.locator('dialog[data-dialog-id="silent-exit"]').evaluate((node) => {
        return (node as HTMLDialogElement).open;
      })
    ).toBe(false);
  });
});
