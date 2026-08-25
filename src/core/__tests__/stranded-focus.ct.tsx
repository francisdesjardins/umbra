import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { StrandedFocusHarness } from './stranded-focus.story.js';

/** Whoever holds focus, named by its test id — `none` when the keyboard is on the page. */
const focused = (page: Page) => {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active instanceof HTMLElement
      ? (active.getAttribute('data-testid') ?? active.tagName.toLowerCase())
      : 'none';
  });
};

/**
 * A dialog's keyboard is its focus: `attachDialogKeydown` listens on the dialog and hears only what
 * is raised inside it, so focus on `<body>` leaves every hotkey dead and the platform's own `cancel`
 * answering Escape alone. A control that disables itself is blurred by the engine and lands there.
 */
test.describe('a control that disables itself', () => {
  /**
   * **@focus-dependent — excluded from the default run, and not because it is flaky.** A browser
   * dispatches `blur` and `focusout` only while the document holds the focus; without it
   * `activeElement` still moves when a focused control is disabled, silently. The repair listens for
   * exactly that event, so on a page the runner has backgrounded there is nothing to hear and this
   * measures the runner. Under eight workers one page holds the focus and the rest do not, which is
   * a coin toss — `page.bringToFront()` does not settle it either, since the parallel pages take it
   * from each other.
   *
   * Run it deliberately with `yarn test:component:focus`, which gives it one worker and the focus.
   */
  test('gets the keyboard back when it comes back @focus-dependent', async ({ mount, page }) => {
    await page.bringToFront();
    await mount(<StrandedFocusHarness />);
    await page.getByTestId('stranded-open').click();
    await expect(page.getByTestId('stranded-work')).toBeVisible();

    // Keyboard-driven, so this is the ordinary way in rather than a scripted focus.
    await expect(page.getByTestId('stranded-work')).toBeFocused();
    await page.getByTestId('stranded-work').press('Enter');
    await expect(page.getByTestId('stranded-work')).toBeDisabled();

    // The strand itself, asserted before its repair: without this the test cannot tell "focus never
    // left" from "focus left and never came back", and those are different defects.
    await expect
      .poll(() => {
        return focused(page);
      })
      .not.toBe('stranded-work');

    await expect(page.getByTestId('stranded-runs')).toHaveText('1');
    await expect
      .poll(() => {
        return focused(page);
      })
      .toBe('stranded-work');
  });

  /**
   * The repair's own limit, and it is deliberate: while the control is away the keyboard has
   * nowhere honest to be. Sending it to the dialog's first focusable would park an ordinary
   * "saving…" on the confirm button, where the next Enter commits the dialog.
   */
  test('is not answered by moving focus to some other control', async ({ mount, page }) => {
    await mount(<StrandedFocusHarness />);
    await page.getByTestId('stranded-open').click();
    await page.getByTestId('stranded-work').press('Enter');
    await expect(page.getByTestId('stranded-work')).toBeDisabled();

    // Mid-work: not on OK, which is what a first-focusable floor would have chosen.
    expect(await focused(page)).not.toBe('stranded-ok');
  });

  /**
   * The other half of `relatedTarget`: focus moving to another control is somebody's choice and
   * carries its destination, so nothing may drag it back.
   */
  test('leaves an ordinary move between controls alone', async ({ mount, page }) => {
    await mount(<StrandedFocusHarness />);
    await page.getByTestId('stranded-open').click();
    await expect(page.getByTestId('stranded-work')).toBeVisible();

    await page.getByTestId('stranded-work').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('stranded-ok')).toBeFocused();

    // Still there a few frames on: a reclaim firing here would have pulled it back.
    await page.waitForTimeout(150);
    await expect(page.getByTestId('stranded-ok')).toBeFocused();
  });
});
