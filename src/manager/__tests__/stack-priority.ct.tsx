import { expect, test } from '@playwright/experimental-ct-react';
import type { Page } from '@playwright/test';
import { StackPriorityHarness } from './stack-priority.story.js';

/**
 * `prioritize` in a real top layer, which is the only place the claim can be checked.
 *
 * The manager's own answers are asserted in `stack-priority.test.ts`. What needs a browser is that
 * the *paint* order moved, because the mechanism is not a number: the platform paints top-layer
 * elements in the order they were added and `z-index` does not apply between them — measured, a
 * dialog stamped `z-index: 9999` still paints under one shown after it — so the only way to lift one
 * is to close and re-show it. A test that read `openDialogs` would pass over a library that stamped
 * a z-index and changed nothing on screen.
 *
 * `elementFromPoint` at the centre is the question asked, because it is the same question the mouse
 * asks.
 */

/** Which dialog is really in front, asked the way a click asks it. */
async function frontDialogId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return hit?.closest('dialog')?.dataset['modalId'] ?? null;
  });
}

test('without a policy the dialog that opened last is in front', async ({ mount, page }) => {
  const component = await mount(<StackPriorityHarness withPolicy={false} />);

  await component.getByTestId('open-warning').click();
  await component.getByTestId('open-panel').click();

  // The baseline, and the reason the next test means something: this is the defect, reproduced.
  expect(await frontDialogId(page)).toBe('sp-panel');
});

test('with a policy the high-priority dialog stays in front of a later open', async ({
  mount,
  page,
}) => {
  const component = await mount(<StackPriorityHarness withPolicy={true} />);

  await component.getByTestId('open-warning').click();
  await component.getByTestId('open-panel').click();

  expect(await frontDialogId(page)).toBe('sp-warning');

  // Both are still open — a raise is a re-show, not a close, and the dialog that was pushed under
  // is still there to be dealt with once the warning is answered.
  await expect(page.locator('dialog[data-modal-id="sp-panel"]')).toHaveAttribute('open', '');
  await expect(page.locator('dialog[data-modal-id="sp-warning"]')).toHaveAttribute('open', '');
});

test('being in front means being the one the mouse and the keyboard reach', async ({
  mount,
  page,
}) => {
  const component = await mount(<StackPriorityHarness withPolicy={true} />);

  await component.getByTestId('open-warning').click();
  await component.getByTestId('open-panel').click();

  // A real click, hit-tested: it lands only if the warning is genuinely on top. Under the panel's
  // backdrop this times out, which is exactly what the bug feels like to a user.
  await component.getByTestId('acknowledge').click();

  await expect(page.locator('dialog[data-modal-id="sp-warning"]')).not.toHaveAttribute('open', '');
  // Answering the warning hands the page back to the panel underneath.
  expect(await frontDialogId(page)).toBe('sp-panel');
});

test('the raise leaves focus in the dialog it put in front', async ({ mount, page }) => {
  const component = await mount(<StackPriorityHarness withPolicy={true} />);

  await component.getByTestId('open-warning').click();
  await component.getByTestId('open-panel').click();

  // `showModal()` runs the focusing steps on every show, so a reorder that ignored focus would
  // leave the keyboard in the dialog underneath — visibly stuck, since only the topmost modal
  // dialog is not inert.
  const focusedIn = await page.evaluate(() => {
    return document.activeElement?.closest('dialog')?.dataset['modalId'] ?? null;
  });

  expect(focusedIn).toBe('sp-warning');
});
