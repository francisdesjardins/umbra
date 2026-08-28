import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import {
  RestoreFocusToModalHarness,
  RestoreFocusToPanelHarness,
} from './restore-focus-to.story.js';

// Where the close hands the keyboard back when the opener is the wrong answer. The variants reach
// that instant by opposite routes — a non-modal close strands focus, a modal one is handed back by
// the platform — so both are measured, and so is the case left alone.

const PANEL = 'dialog[data-dialog-id="restore-focus-to-panel"]';
const MODAL = 'dialog[data-dialog-id="restore-focus-to-modal"]';

async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active?.getAttribute('data-testid') ?? active?.tagName ?? 'none';
  });
}

/** Open on row 0, then move the panel to row 1 without moving focus. */
async function openAndAdvance(page: Page, selector: string): Promise<void> {
  await page.getByTestId('row-0').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(selector)).toBeVisible();
  await page.getByTestId('next-row').click();
  await expect(page.getByTestId('showing')).toHaveText('Row 1');
}

test.describe('restoreFocusTo on a non-modal panel', () => {
  test('the close lands on the row the panel was showing', async ({ mount, page }) => {
    await mount(<RestoreFocusToPanelHarness override />);
    await openAndAdvance(page, PANEL);

    await page.getByTestId('panel-close').click();
    await expect(page.locator(PANEL)).not.toBeVisible();

    expect(await focused(page)).toBe('row-1');
  });

  test('and without it the opener is still the answer', async ({ mount, page }) => {
    // The floor, unchanged: the same flow with no callback must land where it always did.
    await mount(<RestoreFocusToPanelHarness override={false} />);
    await openAndAdvance(page, PANEL);

    await page.getByTestId('panel-close').click();
    await expect(page.locator(PANEL)).not.toBeVisible();

    expect(await focused(page)).toBe('row-0');
  });

  test('the row it lands on is visibly focused, not silently', async ({ mount, page }) => {
    // Mouse-driven on purpose: input modality is what hides a library-made focus, and the README
    // promises every one of them shows a ring.
    await mount(<RestoreFocusToPanelHarness override />);
    await openAndAdvance(page, PANEL);

    await page.getByTestId('panel-close').click();
    await expect(page.locator(PANEL)).not.toBeVisible();

    expect(
      await page.getByTestId('row-1').evaluate((node) => {
        return node.matches(':focus-visible');
      })
    ).toBe(true);
  });

  test('a caret the reader moved themselves is left alone', async ({ mount, page }) => {
    // The guard, and the whole reason this is not `onClose` plus a `focus()`: a close that ran
    // while the reader was already elsewhere is nobody's to redirect.
    await mount(<RestoreFocusToPanelHarness override />);
    await openAndAdvance(page, PANEL);

    await page.getByTestId('page-field').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator(PANEL)).not.toBeVisible();

    expect(await focused(page)).toBe('page-field');
  });

  test('and it is left alone on the engine that does not leave it alone', async ({
    mount,
    page,
  }) => {
    // The same press with no callback in sight: WebKit restores the opener whether or not focus was
    // still inside at `close()`, so without the read before the close the reader loses their place
    // on one engine out of three.
    await mount(<RestoreFocusToPanelHarness override={false} />);
    await openAndAdvance(page, PANEL);

    await page.getByTestId('page-field').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator(PANEL)).not.toBeVisible();

    expect(await focused(page)).toBe('page-field');
  });
});

test.describe('restoreFocusTo on a modal dialog', () => {
  test('it wins over the restore the platform already made', async ({ mount, page }) => {
    // The close-the-dialog steps hand focus back to row 0 at `close()`, so this is not the
    // stranded case — the callback is consulted because the close landed on the captured opener.
    await mount(<RestoreFocusToModalHarness override />);
    await openAndAdvance(page, MODAL);

    await page.getByTestId('panel-close').click();
    await expect(page.locator(MODAL)).not.toBeVisible();

    expect(await focused(page)).toBe('row-1');
  });

  test('and without it the platform keeps the opener', async ({ mount, page }) => {
    await mount(<RestoreFocusToModalHarness override={false} />);
    await openAndAdvance(page, MODAL);

    await page.getByTestId('panel-close').click();
    await expect(page.locator(MODAL)).not.toBeVisible();

    expect(await focused(page)).toBe('row-0');
  });
});
