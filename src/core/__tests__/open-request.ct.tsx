import { expect, test } from '@playwright/experimental-ct-react';
import { DeclinesEverythingHarness, OpenRequestHarness } from './open-request.story';

/**
 * `onOpenRequest` through the React binding.
 *
 * The unit suite next door proves the registry routes and moves nothing. What only a browser can
 * show is the part that matters to a call site: the owner's own state is what decides, the request
 * never reaches the screen unless it agrees, and its own `open()` is not affected by having
 * declared a handler.
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
    // Set by the handler before it opened, which is the ordering a caller depends on: the dialog
    // renders once, with the data, rather than opening empty and filling in.
    await expect(component.getByTestId('accepted')).toHaveText('42');
  });

  test('declines a payload it does not recognise, and nothing moves', async ({ mount, page }) => {
    // The owner's schema is the boundary. A request that fails it is logged and dropped — this is
    // the case that makes exposing the door safe at all.
    const component = await mount(<OpenRequestHarness />);

    await component.getByTestId('ask-invalid').click();
    await component.page().waitForTimeout(SETTLED_MS);

    await expect(component.getByTestId('trail')).toHaveText('refusée (mfa1)');
    await expect(component.getByTestId('phase')).toHaveText('closed');
    await expect(page.locator('dialog[data-modal-id="asked"]')).toBeHidden();
  });

  test('its own `open()` does not go through the handler', async ({ mount, page }) => {
    // The loop this design has to avoid: if declaring a handler made every open a request, a
    // dialog accepting by calling `open()` would ask itself forever.
    const component = await mount(<OpenRequestHarness />);

    await component.getByTestId('own-open').click();

    await expect(page.locator('dialog[data-modal-id="asked"]')).toBeVisible();
    await expect(component.getByTestId('trail')).toHaveText('');
  });

  test('`dialogManager.open(id)` still instructs, handler or not', async ({ mount, page }) => {
    // The blunt door is unchanged. Every imperative open already in the fleet keeps meaning what
    // it meant — which is what makes this addition safe to land.
    const component = await mount(<OpenRequestHarness />);

    await component.getByTestId('instruct').click();

    await expect(page.locator('dialog[data-modal-id="asked"]')).toBeVisible();
    await expect(component.getByTestId('trail')).toHaveText('');
  });
});

test.describe('a dialog that declared no handler', () => {
  test('declines every request', async ({ mount }) => {
    const component = await mount(<DeclinesEverythingHarness />);

    await component.getByTestId('ask').click();
    await component.page().waitForTimeout(SETTLED_MS);

    await expect(component.getByTestId('phase')).toHaveText('closed');
  });

  test('and still opens when instructed', async ({ mount, page }) => {
    const component = await mount(<DeclinesEverythingHarness />);

    await component.getByTestId('instruct').click();

    await expect(page.locator('dialog[data-modal-id="unasked"]')).toBeVisible();
  });
});
