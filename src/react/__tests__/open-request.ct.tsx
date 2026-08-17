import { expect, test } from '../../__tests__/ct-coverage.js';
import { RefusesEverythingHarness, OpenRequestHarness } from './open-request.story';

/**
 * `onOpenRequest` in the browser: the owner's own state decides, nothing reaches the screen unless
 * it agrees, and its own `open()` is unaffected by having declared a handler.
 */

/** Long enough for an open to have happened, so "still closed" is an observation, not a race. */
const SETTLED_MS = 400;

test.describe('a dialog asked to open by someone else', () => {
  test('accepts, and the payload reaches its state before the dialog is on screen', async ({
    mount,
  }) => {
    const component = await mount(<OpenRequestHarness />);

    await component.getByTestId('ask-valid').click();

    await expect(component.getByTestId('trail')).toHaveText('acceptée (mfa1)');
    await expect(component.getByTestId('phase')).toHaveText('open');
    // Set by the handler before it opened: the dialog renders once with the data, not empty.
    await expect(component.getByTestId('accepted')).toHaveText('42');
  });

  test('refuses a payload it does not recognise, and nothing moves', async ({ mount, page }) => {
    // The owner's schema is the boundary, and the refusal is what makes the door safe to expose.
    const component = await mount(<OpenRequestHarness />);

    await component.getByTestId('ask-invalid').click();
    await component.page().waitForTimeout(SETTLED_MS);

    await expect(component.getByTestId('trail')).toHaveText('refusée (mfa1)');
    await expect(component.getByTestId('phase')).toHaveText('closed');
    await expect(page.locator('dialog[data-modal-id="asked"]')).toBeHidden();
  });

  test('its own `open()` does not go through the handler', async ({ mount, page }) => {
    // The loop to avoid: if a handler made every open a request, accepting would recurse forever.
    const component = await mount(<OpenRequestHarness />);

    await component.getByTestId('own-open').click();

    await expect(page.locator('dialog[data-modal-id="asked"]')).toBeVisible();
    await expect(component.getByTestId('trail')).toHaveText('');
  });

  test('`dialogManager.open(id)` still instructs, handler or not', async ({ mount, page }) => {
    const component = await mount(<OpenRequestHarness />);

    await component.getByTestId('instruct').click();

    await expect(page.locator('dialog[data-modal-id="asked"]')).toBeVisible();
    await expect(component.getByTestId('trail')).toHaveText('');
  });
});

test.describe('a dialog that declared no handler', () => {
  test('refuses every request', async ({ mount }) => {
    const component = await mount(<RefusesEverythingHarness />);

    await component.getByTestId('ask').click();
    await component.page().waitForTimeout(SETTLED_MS);

    await expect(component.getByTestId('phase')).toHaveText('closed');
  });

  test('and still opens when instructed', async ({ mount, page }) => {
    const component = await mount(<RefusesEverythingHarness />);

    await component.getByTestId('instruct').click();

    await expect(page.locator('dialog[data-modal-id="unasked"]')).toBeVisible();
  });
});
