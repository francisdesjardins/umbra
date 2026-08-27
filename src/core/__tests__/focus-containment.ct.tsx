import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import {
  EditableContentHarness,
  EditableOnlyHarness,
  FocusContainmentHarness,
  FramedContentHarness,
  HiddenStopHarness,
  NestedPanelScanHarness,
  RovingToolbarHarness,
} from './focus-containment.story.js';

/**
 * `containFocus` — the Tab wrap a non-modal dialog does not get from the browser. Asserted on
 * `document.activeElement` after real presses, the only witness: a listener that looks correct
 * and never fires reads identically in the source.
 */

const PANEL = 'dialog[data-dialog-id="focus-containment"]';

async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active?.getAttribute('data-testid') ?? active?.tagName ?? 'none';
  });
}

test.describe('a non-modal dialog with containFocus off', () => {
  test('lets Tab walk out of it — which is what show() means', async ({ mount, page }) => {
    // The negative half: without it the panel is ordinary page content and the keyboard leaves.
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
    // The listener must be inert everywhere but the two ends, or it fights the browser inside.
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();

    await page.getByTestId('inside-first').focus();
    await page.keyboard.press('Tab');

    expect(await focused(page)).toBe('inside-middle');
  });

  test('sends Tab inward when the click landed on nothing focusable', async ({ mount, page }) => {
    // Clicking non-focusable content focuses the nearest *click-focusable* ancestor — an open
    // `<dialog>` — from where the browser may skip the subtree. `inside-first` discriminates: this
    // Chromium *does* descend, so unhandled, focus reaches the start marker and wraps backwards.
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('dead-space').click();
    expect(await focused(page)).toBe('dialog-focus-containment');

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
    // would pass this test and fight every legitimate focus target beyond the dialog.
    const component = await mount(<FocusContainmentHarness containFocus />);
    await component.getByTestId('open').click();

    await page.getByTestId('outside').focus();

    expect(await focused(page)).toBe('outside');
  });
});

test.describe('what counts as a stop', () => {
  test('an element the browser skips is not the end of the dialog', async ({ mount, page }) => {
    // Measured in a real application: a roving-tabindex toolbar contributes elements the selector
    // matches and the browser never stops on, so the "last" compared against is unreachable.
    const component = await mount(<RovingToolbarHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator('dialog[data-dialog-id="focus-containment-toolbar"]')).toBeVisible();

    await page.getByTestId('inside-last').focus();
    await page.keyboard.press('Tab');

    expect(await focused(page)).toBe('inside-first');
  });

  test('a frame at the end does not let the keyboard out through it', async ({ mount, page }) => {
    // A press inside an `<iframe>` reaches no listener in the parent, so a `keydown` approach
    // cannot answer it — the marker is reached by the browser rather than told about.
    const component = await mount(<FramedContentHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator('dialog[data-dialog-id="focus-containment-frame"]')).toBeVisible();

    await page.getByTestId('editor').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    expect(await focused(page)).not.toBe('outside');
  });

  test('a hidden control is skipped, so the wrap lands on a real destination', async ({
    mount,
    page,
  }) => {
    // `display: none`, not `disabled`: the selector already drops a disabled control.
    const component = await mount(<HiddenStopHarness />);
    await component.getByTestId('open').click();
    await component.getByTestId('hide-middle').click();

    await page.getByTestId('inside-first').focus();
    await page.keyboard.press('Shift+Tab');

    expect(await focused(page)).toBe('inside-last');
  });

  test('a contenteditable region is a stop, and the wrap lands on it', async ({ mount, page }) => {
    // An editable region is a Tab stop with no `tabindex`, `href` or control tag. Discriminating on
    // every engine: missing from the scan, the wrap's only candidate is where the press started.
    const component = await mount(<EditableContentHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator('dialog[data-dialog-id="focus-containment-editable"]')).toBeVisible();

    await page.getByTestId('inside-first').focus();
    await page.keyboard.press('Shift+Tab');

    expect(await focused(page)).toBe('editor-surface');
  });

  test('a dialog whose only stop is an editor still gets the Tab recovery', async ({
    mount,
    page,
  }) => {
    // The unconditional half: a dead-space click focuses the `<dialog>` element and with nothing
    // for the scan to find the recovery declines. Chromium and Firefox descend; WebKit sticks.
    const component = await mount(<EditableOnlyHarness />);
    await component.getByTestId('open').click();
    await expect(
      page.locator('dialog[data-dialog-id="focus-containment-editable-only"]')
    ).toBeVisible();

    await page.getByTestId('dead-space').click();
    expect(await focused(page)).toBe('dialog-focus-containment-editable-only');

    await page.keyboard.press('Tab');

    expect(await focused(page)).toBe('editor-surface');
  });
});

test.describe('the dead-space click, whatever containFocus says', () => {
  // **The recovery is unconditional and this pair holds it there.** A dead-space click focuses the
  // `<dialog>`; Chromium and Firefox move Tab into the content, **WebKit swallows it**. Both
  // variants and both flag values: the flag must make no difference. The title is spelled out —
  // the matrix gate matches it verbatim.
  test('a dead-space click leaves the keyboard reachable without containFocus', async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <FocusContainmentHarness containFocus={false} nonModal={false} />
    );
    await component.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('dead-space').click();
    expect(await focused(page)).toBe('dialog-focus-containment');

    await page.keyboard.press('Tab');

    expect(await focused(page)).toBe('inside-first');
  });

  for (const nonModal of [false, true]) {
    for (const containFocus of [false, true]) {
      const shape = `${nonModal ? 'non-modal' : 'dialog'}, containFocus=${String(containFocus)}`;

      test(`Tab reaches the content — ${shape}`, async ({ mount, page }) => {
        const component = await mount(
          <FocusContainmentHarness containFocus={containFocus} nonModal={nonModal} />
        );
        await component.getByTestId('open').click();
        await expect(page.locator(PANEL)).toBeVisible();

        await page.getByTestId('dead-space').click();
        expect(await focused(page)).toBe('dialog-focus-containment');

        await page.keyboard.press('Tab');

        expect(await focused(page)).toBe('inside-first');
      });

      test(`Shift+Tab reaches the far end — ${shape}`, async ({ mount, page }) => {
        const component = await mount(
          <FocusContainmentHarness containFocus={containFocus} nonModal={nonModal} />
        );
        await component.getByTestId('open').click();
        await expect(page.locator(PANEL)).toBeVisible();

        await page.getByTestId('dead-space').click();
        await page.keyboard.press('Shift+Tab');

        expect(await focused(page)).toBe('inside-last');
      });
    }
  }
});

/**
 * Whether the recovery scan stays inside the dialog it belongs to — the matrix's open question
 * against the reclaim floor. Written as a measurement, not a claim: `focusFirstAvailable` walks a
 * plain `querySelectorAll` where every other `focus-policy.ts` lookup uses `queryOwn`.
 */
test.describe('the recovery scan and a dialog nested inside this one', () => {
  test('Shift+Tab from the dialog element stays on this dialog’s own last stop', async ({
    mount,
    page,
  }) => {
    const component = await mount(<NestedPanelScanHarness />);
    await component.getByTestId('open-outer').click();
    await expect(page.locator('dialog[data-dialog-id="nested-scan-outer"]')).toBeVisible();

    await page.getByTestId('outer-open-panel').click();
    await expect(page.locator('dialog[data-dialog-id="nested-scan-panel"]')).toBeVisible();

    // Low in the dead space, clear of the panel overlaying the top of the region — the ordinary
    // way focus lands on a `<dialog>` element.
    await page.getByTestId('outer-dead-space').click({ position: { x: 200, y: 230 } });
    expect(await focused(page)).toBe('dialog-nested-scan-outer');

    await page.keyboard.press('Shift+Tab');

    // Reversed, the scan reaches the panel's button first — this tells scoped from unscoped.
    expect(await focused(page)).toBe('outer-last');
  });
});
