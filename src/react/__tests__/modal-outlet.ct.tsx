import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  NoOutletHarness,
  OutletBasicHarness,
  OutletPaintTimingHarness,
  OutletMultiHarness,
  OutletNestedHarness,
  OutletNullModalHarness,
  OutletTeardownHarness,
} from './modal-outlet.story';

test.describe('ModalOutlet', () => {
  test('renders modal via outlet without {Modal} in JSX', async ({ mount, page }) => {
    await mount(<OutletBasicHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('modal-outlet-basic')).toBeVisible();
    await expect(page.getByTestId('modal-outlet-basic')).toContainText('Outlet content');
  });

  test('close works through outlet', async ({ mount, page }) => {
    await mount(<OutletBasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-outlet-basic')).toBeVisible();

    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('modal.Modal is null when outlet is present', async ({ mount, page }) => {
    await mount(<OutletNullModalHarness />);
    await expect(page.getByTestId('modal-is-null')).toHaveText('yes');
  });

  test('modal.Modal is still null after opening inside outlet', async ({ mount, page }) => {
    await mount(<OutletNullModalHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-is-null')).toHaveText('yes');
    await expect(page.getByTestId('modal-outlet-null-check')).toBeVisible();
  });

  test('without outlet — standard {Modal} behaviour', async ({ mount, page }) => {
    await mount(<NoOutletHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('modal-no-outlet')).toBeVisible();

    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('multiple modals in one outlet all render', async ({ mount, page }) => {
    await mount(<OutletMultiHarness />);

    await page.getByRole('button', { name: 'Open A' }).click();
    await expect(page.getByTestId('is-visible-a')).toHaveText('open');
    await expect(page.getByTestId('modal-outlet-multi-a')).toBeVisible();
    await page.getByRole('button', { name: 'Close A' }).click();
    await expect(page.getByTestId('is-visible-a')).toHaveText('closed');
    await expect(page.getByTestId('modal-outlet-multi-a')).not.toBeVisible();

    await page.getByRole('button', { name: 'Open B', exact: true }).click();
    await expect(page.getByTestId('is-visible-b')).toHaveText('open');
    await expect(page.getByTestId('modal-outlet-multi-b')).toBeVisible();
    await page.getByRole('button', { name: 'Close B' }).click();
    await expect(page.getByTestId('is-visible-b')).toHaveText('closed');
  });

  test('nested outlet — inner modal renders via inner outlet', async ({ mount, page }) => {
    await mount(<OutletNestedHarness />);

    await page.getByRole('button', { name: 'Open Inner' }).click();
    await expect(page.getByTestId('is-visible-inner')).toHaveText('open');
    await expect(page.getByTestId('modal-outlet-nested-inner')).toBeVisible();

    await page.getByRole('button', { name: 'Close Inner' }).click();
    await expect(page.getByTestId('is-visible-inner')).toHaveText('closed');
  });

  test('nested outlet — outer modal renders via outer outlet', async ({ mount, page }) => {
    await mount(<OutletNestedHarness />);

    await page.getByRole('button', { name: 'Open Outer' }).click();
    await expect(page.getByTestId('is-visible-outer')).toHaveText('open');
    await expect(page.getByTestId('modal-outlet-nested-outer')).toBeVisible();

    await page.getByRole('button', { name: 'Close Outer' }).click();
    await expect(page.getByTestId('is-visible-outer')).toHaveText('closed');
  });

  test('escape closes modal rendered via outlet', async ({ mount, page }) => {
    await mount(<OutletBasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-outlet-basic')).toBeVisible();
    await expect(page.getByTestId('is-opening')).toHaveText('false');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('can open and close multiple times via outlet', async ({ mount, page }) => {
    await mount(<OutletBasicHarness />);

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-outlet-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-outlet-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });
});

test.describe('ModalOutlet — paint timing', () => {
  test('outlet-rendered content reaches the DOM before the paint of the commit that changed it', async ({
    mount,
    page,
  }) => {
    await mount(<OutletPaintTimingHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByRole('button', { name: 'Increment' }).click();

    // The dialog's DOM at the next frame — the one the user was about to see. The outlet hop must
    // complete within it, so this already matches `count` rather than trailing behind.
    await expect(page.getByTestId('count')).toHaveText('1');
    await expect(page.getByTestId('painted-count')).toHaveText('1');
  });
});

test.describe('ModalOutlet — teardown', () => {
  test('a modal that unmounts while open is dropped from the outlet', async ({ mount, page }) => {
    // A modal whose component goes away must unregister, or the outlet keeps rendering a
    // `<dialog>` for a hook that no longer exists — on screen, in the top layer, driven by nothing.
    await mount(<OutletTeardownHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('modal-outlet-teardown')).toBeVisible();

    await page.getByTestId('remove').click();

    await expect(page.getByTestId('mounted')).toHaveText('no');
    // Gone from the document, not merely hidden: the outlet dropped the node.
    await expect(page.getByTestId('modal-outlet-teardown')).toHaveCount(0);
    // And the top layer with it — a leaked `showModal()` dialog swallows every click behind it.
    await expect(page.locator('dialog:modal')).toHaveCount(0);
  });
});
