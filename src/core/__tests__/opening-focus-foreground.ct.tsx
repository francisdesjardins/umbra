import { expect, test } from '@playwright/experimental-ct-react';
import { OpeningFocusForegroundHarness } from './opening-focus-foreground.story.js';

/**
 * The opening focus defers to the foreground.
 *
 * A dialog opening underneath another is not what the user is looking at, and taking the keyboard
 * from what they are looking at is the worst thing an opening can do: the dialog in front is left
 * with no focus, so its own keydown listener hears nothing and its dismiss key goes dead. Reported
 * from an application — a connection error in the top layer, focused on its cancel button, losing
 * focus the instant a side panel opened behind it — and the press that followed was then claimed
 * by the panel, which navigated.
 */

test('a panel opening underneath does not take focus from the dialog in front', async ({
  mount,
  page,
}) => {
  const component = await mount(<OpeningFocusForegroundHarness />);
  await component.getByTestId('off-open-interruption').click();
  const interruption = page.locator('dialog[data-modal-id="off-interruption"]');
  await expect(interruption).toBeVisible();
  // `showModal()` puts focus in the dialog on its own; which element is the platform’s business.
  await expect(page.locator(String.raw`dialog[data-modal-id="off-interruption"]`)).toBeVisible();

  await page.getByTestId('off-open-panel').click();
  await expect(page.locator('dialog[data-modal-id="off-panel"]')).toBeVisible();

  // The claim that discriminates: the panel asked for `focusOnOpen` and must be refused. The
  // opener button is where focus legitimately sits after the click that opened the panel — what
  // matters is that it is still inside the interruption, not in the panel.
  const holder = await page.evaluate(() => {
    const active = document.activeElement;
    if (
      document.querySelector('dialog[data-modal-id="off-interruption"]')?.contains(active) === true
    ) {
      return 'inside the interruption';
    }
    return `on ${active?.getAttribute('data-testid') ?? active?.tagName ?? 'nothing'}`;
  });
  expect(holder).toBe('inside the interruption');
});

test('the same panel takes its opening focus when nothing is in front', async ({ mount, page }) => {
  // The other half, or the fix would just be "never focus a non-modal dialog": alone, the panel's
  // `focusOnOpen` claim is honoured exactly as before.
  const component = await mount(<OpeningFocusForegroundHarness />);
  await component.getByTestId('off-open-panel-alone').click();
  await expect(page.locator('dialog[data-modal-id="off-panel"]')).toBeVisible();

  await expect(page.getByTestId('off-panel-button')).toBeFocused();
});
