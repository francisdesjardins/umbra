import { expect, test } from '../../__tests__/ct-coverage.js';
import { NativeFormCloseHarness } from './native-close.story.js';

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
