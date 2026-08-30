import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { PortalHostGeometryHarness } from './portal-host-geometry.story.js';

// `portal` names a destination two ways — `true` for `document.body`, a function for a host of your
// own — and both are portals. The contained arrangement is `portal: false` and nothing else, which
// is what the placement and the slide geometry now agree on.

const PANEL = 'dialog[data-dialog-id="portal-host-geometry"]';

async function positionOf(page: Page): Promise<string> {
  return page.locator(PANEL).evaluate((node) => {
    return getComputedStyle(node).position;
  });
}

test.describe('a slide panel and where it is positioned from', () => {
  test('a host getter is a portal, so the panel is anchored to the viewport', async ({
    mount,
    page,
  }) => {
    await mount(<PortalHostGeometryHarness named />);
    await page.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    expect(await positionOf(page)).toBe('fixed');
  });

  test('and portal false is the contained arrangement, positioned against its host', async ({
    mount,
    page,
  }) => {
    await mount(<PortalHostGeometryHarness named={false} />);
    await page.getByTestId('open').click();
    await expect(page.locator(PANEL)).toBeVisible();

    expect(await positionOf(page)).toBe('absolute');
  });
});
