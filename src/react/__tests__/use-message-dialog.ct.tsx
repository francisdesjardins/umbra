import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  AsyncOpenMessageHarness,
  BasicMessageHarness,
  DataMessageHarness,
  OpenAndWaitMessageHarness,
} from './use-message-dialog.story';

test.describe('useMessageDialog', () => {
  test('dialog is initially closed', async ({ mount, page }) => {
    await mount(<BasicMessageHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('dialog-msg-basic')).not.toBeVisible();
  });

  test('opens and renders content', async ({ mount, page }) => {
    await mount(<BasicMessageHarness />);
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-msg-basic')).toBeVisible();
    await expect(page.getByTestId('dialog-msg-basic')).toContainText('Message content');
  });

  test('closes with reason via handle.close()', async ({ mount, page }) => {
    await mount(<BasicMessageHarness />);
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('dialog-msg-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('closes with reason "cancel" via handle.close()', async ({ mount, page }) => {
    await mount(<BasicMessageHarness />);
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('closes with reason "dismiss" on Escape key', async ({ mount, page }) => {
    await mount(<BasicMessageHarness />);
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('dialog-msg-basic')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('passes isPreparing to render during async prepare', async ({ mount, page }) => {
    await mount(<AsyncOpenMessageHarness />);
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('is-opening')).toHaveText('true');
    await expect(page.getByTestId('is-opening')).toHaveText('false', { timeout: 2000 });
  });

  test('openAndWait resolves with close reason', async ({ mount, page }) => {
    await mount(<OpenAndWaitMessageHarness />);
    await page.getByRole('button', { name: 'Open and Wait' }).click();
    await expect(page.getByTestId('status')).toHaveText('waiting');
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('status')).toHaveText('resolved:done');
  });

  test('supports typed data on close', async ({ mount, page }) => {
    await mount(<DataMessageHarness />);
    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('last-data')).toHaveText('test-user');
  });

  test('can be opened and closed multiple times', async ({ mount, page }) => {
    await mount(<BasicMessageHarness />);

    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('dialog-msg-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    await page.getByRole('button', { name: 'Open Dialog' }).click();
    await expect(page.getByTestId('dialog-msg-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });
});
