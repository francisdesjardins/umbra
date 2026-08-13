import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { MultiRaiseHarness, StackPriorityHarness } from './stack-priority.story.js';

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

test.describe('three dialogs, and a policy that arrives late', () => {
  /** The stack the manager reports, bottom first. */
  async function stackOrder(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      return [...document.querySelectorAll('dialog[open]')]
        .map((dialog) => {
          return {
            id: (dialog as HTMLElement).dataset['modalId'] ?? '',
            z: Number((dialog as HTMLElement).dataset['modalZ'] ?? '0'),
          };
        })
        .sort((a, b) => {
          return a.z - b.z;
        })
        .map((entry) => {
          return entry.id;
        });
    });
  }

  test('a newcomer that belongs at the bottom lifts everything above it', async ({
    mount,
    page,
  }) => {
    const component = await mount(<MultiRaiseHarness />);
    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');
    await expect(component.getByTestId('mr-policy')).toHaveText('on');

    await component.getByTestId('mr-open-all').click();
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();

    // `mr-low` arrived last and ranks lowest, so the plan is two raises — `mr-mid` then `mr-high` —
    // and this is the only place that loop runs with more than one entry in it.
    expect(await frontDialogId(page)).toBe('mr-high');
    expect(await stackOrder(page)).toEqual(['mr-low', 'mr-mid', 'mr-high']);

    // Raises are re-shows, so nothing closed on the way.
    await expect(page.locator('dialog[open]')).toHaveCount(3);
  });

  test('installing the policy reorders what is already on screen', async ({ mount, page }) => {
    const component = await mount(<MultiRaiseHarness />);

    // Opened with no policy at all, so the last one in is in front — `mr-low`.
    await component.getByTestId('mr-open-all').click();
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();
    expect(await frontDialogId(page)).toBe('mr-low');

    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');

    // The paint order moved under three dialogs that were already up — the half of `prioritize` a
    // snapshot assertion cannot see, since in Node this path stops at the `document` guard.
    await expect(page.locator('dialog[data-modal-id="mr-high"]')).toBeVisible();
    expect(await frontDialogId(page)).toBe('mr-high');
    expect(await stackOrder(page)).toEqual(['mr-low', 'mr-mid', 'mr-high']);
  });

  test('and removing it puts the paint order back', async ({ mount, page }) => {
    const component = await mount(<MultiRaiseHarness />);
    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');
    await component.getByTestId('mr-open-all').click();
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();
    expect(await frontDialogId(page)).toBe('mr-high');

    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');
    await expect(component.getByTestId('mr-policy')).toHaveText('off');

    // Back to open order — and this is the only thing that exercises the clause keeping
    // `syncStackOrder` awake for one sync after the policy is gone.
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();
    expect(await frontDialogId(page)).toBe('mr-low');
    expect(await stackOrder(page)).toEqual(['mr-high', 'mr-mid', 'mr-low']);
  });
});
