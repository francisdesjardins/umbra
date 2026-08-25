import type { Page } from '@playwright/test';
import { expect, test } from '../../__tests__/ct-coverage.js';
import { focusedDialogId, frontDialogId, paintedStackOrder } from '../../__tests__/stack-probe.js';
import {
  LatePolicyFocusHarness,
  MultiRaiseHarness,
  StackPriorityHarness,
} from './stack-priority.story.js';

/**
 * `prioritize` in a real top layer, the only place the claim can be checked — the manager's own
 * answers are in `stack-priority.test.ts`. The platform paints top-layer elements in insertion
 * order and `z-index` does not apply between them — measured: `z-index: 9999` still paints under a
 * later show — so lifting one means close-and-re-show, and the probe is `elementFromPoint`.
 */

test('without a policy the dialog that opened last is in front', async ({ mount, page }) => {
  const component = await mount(<StackPriorityHarness withPolicy={false} />);

  await component.getByTestId('open-warning').click();
  await component.getByTestId('open-panel').click();

  // The baseline the next test needs: the defect, reproduced.
  await expect
    .poll(() => {
      return frontDialogId(page);
    })
    .toBe('sp-panel');
});

test('with a policy the high-priority dialog stays in front of a later open', async ({
  mount,
  page,
}) => {
  const component = await mount(<StackPriorityHarness withPolicy={true} />);

  await component.getByTestId('open-warning').click();
  await component.getByTestId('open-panel').click();

  await expect
    .poll(() => {
      return frontDialogId(page);
    })
    .toBe('sp-warning');

  // A raise is a re-show, not a close: the dialog pushed under is still there to be dealt with.
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

  // A hit-tested click: under the panel's backdrop it would time out rather than land.
  await component.getByTestId('acknowledge').click();

  await expect(page.locator('dialog[data-modal-id="sp-warning"]')).not.toHaveAttribute('open', '');
  await expect
    .poll(() => {
      return frontDialogId(page);
    })
    .toBe('sp-panel');
});

test('the raise leaves focus in the dialog it put in front', async ({ mount, page }) => {
  const component = await mount(<StackPriorityHarness withPolicy={true} />);

  await component.getByTestId('open-warning').click();
  await component.getByTestId('open-panel').click();

  // `showModal()` refocuses on every show, so a reorder ignoring focus strands the keyboard in the
  // inert dialog underneath.
  await expect
    .poll(() => {
      return focusedDialogId(page);
    })
    .toBe('sp-warning');
});

test.describe('three dialogs, and a policy that arrives late', () => {
  test('a newcomer that belongs at the bottom lifts everything above it', async ({
    mount,
    page,
  }) => {
    const component = await mount(<MultiRaiseHarness />);
    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');
    await expect(component.getByTestId('mr-policy')).toHaveText('on');

    await component.getByTestId('mr-open-all').click();
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();

    // `mr-low` arrived last and ranks lowest: two raises, the only place that loop runs with two.
    await expect
      .poll(() => {
        return frontDialogId(page);
      })
      .toBe('mr-high');
    await expect
      .poll(() => {
        return paintedStackOrder(page);
      })
      .toEqual(['mr-low', 'mr-mid', 'mr-high']);

    await expect(page.locator('dialog[open]')).toHaveCount(3);
  });

  test('installing the policy reorders what is already on screen', async ({ mount, page }) => {
    const component = await mount(<MultiRaiseHarness />);

    // Opened with no policy at all, so the last one in is in front — `mr-low`.
    await component.getByTestId('mr-open-all').click();
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();
    await expect
      .poll(() => {
        return frontDialogId(page);
      })
      .toBe('mr-low');

    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');

    // Paint order moving under dialogs already up: in Node this path stops at the `document` guard.
    await expect(page.locator('dialog[data-modal-id="mr-high"]')).toBeVisible();
    await expect
      .poll(() => {
        return frontDialogId(page);
      })
      .toBe('mr-high');
    await expect
      .poll(() => {
        return paintedStackOrder(page);
      })
      .toEqual(['mr-low', 'mr-mid', 'mr-high']);
  });

  test('and removing it puts the paint order back', async ({ mount, page }) => {
    const component = await mount(<MultiRaiseHarness />);
    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');
    await component.getByTestId('mr-open-all').click();
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();
    await expect
      .poll(() => {
        return frontDialogId(page);
      })
      .toBe('mr-high');

    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');
    await expect(component.getByTestId('mr-policy')).toHaveText('off');

    // The only thing exercising the clause that keeps `syncStackOrder` awake one sync past removal.
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();
    await expect
      .poll(() => {
        return frontDialogId(page);
      })
      .toBe('mr-low');
    await expect
      .poll(() => {
        return paintedStackOrder(page);
      })
      .toEqual(['mr-high', 'mr-mid', 'mr-low']);
  });
});

test.describe('what a late install costs', () => {
  /**
   * Every raise, in order, as the elements themselves report it.
   *
   * **`close()` queues its event**, so the count is read by polling rather than once: a synchronous
   * read after the install returns an empty array about half the time, which is how this was first
   * measured as costing nothing at all. The raises had happened — the paint order proves it — and
   * the events had not been delivered yet.
   */
  const watchRaises = async (page: Page): Promise<void> => {
    await page.evaluate(() => {
      const raised: string[] = [];
      (globalThis as unknown as { raised: string[] }).raised = raised;
      for (const dialog of document.querySelectorAll('dialog[data-modal-id]')) {
        dialog.addEventListener('close', () => {
          raised.push(dialog.getAttribute('data-modal-id') ?? '?');
        });
      }
    });
  };

  const raisesSoFar = (page: Page): Promise<string[]> => {
    return page.evaluate(() => {
      return (globalThis as unknown as { raised: string[] }).raised;
    });
  };

  test('a late install lifts only what the order needs', async ({ mount, page }) => {
    const component = await mount(<MultiRaiseHarness />);

    // Opened with no policy at all — high, then mid, then low — so the top layer is open order and
    // the policy wants the exact reverse: an arrangement it genuinely has to change.
    await component.getByTestId('mr-open-all').click();
    await expect(page.locator('dialog[data-modal-id="mr-low"]')).toBeVisible();
    await expect
      .poll(() => {
        return paintedStackOrder(page);
      })
      .toEqual(['mr-high', 'mr-mid', 'mr-low']);

    await watchRaises(page);
    await component.getByTestId('mr-toggle-policy').dispatchEvent('click');
    await expect(component.getByTestId('mr-policy')).toHaveText('on');

    // **`mr-low` is the saving, and it is the whole point.** Re-showing always puts a dialog in
    // front, so the cheapest plan keeps the longest prefix of the wanted order that is already a
    // subsequence of the real one — `low` is at the top and belongs at the bottom, and lifting the
    // two above it gets it there without touching it. Seeded from the stack as it stands this is
    // two; against an empty `current` it was three, since `planRaises` then returns everything.
    await expect
      .poll(() => {
        return raisesSoFar(page);
      })
      .toEqual(['mr-mid', 'mr-high']);

    // And the order it was all for.
    await expect
      .poll(() => {
        return paintedStackOrder(page);
      })
      .toEqual(['mr-low', 'mr-mid', 'mr-high']);
  });
});

test.describe('a policy installed under an open dialog', () => {
  test('does not move the caret out of the field it was in', async ({ mount, page }) => {
    const component = await mount(<LatePolicyFocusHarness />);
    await component.getByTestId('lp-open').click();
    await expect(page.locator('dialog[data-modal-id="lp-only"]')).toBeVisible();

    await page.getByTestId('lp-input').click();
    await page.getByTestId('lp-input').fill('mid-sentence');
    await expect(page.getByTestId('lp-input')).toBeFocused();

    // A late install seeds its tracking from the stack as it stands, so the plan lifts only what
    // the order needs — "a late install lifts only what the order needs" below counts it.
    await component.getByTestId('lp-toggle-policy').dispatchEvent('click');
    await expect(component.getByTestId('lp-policy')).toHaveText('on');

    // `showModal()` would otherwise hand the focus to the first focusable in the dialog.
    await expect(page.getByTestId('lp-first')).not.toBeFocused();
    await expect(page.getByTestId('lp-input')).toBeFocused();
    await expect(page.getByTestId('lp-input')).toHaveValue('mid-sentence');
  });
});
