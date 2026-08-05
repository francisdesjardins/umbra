import { expect, test } from '@playwright/experimental-ct-react';
import { UseStoreHarness } from './use-store.story';

test.describe('useStore', () => {
  test('renders the initial snapshot through all three overloads', async ({ mount }) => {
    const component = await mount(<UseStoreHarness />);
    await expect(component.getByTestId('whole-count')).toHaveText('0');
    await expect(component.getByTestId('selected-count')).toHaveText('0');
    await expect(component.getByTestId('pair')).toHaveText('0:idle');
  });

  test('a store method updates every subscribed overload', async ({ mount }) => {
    const component = await mount(<UseStoreHarness />);
    await component.getByRole('button', { name: 'Increment' }).click();
    await component.getByRole('button', { name: 'Increment' }).click();
    await expect(component.getByTestId('whole-count')).toHaveText('2');
    await expect(component.getByTestId('selected-count')).toHaveText('2');
    await expect(component.getByTestId('pair')).toHaveText('2:idle');
  });

  test('selector slices update independently', async ({ mount }) => {
    const component = await mount(<UseStoreHarness />);
    await component.getByRole('button', { name: 'Set Label' }).click();
    // Label change flows into the shallowEqual pair but not the count slice
    await expect(component.getByTestId('pair')).toHaveText('0:busy');
    await expect(component.getByTestId('selected-count')).toHaveText('0');
  });

  test('unrelated field changes still render through the whole-snapshot overload', async ({
    mount,
  }) => {
    const component = await mount(<UseStoreHarness />);
    await component.getByRole('button', { name: 'Bump Other' }).click();
    await expect(component.getByTestId('other')).toHaveText('1');
    // Sliced values are untouched
    await expect(component.getByTestId('selected-count')).toHaveText('0');
    await expect(component.getByTestId('pair')).toHaveText('0:idle');
  });
});
