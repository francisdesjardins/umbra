import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { DismissGatesHarness, InertEscapeHarness } from './dismiss-gates.story.js';

// The cascade every dismissal runs, from the outside. Each gate refuses for its own reason, and a
// refusal that reads like the next one along is what makes them worth separating.

const PANEL = 'dialog[data-dialog-id="dismiss-gates"]';

async function openPanel(page: Page): Promise<void> {
  await page.getByTestId('open').click();
  await expect(page.getByTestId('visible')).toHaveText('open');
}

test.describe('a key the caller keeps', () => {
  test('onKeyDown sees the press before the hotkey runs', async ({ mount, page }) => {
    await mount(<DismissGatesHarness />);
    await openPanel(page);

    await page.getByTestId('slow-action').focus();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('keys-seen')).toHaveText('1');
    await expect(page.getByTestId('hotkey-runs')).toHaveText('1');
  });

  test('and preventDefault in it stops the hotkey', async ({ mount, page }) => {
    // The documented door out, and the only one a caller has: content that answers a key itself
    // must be able to keep it, and nothing else in the cascade can express that.
    await mount(<DismissGatesHarness swallowKeys />);
    await openPanel(page);

    await page.getByTestId('slow-action').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    await expect(page.getByTestId('keys-seen')).toHaveText('1');
    await expect(page.getByTestId('hotkey-runs')).toHaveText('0');
    await expect(page.locator(PANEL)).toBeVisible();
  });
});

test.describe('a dismissal an action is holding', () => {
  test('a click outside is refused while an action runs, and works once it settles', async ({
    mount,
    page,
  }) => {
    // Read at the release, so the gate answers for the gesture rather than for its press.
    await mount(<DismissGatesHarness />);
    await openPanel(page);

    await page.getByTestId('slow-action').click();
    await page.getByTestId('outside').click();
    await page.waitForTimeout(300);
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('finish').click();
    await page.waitForTimeout(300);
    await page.getByTestId('outside').click();

    await expect(page.getByTestId('visible')).toHaveText('closed');
  });

  test('a press the platform takes away arms nothing', async ({ mount, page }) => {
    // `pointercancel` is what a scroll claiming the gesture produces, and it arrives *instead of*
    // the release the dismissal waits for — so the armed press has to be dropped rather than left
    // for whatever release comes next.
    await mount(<DismissGatesHarness />);
    await openPanel(page);

    const box = await page.getByTestId('outside').boundingBox();
    if (!box) {
      throw new Error('the outside button has no box');
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.evaluate(() => {
      document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    });
    await page.mouse.up();
    await page.waitForTimeout(300);

    await expect(page.locator(PANEL)).toBeVisible();
  });
});

test.describe('a dismiss key that is not Escape', () => {
  test('leaves Escape inert without letting the browser close the dialog', async ({
    mount,
    page,
  }) => {
    // The native `cancel` fires for Escape whatever the dialog declares, and it is always
    // prevented: the browser closing the element behind the store is the failure to rule out.
    await mount(<InertEscapeHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('visible')).toHaveText('open');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await expect(page.getByTestId('visible')).toHaveText('open');
    expect(
      await page.locator('dialog[data-dialog-id="inert-escape"]').evaluate((node) => {
        return (node as HTMLDialogElement).open;
      })
    ).toBe(true);

    // And the key it does declare still closes it.
    await page.keyboard.press('F2');
    await expect(page.getByTestId('visible')).toHaveText('closed');
  });
});
