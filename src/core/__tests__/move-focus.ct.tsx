import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { MoveFocusHarness } from './move-focus.story.js';

// `handle.moveFocus` — the Tab a device that is not a keyboard cannot press. What it has to get
// right is what a hand-rolled `querySelectorAll` gets wrong: the kinds it reaches, the dialog it
// stays inside, and the ring it draws.

const DIALOG = 'dialog[data-dialog-id="move-focus"]';

async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active?.getAttribute('data-testid') ?? active?.tagName ?? 'none';
  });
}

/** Open it, then park the keyboard on the first control so every walk starts from one place. */
async function openOnFirst(page: Page): Promise<void> {
  await page.getByTestId('open').click();
  await expect(page.locator(DIALOG)).toBeVisible();
  await page.getByTestId('first').focus();
}

test.describe('walking a dialog’s controls', () => {
  test('next reaches the field and the region, not only the buttons', async ({ mount, page }) => {
    // The measurement the primitive exists for: an outside adapter finds `[data-action-reason]`
    // and stops there, so these two are the half of the dialog it cannot walk.
    await mount(<MoveFocusHarness />);
    await openOnFirst(page);

    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('field');

    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('region');
  });

  test('and wraps rather than stopping at the end', async ({ mount, page }) => {
    await mount(<MoveFocusHarness />);
    await openOnFirst(page);

    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press('ArrowDown');
    }

    expect(await focused(page)).toBe('first');
  });

  test('previous walks the same order backwards', async ({ mount, page }) => {
    await mount(<MoveFocusHarness />);
    await openOnFirst(page);

    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('last');

    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('region');
  });

  test('from nothing inside, next takes the first and previous the last', async ({
    mount,
    page,
  }) => {
    // A step needs somewhere to step from; with the keyboard outside, the end being walked
    // towards is the only answer that is not arbitrary.
    await mount(<MoveFocusHarness />);
    await page.getByTestId('open').click();
    await expect(page.locator(DIALOG)).toBeVisible();

    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('last');

    await page.getByTestId('open').focus();
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('first');
  });

  test('the control it lands on is visibly focused, not silently', async ({ mount, page }) => {
    // Driven by the mouse on purpose: a controller has no modality the engines recognise either,
    // so a move that draws no ring leaves the reader with no idea where the keyboard went.
    await mount(<MoveFocusHarness />);
    await openOnFirst(page);

    await page.keyboard.press('ArrowDown');

    expect(
      await page.getByTestId('field').evaluate((node) => {
        return node.matches(':focus-visible');
      })
    ).toBe(true);
  });

  test('a nested dialog’s controls are never the answer', async ({ mount, page }) => {
    // The trap a user-land scan falls into: the inner dialog renders inside this subtree, so
    // `querySelectorAll` finds its button and the walk hands the keyboard to another dialog.
    await mount(<MoveFocusHarness nested />);
    await openOnFirst(page);
    await page.getByTestId('open-inner').click();
    await expect(page.locator('dialog[data-dialog-id="move-focus-inner"]')).toBeVisible();

    await page.getByTestId('first').focus();
    const walked: string[] = [];
    for (let step = 0; step < 5; step += 1) {
      await page.keyboard.press('ArrowDown');
      walked.push(await focused(page));
    }

    expect(walked).toEqual(['field', 'region', 'last', 'open-inner', 'first']);
  });

  test('a dialog that is not open has nothing to walk, and says so', async ({ mount, page }) => {
    await mount(<MoveFocusHarness />);

    await page.getByTestId('open').focus();
    await page.keyboard.press('ArrowDown');

    await expect(page.getByTestId('took')).toHaveText('false');
    expect(await focused(page)).toBe('open');
  });
});
