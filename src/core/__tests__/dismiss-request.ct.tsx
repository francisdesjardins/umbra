import { expect, test } from '../../__tests__/ct-coverage.js';
import { ControlledModalHarness, ControlledPanelHarness } from './dismiss-request.story.js';

/**
 * `onDismissRequest` — the dismiss key handed to the owner instead of closing on it.
 *
 * Every gate before that last step is unchanged and is asserted elsewhere; what is measured here is
 * only the step that moved. Each test is written so that the un-optioned behaviour would fail it:
 * a dialog that closed itself is exactly what "still visible after Escape" refuses.
 */

const MODAL = 'dialog[data-modal-id="controlled-modal"]';
const PANEL = 'dialog[data-modal-id="controlled-panel"]';

/** Long enough for a close to have run its exit, so "still visible" is an observation. */
const SETTLED_MS = 600;

test.describe('a modal dialog whose Escape is a request', () => {
  test('reports the press and stays open', async ({ mount, page }) => {
    const component = await mount(<ControlledModalHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(MODAL)).toBeVisible();

    await page.getByTestId('inside').press('Escape');
    await expect(component.getByTestId('requests')).toHaveText('1');

    await page.waitForTimeout(SETTLED_MS);
    await expect(page.locator(MODAL)).toBeVisible();
  });

  test('closes on the press the owner acts on, and not before', async ({ mount, page }) => {
    const component = await mount(<ControlledModalHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(MODAL)).toBeVisible();

    await page.getByTestId('inside').press('Escape');
    await page.waitForTimeout(SETTLED_MS);
    await expect(page.locator(MODAL)).toBeVisible();

    await component.getByTestId('allow').click();
    await page.getByTestId('inside').press('Escape');

    await expect(page.locator(MODAL)).toBeHidden();
    await expect(component.getByTestId('requests')).toHaveText('2');
  });
});

test.describe('a non-modal panel whose Escape is a request', () => {
  test('hears the press from outside itself', async ({ mount, page }) => {
    // The case that cannot be a dialog-level listener: a panel outside the top layer does not keep
    // focus, so the press is made on a button beside it and has to reach the panel anyway.
    const component = await mount(<ControlledPanelHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('outside').focus();
    await page.getByTestId('outside').press('Escape');

    await expect(component.getByTestId('requests')).toHaveText('1');
    await page.waitForTimeout(SETTLED_MS);
    await expect(page.locator(PANEL)).toBeVisible();
  });

  test('a declined press is left travelling', async ({ mount, page }) => {
    // The negative half, and the reason the return value exists at all: the window listener
    // captures, so a press it takes is a press the page never sees. Both directions are asserted
    // from the same harness — one press claimed, the next declined — or "the page saw it" would
    // pass on a listener that never claimed anything.
    const component = await mount(<ControlledPanelHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('in-panel').press('Escape');
    await expect(component.getByTestId('requests')).toHaveText('1');
    await expect(component.getByTestId('page-saw')).toHaveText('0');

    await component.getByTestId('decline').click();
    await page.getByTestId('in-panel').press('Escape');

    await expect(component.getByTestId('page-saw')).toHaveText('1');
    await expect(component.getByTestId('requests')).toHaveText('1');
    await expect(page.locator(PANEL)).toBeVisible();
  });
});
