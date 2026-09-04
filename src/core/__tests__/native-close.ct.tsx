import { expect, test } from '../../__tests__/ct-coverage.js';
import { ControlledNativeCloseHarness, NativeFormCloseHarness } from './native-close.story.js';

// `<form method="dialog">` is the platform's own close button, and it runs the element's close
// steps without asking anything. The library's state is a second copy of "is this open", so the
// question is whether the two are still saying the same thing afterwards.

test.describe('a dialog closed by the platform', () => {
  test('leaves the library agreeing that it is closed', async ({ mount, page }) => {
    await mount(<NativeFormCloseHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('visible')).toHaveText('open');

    await page.getByTestId('submit').click();

    expect(
      await page.locator('dialog[data-dialog-id="native-form-close"]').evaluate((node) => {
        return (node as HTMLDialogElement).open;
      })
    ).toBe(false);
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('visible')).toHaveText('closed');
  });
});

test.describe('a controlled surface whose dialog the platform closed', () => {
  test('lowers its own flag rather than putting the dialog back', async ({ mount, page }) => {
    // The reconciliation is authoritative on purpose, so a close the owner never asked for is a
    // dialog straight back on screen unless `onClose` reaches the flag first. It runs on the
    // finalisation, the same pass the phase closes on, which is why the two compose.
    await mount(<ControlledNativeCloseHarness />);
    await page.getByTestId('open-controlled').click();
    await expect(page.getByTestId('controlled-phase')).toHaveText('open');

    await page.getByTestId('submit-controlled').click();

    await expect(page.getByTestId('closes')).toHaveText('1');
    await expect(page.getByTestId('flag')).toHaveText('closed');
    await expect(page.getByTestId('controlled-phase')).toHaveText('closed');
    // The half a flicker would show: it must still be closed a frame later, not reopened.
    await page.waitForTimeout(100);
    await expect(page.getByTestId('controlled-phase')).toHaveText('closed');
    await expect(page.getByTestId('closes')).toHaveText('1');
  });
});
