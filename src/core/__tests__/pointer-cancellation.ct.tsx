import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { NonModalClickOutsideHarness } from '../../react/__tests__/use-dialog/non-modal-click-outside.story.js';
import { BackdropHitTestHarness } from '../../react/__tests__/use-dialog/backdrop-hit-test.story.js';

// A dismissal is operated by a single pointer, so WCAG 2.5.2 applies: it must not settle on the
// down-event. Three sequences ask it of both surfaces — the press and the release agreeing, and
// each of the two ways they can disagree.

const PANEL = 'dialog[data-dialog-id="click-outside"]';

async function openPanel(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open Non-Modal' }).click();
  await expect(page.getByTestId('is-visible')).toHaveText('open');
}

/** Press over `from`, release over `to` — the pair, rather than the click the browser derives. */
async function dragBetween(page: Page, between: { from: string; to: string }): Promise<void> {
  const start = await page.getByTestId(between.from).boundingBox();
  const end = await page.getByTestId(between.to).boundingBox();
  if (!start || !end) {
    throw new Error('a target has no box to press');
  }
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 4 });
  await page.mouse.up();
}

test.describe('dismissOnClickOutside answers the pointer pair', () => {
  test('a press and a release both outside dismisses it', async ({ mount, page }) => {
    // The behaviour the option is for, and the one nothing below is allowed to break.
    await mount(<NonModalClickOutsideHarness />);
    await openPanel(page);

    await page.getByTestId('outside-button').click();

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('a press outside released back inside leaves it open', async ({ mount, page }) => {
    // The criterion itself: the reader changed their mind before letting go, and the down-event
    // must not have decided for them.
    await mount(<NonModalClickOutsideHarness />);
    await openPanel(page);

    await dragBetween(page, { from: 'outside-button', to: 'inside-target' });

    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });

  test('a press inside released outside leaves it open too', async ({ mount, page }) => {
    // The other half of the pair, and the reason this is not a one-line move to `click`: a
    // selection dragged out of the panel is not a dismissal either.
    await mount(<NonModalClickOutsideHarness />);
    await openPanel(page);

    await dragBetween(page, { from: 'inside-target', to: 'outside-button' });

    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });

  test('and the panel still dismisses on the press after one', async ({ mount, page }) => {
    // An abandoned press must leave nothing armed behind — the next honest one still works.
    await mount(<NonModalClickOutsideHarness />);
    await openPanel(page);

    await dragBetween(page, { from: 'outside-button', to: 'inside-target' });
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('outside-button').click();

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });
});

test.describe('a modal backdrop answers the pointer pair too', () => {
  /** The viewport corner: backdrop for a centred dialog, and never inside its box. */
  const CORNER = { x: 5, y: 5 };

  async function openModal(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  }

  async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
  }

  async function centreOf(page: Page, testId: string): Promise<{ x: number; y: number }> {
    const box = await page.getByTestId(testId).boundingBox();
    if (!box) {
      throw new Error(`${testId} has no box to press`);
    }
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  test('a press and a release both on the backdrop dismisses it', async ({ mount, page }) => {
    await mount(<BackdropHitTestHarness />);
    await openModal(page);

    await page.mouse.click(CORNER.x, CORNER.y);

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('a press inside the content released on the backdrop leaves it open', async ({
    mount,
    page,
  }) => {
    // Selecting text and letting go past the edge. The `click` reports the `<dialog>` as its
    // target — the ancestor the press and the release share — so the release alone cannot tell
    // this from a press on the backdrop, and the dialog went away under the selection.
    await mount(<BackdropHitTestHarness />);
    await openModal(page);

    await pressAt(page, await centreOf(page, 'content-button'));
    await page.mouse.move(CORNER.x, CORNER.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });

  test('a press on the backdrop released inside the content leaves it open', async ({
    mount,
    page,
  }) => {
    // Already true before the guard, because the geometry reads the release — pinned so it stays.
    await mount(<BackdropHitTestHarness />);
    await openModal(page);

    await pressAt(page, CORNER);
    const target = await centreOf(page, 'content-button');
    await page.mouse.move(target.x, target.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });
});
