import { expect, test } from '@playwright/experimental-ct-react';
import type { Page } from '@playwright/test';
import {
  FocusContainmentHarness,
  FramedContentHarness,
  HiddenStopHarness,
  RovingToolbarHarness,
} from './focus-containment.story.js';

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

  test('sends Tab inward when the click landed on nothing focusable', async ({ mount, page }) => {
    // Reported from a real panel: click the empty area under the last button, press Tab, and the
    // keyboard is in the page behind. Clicking non-focusable content focuses the nearest
    // *click-focusable* ancestor, and an open `<dialog>` is one — so focus is legitimately on the
    // element itself, and from there the browser may skip the whole subtree rather than descend
    // into it, leaving the markers unvisited.
    //
    // Both assertions have to be exact. The click one pins the mechanism the fix answers, and
    // `inside-first` is what discriminates: this Chromium *does* descend, so without the handler
    // focus reaches the start marker with the dialog as `relatedTarget`, is read as leaving, and
    // wraps to `inside-last`. A "did not leave the panel" assertion passes either way and guards
    // nothing.
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('dead-space').click();
    expect(await focused(page)).toBe('modal-focus-containment');

    await page.keyboard.press('Tab');

    expect(await focused(page)).toBe('inside-first');
  });

  test('sends Shift+Tab to the far end from that same click', async ({ mount, page }) => {
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('dead-space').click();
    await page.keyboard.press('Shift+Tab');

    expect(await focused(page)).toBe('inside-last');
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
  test('an element the browser skips is not the end of the dialog', async ({ mount, page }) => {
    // The failure this exists for, measured in a real application before it was understood: a
    // roving-tabindex toolbar contributed twenty elements the selector matched and the browser
    // never stopped on, so the "last" being compared against was unreachable, the wrap never fired
    // and the keyboard walked out of the dialog. Ordinary buttons cannot show it — every one of
    // them is a stop.
    const component = await mount(<RovingToolbarHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator('dialog[data-modal-id="focus-containment-toolbar"]')).toBeVisible();

    await page.getByTestId('inside-last').focus();
    await page.keyboard.press('Tab');

    expect(await focused(page)).toBe('inside-first');
  });

  test('a frame at the end does not let the keyboard out through it', async ({ mount, page }) => {
    // A press inside an `<iframe>` reaches no listener in the parent document, so a `keydown`
    // approach cannot answer the Tab that leaves an editor. The marker is reached by the browser
    // instead of being told about, which is the whole reason it is a marker.
    const component = await mount(<FramedContentHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator('dialog[data-modal-id="focus-containment-frame"]')).toBeVisible();

    await page.getByTestId('editor').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    expect(await focused(page)).not.toBe('outside');
  });

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
