import { expect, test } from '@playwright/experimental-ct-react';
import type { Page } from '@playwright/test';
import { FocusContainmentHarness, HiddenStopHarness } from './focus-containment.story.js';

/**
 * `containFocus` — the Tab wrap a non-modal dialog does not get from the browser.
 *
 * Every assertion here is about `document.activeElement` after real key presses, because that is
 * the only witness: a listener that looks correct and never fires reads identically in the source.
 */

const PANEL = 'dialog[data-modal-id="focus-containment"]';

/** What has focus, by test id — or the tag, for anything that has none. */
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active?.getAttribute('data-testid') ?? active?.tagName ?? 'none';
  });
}

test.describe('a non-modal dialog with containFocus off', () => {
  test('lets Tab walk out of it — which is what show() means', async ({ mount, page }) => {
    // The negative half, and the reason the option exists. Without it the panel is an ordinary
    // part of the page and the keyboard leaves after the last stop.
    const component = await mount(<FocusContainmentHarness containFocus={false} />);
    await component.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('inside-last').focus();
    await page.keyboard.press('Tab');

    expect(await focused(page)).not.toBe('inside-first');
  });
});

test.describe('a non-modal dialog with containFocus on', () => {
  test('wraps Tab from the last stop back to the first', async ({ mount, page }) => {
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('inside-last').focus();
    await page.keyboard.press('Tab');

    expect(await focused(page)).toBe('inside-first');
  });

  test('wraps Shift+Tab from the first stop back to the last', async ({ mount, page }) => {
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();

    await page.getByTestId('inside-first').focus();
    await page.keyboard.press('Shift+Tab');

    expect(await focused(page)).toBe('inside-last');
  });

  test('leaves an ordinary Tab between two stops alone', async ({ mount, page }) => {
    // The listener has to be inert everywhere but the two ends, or it would fight the browser for
    // every press inside the dialog.
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();

    await page.getByTestId('inside-first').focus();
    await page.keyboard.press('Tab');

    expect(await focused(page)).toBe('inside-middle');
  });

  test('does not pull focus back once something outside has taken it', async ({ mount, page }) => {
    // The deliberate limit: this answers Tab, it does not enforce focus. A `focusin` enforcer
    // would pass this test and, in a page where dialogs outside the top layer coexist with this
    // one, would fight every legitimate focus target beyond it.
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();

    await page.getByTestId('outside').focus();

    expect(await focused(page)).toBe('outside');
  });
});

test.describe('what counts as a stop', () => {
  test('a hidden control is skipped, so the wrap lands on a real destination', async ({
    mount,
    page,
  }) => {
    // `display: none` rather than `disabled`: the selector already drops a disabled control, so
    // that variant would pass without visibility ever being consulted.
    const component = await mount(<HiddenStopHarness />);
    await component.getByTestId('open').click();
    await component.getByTestId('hide-middle').click();

    await page.getByTestId('inside-first').focus();
    await page.keyboard.press('Shift+Tab');

    expect(await focused(page)).toBe('inside-last');
  });
});
