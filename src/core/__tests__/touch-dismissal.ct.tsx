import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { NonModalClickOutsideHarness } from '../../react/__tests__/use-dialog/non-modal-click-outside.story.js';
import { BackdropHitTestHarness } from '../../react/__tests__/use-dialog/backdrop-hit-test.story.js';

/**
 * Both dismissal surfaces, driven by a finger.
 *
 * A tap is not a small click. It produces `pointerdown → pointerup` like a mouse, but a finger that
 * *moves* is taken away instead: the browser reads the movement as a pan and sends `pointercancel`
 * with **no `pointerup` at all** — measured, so the pair the dismissal waits for never completes.
 * Nothing on the desktop projects produces that shape, which is why these run on their own device.
 */

const PANEL = 'dialog[data-dialog-id="click-outside"]';

/** The viewport corner: backdrop for a centred dialog, ordinary page for a panel. */
const CORNER = { x: 5, y: 5 };

async function centreOf(page: Page, testId: string): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) {
    throw new Error(`${testId} has no box to tap`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function tap(page: Page, testId: string): Promise<void> {
  const { x, y } = await centreOf(page, testId);
  await page.touchscreen.tap(x, y);
}

test.describe('a panel dismissed by a finger', () => {
  test('a tap outside dismisses it @touch', async ({ mount, page }) => {
    // The pair completes on a tap the way it does on a click — the whole question this device
    // answers, since the dismissal waits for a release that a finger might never give.
    await mount(<NonModalClickOutsideHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await tap(page, 'outside-button');

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('a tap inside leaves it open @touch', async ({ mount, page }) => {
    await mount(<NonModalClickOutsideHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await tap(page, 'inside-target');
    await page.waitForTimeout(400);

    await expect(page.locator(PANEL)).toBeVisible();
  });

  test('a finger that moves is cancelled, and dismisses nothing @touch-cdp', async ({
    mount,
    page,
  }) => {
    // The shape a mouse never makes: press outside, drag back in, and the browser takes the
    // pointer away as a pan — `pointerdown` then `pointercancel`, no release. The dismissal must
    // not fire, and the cancel must leave nothing armed for the next release to claim.
    await mount(<NonModalClickOutsideHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [await centreOf(page, 'outside-button')],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [await centreOf(page, 'inside-target')],
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);

    await expect(page.locator(PANEL)).toBeVisible();

    // And the panel that survived it is still dismissible — an abandoned press left nothing behind.
    await tap(page, 'outside-button');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });
});

test.describe('a modal backdrop tapped by a finger', () => {
  test('a tap on the backdrop dismisses it @touch', async ({ mount, page }) => {
    await mount(<BackdropHitTestHarness />);
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.touchscreen.tap(CORNER.x, CORNER.y);

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('a tap on the content does not @touch', async ({ mount, page }) => {
    // The press guard reads the same target test on a touch `pointerdown` as on a mouse one, and
    // this is where a wrong answer would show: the click a tap synthesises reports the `<dialog>`.
    await mount(<BackdropHitTestHarness />);
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await tap(page, 'content-button');
    await page.waitForTimeout(400);

    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('activated')).toHaveText('yes');
  });
});
