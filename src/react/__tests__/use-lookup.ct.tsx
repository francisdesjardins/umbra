import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  UseLookupForegroundHarness,
  UseLookupHarness,
  UseLookupPreparingHarness,
  UseLookupUnregisteredHarness,
} from './use-lookup.story';

test.describe('useLookup', () => {
  test('reactively reflects modal open/close state', async ({ mount, page }) => {
    await mount(<UseLookupHarness />);

    await expect(page.getByTestId('exists')).toHaveText('true');
    await expect(page.getByTestId('is-visible')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');

    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('true');
    await expect(page.getByTestId('is-foreground')).toHaveText('true');

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');
  });

  test('returns null-object default for unregistered ids', async ({ mount, page }) => {
    await mount(<UseLookupUnregisteredHarness />);

    await expect(page.getByTestId('exists')).toHaveText('false');
    await expect(page.getByTestId('is-visible')).toHaveText('false');
    await expect(page.getByTestId('is-preparing')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('is-foreground')).toHaveText('false');
  });

  test('a watcher outside the dialog can tell "open" from "ready"', async ({ mount, page }) => {
    await mount(<UseLookupPreparingHarness />);
    await expect(page.getByTestId('is-preparing')).toHaveText('false');

    await page.getByRole('button', { name: 'Open' }).click();

    // `phase` is already 'open' — it describes the element, and 'opening' lasts one frame however
    // long prepare takes; the dialog is up and blocking while its content is not ready.
    await expect(page.getByTestId('is-visible')).toHaveText('true');
    await expect(page.getByTestId('is-preparing')).toHaveText('true');
    await expect(page.getByTestId('phase')).toHaveText('open');

    await page.getByRole('button', { name: 'Finish preparing' }).click();

    await expect(page.getByTestId('is-preparing')).toHaveText('false');
    await expect(page.getByTestId('is-visible')).toHaveText('true');
  });

  test('preparing state clears on close and arms again on the next open', async ({
    mount,
    page,
  }) => {
    await mount(<UseLookupPreparingHarness />);

    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('is-preparing')).toHaveText('true');

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('false');
    await expect(page.getByTestId('is-preparing')).toHaveText('false');

    // A modal closed while still preparing must not come back reporting itself ready.
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('is-preparing')).toHaveText('true');
  });

  test('foreground tracking updates reactively across stacked modals', async ({ mount, page }) => {
    await mount(<UseLookupForegroundHarness />);

    await expect(page.getByTestId('a-open')).toHaveText('false');
    await expect(page.getByTestId('b-open')).toHaveText('false');

    await page.getByRole('button', { name: 'Open A' }).click();
    await expect(page.getByTestId('a-open')).toHaveText('true');
    await expect(page.getByTestId('a-fg')).toHaveText('true');
    await expect(page.getByTestId('b-fg')).toHaveText('false');

    // Open B from inside A — B is now foreground
    await page.getByRole('button', { name: 'Open B' }).click();
    await expect(page.getByTestId('b-open')).toHaveText('true');
    await expect(page.getByTestId('b-fg')).toHaveText('true');
    await expect(page.getByTestId('a-fg')).toHaveText('false');

    await page.getByRole('button', { name: 'Close B' }).click();
    await expect(page.getByTestId('a-fg')).toHaveText('true');
    await expect(page.getByTestId('b-open')).toHaveText('false');
  });
});
