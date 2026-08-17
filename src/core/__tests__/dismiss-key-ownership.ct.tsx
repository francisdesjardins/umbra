import { expect, test } from '../../__tests__/ct-coverage.js';
import { DismissKeyOwnershipHarness, KeyClaimProbeHarness } from './dismiss-key-ownership.story.js';

// The dismiss key over an overlay that answers it itself. A non-modal dialog listens at the window
// in capture, which is what makes the key work wherever focus is — and what would take it away.

const PANEL = 'dialog[data-modal-id="dismiss-ownership"]';

// Long enough for a close to finish its exit and run `onClose`. Every "stands down" assertion is a
// positive one and Playwright retries only failures, so waiting first makes it an observation.
const SETTLED_MS = 600;

test.describe('the dismiss key stands down', () => {
  test('for a control that reports an open list', async ({ mount, page }) => {
    const component = await mount(<DismissKeyOwnershipHarness />);
    await component.getByTestId('open-panel').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('combobox').click();
    // Asserted, not assumed: the guard reads this, so an unset harness would pass for nothing.
    await expect(page.getByTestId('combobox')).toHaveAttribute('aria-expanded', 'true');

    await page.getByTestId('combobox').press('Escape');
    await page.waitForTimeout(SETTLED_MS);

    await expect(page.locator(PANEL)).toBeVisible();
    await expect(component.getByTestId('closed-flag')).toHaveText('open');
  });

  test('for a popup portaled out of the dialog that holds focus', async ({ mount, page }) => {
    // The case a control-level check misses: the popup carries no `aria-expanded` of its own.
    const component = await mount(<DismissKeyOwnershipHarness />);
    await component.getByTestId('open-panel').click();
    await page.getByTestId('open-picker').click();
    await expect(page.getByTestId('picker-popup')).toBeVisible();

    await page.getByTestId('picker-day').press('Escape');
    await page.waitForTimeout(SETTLED_MS);

    await expect(page.locator(PANEL)).toBeVisible();
    await expect(component.getByTestId('closed-flag')).toHaveText('open');
  });
});

test.describe('the dismiss key still lands', () => {
  test('on a press inside the dialog that nothing else claimed', async ({ mount, page }) => {
    // The half that keeps the guard honest: a dialog is a `role="dialog"`, so a rule looking only
    // for a popup role would suppress every press inside it and pass the two tests above.
    const component = await mount(<DismissKeyOwnershipHarness />);
    await component.getByTestId('open-panel').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await page.getByTestId('plain-button').press('Escape');

    await expect(component.getByTestId('closed-flag')).toHaveText('closed');
  });

  test('on a press outside the dialog, which is why it listens at the window', async ({
    mount,
    page,
  }) => {
    const component = await mount(<DismissKeyOwnershipHarness />);
    await component.getByTestId('open-panel').click();
    await expect(page.locator(PANEL)).toBeVisible();

    await component.getByTestId('open-panel').press('Escape');

    await expect(component.getByTestId('closed-flag')).toHaveText('closed');
  });
});

test('the predicate itself answers the two clauses and nothing else', async ({ mount }) => {
  // Asked directly: a caller imports the function, not the listener around it.
  const component = await mount(<KeyClaimProbeHarness />);
  await component.getByTestId('ask').click();

  await expect(component.getByTestId('answers')).toHaveText(
    // An ordinary control inside the scope is unclaimed — excluding `role="dialog"` is why.
    'plain=false expanded=true listbox=true nothing=false'
  );
});
