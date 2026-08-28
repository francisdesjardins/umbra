import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { NonModalClickOutsideHarness } from '../../react/__tests__/use-dialog/non-modal-click-outside.story.js';

// A dismissal is a function operated by a single pointer, so WCAG 2.5.2 applies: it must not
// complete on the down-event. Three sequences say whether it does — the press and the release
// landing in the same place, and each of the two ways they can disagree.

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
