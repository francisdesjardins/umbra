import { expect, test } from '@playwright/experimental-ct-react';
import {
  UseLookupForegroundHarness,
  UseLookupHarness,
  UseLookupUnregisteredHarness,
} from './use-lookup.story';

test.describe('useLookup', () => {
  test('reactively reflects modal open/close state', async ({ mount, page }) => {
    await mount(<UseLookupHarness />);

    // Initially registered but closed
    await expect(page.getByTestId('exists')).toHaveText('true');
    await expect(page.getByTestId('is-open')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');

    // Open the modal — values update reactively
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('is-open')).toHaveText('true');
    await expect(page.getByTestId('is-foreground')).toHaveText('true');

    // Close the modal — values revert
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('is-open')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');
  });

  test('returns null-object default for unregistered ids', async ({ mount, page }) => {
    await mount(<UseLookupUnregisteredHarness />);

    await expect(page.getByTestId('exists')).toHaveText('false');
    await expect(page.getByTestId('is-open')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('is-foreground')).toHaveText('false');
  });

  test('foreground tracking updates reactively across stacked modals', async ({ mount, page }) => {
    await mount(<UseLookupForegroundHarness />);

    // Both closed initially
    await expect(page.getByTestId('a-open')).toHaveText('false');
    await expect(page.getByTestId('b-open')).toHaveText('false');

    // Open A — A is foreground
    await page.getByRole('button', { name: 'Open A' }).click();
    await expect(page.getByTestId('a-open')).toHaveText('true');
    await expect(page.getByTestId('a-fg')).toHaveText('true');
    await expect(page.getByTestId('b-fg')).toHaveText('false');

    // Open B from inside A — B is now foreground
    await page.getByRole('button', { name: 'Open B' }).click();
    await expect(page.getByTestId('b-open')).toHaveText('true');
    await expect(page.getByTestId('b-fg')).toHaveText('true');
    await expect(page.getByTestId('a-fg')).toHaveText('false');

    // Close B — A is foreground again
    await page.getByRole('button', { name: 'Close B' }).click();
    await expect(page.getByTestId('a-fg')).toHaveText('true');
    await expect(page.getByTestId('b-open')).toHaveText('false');
  });
});
