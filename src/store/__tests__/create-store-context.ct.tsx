import { expect, test } from '@playwright/experimental-ct-react';
import { StoreContextHarness } from './create-store-context.story';

test.describe('createStoreContext', () => {
  test('consumers under one Provider share the same store', async ({ mount }) => {
    const component = await mount(<StoreContextHarness />);
    await component.getByRole('button', { name: 'Increment A' }).click();
    await expect(component.getByTestId('a-first')).toHaveText('1');
    await expect(component.getByTestId('a-second')).toHaveText('1');
  });

  test('each Provider owns an isolated store instance', async ({ mount }) => {
    const component = await mount(<StoreContextHarness />);
    await component.getByRole('button', { name: 'Increment A' }).click();
    await component.getByRole('button', { name: 'Increment A' }).click();
    // B's store is untouched by A's mutations
    await expect(component.getByTestId('a-first')).toHaveText('2');
    await expect(component.getByTestId('b-count')).toHaveText('0');

    await component.getByRole('button', { name: 'Increment B' }).click();
    await expect(component.getByTestId('b-count')).toHaveText('1');
    await expect(component.getByTestId('a-first')).toHaveText('2');
  });
});
