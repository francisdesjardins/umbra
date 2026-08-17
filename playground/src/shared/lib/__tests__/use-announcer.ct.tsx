import { expect, test } from '@playwright/experimental-ct-react';
import { UseAnnouncerHarness } from './use-announcer.story';

test.describe('useAnnouncer', () => {
  test('the region exists, empty, before it has anything to say', async ({ mount }) => {
    // A live region announces *changes*, so one born holding its text is missed.
    const component = await mount(<UseAnnouncerHarness />);
    const region = component.getByRole('status');

    await expect(region).toBeAttached();
    await expect(region).toHaveText('');
  });

  test('an announcement lands in the region', async ({ mount }) => {
    const component = await mount(<UseAnnouncerHarness />);

    await component.getByTestId('announce').click();

    await expect(component.getByRole('status')).toHaveText('Changes saved');
  });

  test('the same message twice is two changes, not none', async ({ mount, page }) => {
    // `announce` clears and rewrites a frame later; without it "Saved" → "Saved" never changes.
    const component = await mount(<UseAnnouncerHarness />);
    await expect(component.getByRole('status')).toBeAttached();
    await page.evaluate(() => {
      const region = document.querySelector('[role="status"]');
      if (region === null) {
        throw new Error('no region');
      }
      const seen: string[] = [];
      Reflect.set(window, '__announcements', seen);
      new MutationObserver(() => {
        const text = region.textContent;
        if (text !== '') {
          seen.push(text);
        }
      }).observe(region, { childList: true, characterData: true, subtree: true });
    });

    await component.getByTestId('announce').click();
    await expect(component.getByRole('status')).toHaveText('Changes saved');
    await component.getByTestId('announce').click();
    await expect(component.getByRole('status')).toHaveText('Changes saved');

    const announcements = await page.evaluate(() => {
      return Reflect.get(window, '__announcements') as string[];
    });
    expect(announcements).toEqual(['Changes saved', 'Changes saved']);
  });
});
