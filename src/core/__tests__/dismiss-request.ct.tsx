import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  ControlledClickOutsideHarness,
  ControlledDialogHarness,
  ControlledPanelHarness,
} from './dismiss-request.story.js';

// `onDismissRequest` — every user-initiated dismissal handed to the owner instead of closing on it.
// Every gate before that step is asserted elsewhere; each test here would fail on the un-optioned
// behaviour. The three doors are asserted separately because they were wired separately: routing
// only the dismiss key through the owner is a version of this that passes half the file.

const MODAL = 'dialog[data-dialog-id="controlled-modal"]';
const PANEL = 'dialog[data-dialog-id="controlled-panel"]';
const OUTSIDE_PANEL = 'dialog[data-dialog-id="controlled-click-outside"]';

/** The viewport corner: backdrop for a modal, ordinary page for a panel. Never inside either box. */
const CORNER = { x: 5, y: 5 };

/** Long enough for a close to have run its exit, so "still visible" is an observation. */
const SETTLED_MS = 600;

test.describe('a modal dialog whose Escape is a request', () => {
  test('reports the press and stays open', async ({ mount, page }) => {
    const component = await mount(<ControlledDialogHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(MODAL)).toBeVisible();

    await page.getByTestId('inside').press('Escape');
    await expect(component.getByTestId('requests')).toHaveText('1');

    await page.waitForTimeout(SETTLED_MS);
    await expect(page.locator(MODAL)).toBeVisible();
  });

  test('closes on the press the owner acts on, and not before', async ({ mount, page }) => {
    const component = await mount(<ControlledDialogHarness />);
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
    // Not a dialog-level listener: a panel outside the top layer does not keep focus.
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
    // Why the return value exists: the window listener captures, so a press it takes is one the
    // page never sees. Both halves from one harness, or "the page saw it" passes on a dead one.
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

test.describe('a modal dialog whose backdrop click is a request', () => {
  test('reports the click and stays open', async ({ mount, page }) => {
    // The harness draws no actions, so `dismissOnBackdropClick` defaults to `true` — this dialog
    // would close itself here, and a controlled owner would put it straight back.
    const component = await mount(<ControlledDialogHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(MODAL)).toBeVisible();

    await page.mouse.click(CORNER.x, CORNER.y);

    await expect(component.getByTestId('requests')).toHaveText('1');
    await expect(component.getByTestId('cause')).toHaveText('backdrop-click');
    await page.waitForTimeout(SETTLED_MS);
    await expect(page.locator(MODAL)).toBeVisible();
  });

  test('the owner is told which door, and the key still says its own name', async ({
    mount,
    page,
  }) => {
    // One handler, three doors: worth nothing if they all arrive under one word.
    const component = await mount(<ControlledDialogHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(MODAL)).toBeVisible();

    await page.mouse.click(CORNER.x, CORNER.y);
    await expect(component.getByTestId('cause')).toHaveText('backdrop-click');

    await page.getByTestId('inside').press('Escape');
    await expect(component.getByTestId('cause')).toHaveText('dismiss-key');
    await expect(component.getByTestId('requests')).toHaveText('2');
  });

  test('closes on the backdrop click the owner acts on', async ({ mount, page }) => {
    const component = await mount(<ControlledDialogHarness />);
    await component.getByTestId('open').click();
    await component.getByTestId('allow').click();

    await page.mouse.click(CORNER.x, CORNER.y);

    await expect(page.locator(MODAL)).toBeHidden();
  });
});

test.describe('a non-modal panel whose click-outside is a request', () => {
  test('reports the click and stays open', async ({ mount, page }) => {
    const component = await mount(<ControlledClickOutsideHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(OUTSIDE_PANEL)).toBeVisible();

    await page.mouse.click(CORNER.x, CORNER.y);

    await expect(component.getByTestId('causes')).toHaveText('click-outside');
    await page.waitForTimeout(SETTLED_MS);
    await expect(page.locator(OUTSIDE_PANEL)).toBeVisible();
  });

  test('a click inside the panel is not a dismissal at all', async ({ mount, page }) => {
    // The gate before the door, asserted here so "the owner heard it" cannot pass by hearing
    // everything.
    const component = await mount(<ControlledClickOutsideHarness />);
    await component.getByTestId('open').click();
    await expect(page.locator(OUTSIDE_PANEL)).toBeVisible();

    await page.getByTestId('in-outside-panel').click();

    await expect(component.getByTestId('causes')).toHaveText('');
  });
});
