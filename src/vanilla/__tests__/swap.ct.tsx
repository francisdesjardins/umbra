import { expect, test } from '../../__tests__/ct-coverage.js';
import { VanillaSwapHarness } from './swap.story.js';

/**
 * `umbra/vanilla` over markup somebody else replaces — the hypermedia case, and the one arrangement
 * where the library's usual assumption fails: a renderer tells it when a dialog goes, and a fragment
 * swap tells it nothing. The controller closes over the element it was handed, so the swap leaves it
 * driving a node that is no longer in the document.
 *
 * There is nothing to detect here and deliberately no attempt to: an observer per dialog would be
 * every consumer paying for one integration style, and the caller doing the swapping is the one
 * thing that already knows it happened. What these pin is that the pair it must run — `destroy()`
 * then bind again — puts everything back, and that skipping it fails the way the docs say.
 */
test.describe('a dialog whose markup is swapped underneath it', () => {
  test('the controller drives the element it was handed, not the one on screen', async ({
    mount,
    page,
  }) => {
    await mount(<VanillaSwapHarness />);
    await expect(page.getByTestId('swap-binds')).toHaveText('1');

    await page.getByTestId('swap-naive').click();
    await expect(page.getByTestId('swap-current')).toHaveText('second fragment');

    // What arrived is a plain `<dialog>`: the library's own attributes are written at bind time, so
    // their absence is the swap's signature and the cheapest thing a caller can assert against.
    const onScreen = page.locator('[data-testid="swap-host"] dialog');
    await expect(onScreen).toHaveCount(1);
    await expect(onScreen).not.toHaveAttribute('data-modal-id', 'vanilla-swap');

    // The controller answers, to the node it was handed — which is no longer in the document, so
    // nothing on screen opens and the caller is left with a dialog that cannot be driven at all.
    await page.getByTestId('swap-open').click();
    await expect(onScreen).not.toHaveAttribute('open', '');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test('destroy and bind again restores it over the fragment that arrived', async ({
    mount,
    page,
  }) => {
    await mount(<VanillaSwapHarness />);

    await page.getByTestId('swap-rebind').click();
    await expect(page.getByTestId('swap-binds')).toHaveText('2');
    await expect(page.getByTestId('swap-current')).toHaveText('second fragment');

    // The new element opens, reports its phase, and its action closes it — the whole surface, over
    // markup the first controller never saw.
    await page.getByTestId('swap-open').click();
    await expect(page.getByTestId('modal-vanilla-swap')).toHaveAttribute('open', '');
    await expect(page.getByTestId('swap-phase')).toHaveText('open');

    await page.getByTestId('swap-ok').click();
    await expect(page.getByTestId('swap-phase')).toHaveText('closed');
  });

  /**
   * The registry is the half a leak would show in: `destroy()` unregisters, so rebinding the same id
   * leaves one dialog registered rather than two — which is what stops a swapped-away dialog from
   * being ordered in the stack, or opened by id, forever after.
   */
  test('the retired controller leaves nothing behind in the registry', async ({ mount, page }) => {
    await mount(<VanillaSwapHarness />);
    await expect(page.getByTestId('swap-registered')).toHaveText('1');

    await page.getByTestId('swap-rebind').click();
    await expect(page.getByTestId('swap-registered')).toHaveText('1');
  });
});
