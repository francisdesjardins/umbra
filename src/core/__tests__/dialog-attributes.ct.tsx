import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Locator } from '@playwright/test';

/**
 * The library's attribute surface on a `<dialog>`, read back **as a whole set**, in every binding.
 *
 * Every other test names one attribute and asserts it, which proves that key and says nothing about
 * the rest: an extra attribute, or an `aria-label=""` beside a correct `aria-labelledby`, passes
 * them all. Writing the set out found `data-dialog-z` — `stampZIndex` writes that one, not the
 * table — so the surface has two sources, and this is the place that states it.
 */

/**
 * The stacking mirror, from `zIndexBase` in the manager — MUI's `zIndex.dialog`, and a number
 * user-land reads. Asserted by value rather than shape: it is a contract, so moving it should
 * fail here and be a decision rather than a silent drift.
 */
const BASE_Z = '1300';

/**
 * What the library owns on a `<dialog>` — everything else there is the caller's `style`, `class`
 * or `open`. A prefix test rather than a list, so a new attribute inside those namespaces arrives
 * as a failure instead of passing unnoticed.
 */
async function libraryAttributes(dialog: Locator): Promise<Record<string, string>> {
  return dialog.evaluate((node) => {
    const owned: Record<string, string> = {};
    for (const attribute of node.attributes) {
      if (/^(?:data-dialog-|aria-|data-testid$|role$)/.test(attribute.name)) {
        owned[attribute.name] = attribute.value;
      }
    }
    return owned;
  });
}

test.describe('the dialog attribute table reaches the element whole', () => {
  test('a dialog named by nothing carries five attributes and no empty name', async ({
    mount,
    page,
  }) => {
    await mount('AccessibleNameHarness');
    await page.getByRole('button', { name: 'Open Anonymous' }).click();
    const dialog = page.locator('dialog[data-dialog-id="a11y-anonymous"]');
    await expect(dialog).toBeVisible();

    // The five the library always writes, and *only* those: `aria-label=""` or `role="undefined"`
    // would satisfy an audit while telling a screen reader nothing, and each is one key away.
    expect(await libraryAttributes(dialog)).toEqual({
      'aria-busy': 'false',
      'data-dialog-id': 'a11y-anonymous',
      'data-dialog-type': 'dialog',
      'data-dialog-z': BASE_Z,
      'data-testid': 'dialog-a11y-anonymous',
    });
  });

  test('a named, described dialog carries the whole table and nothing beside it', async ({
    mount,
    page,
  }) => {
    await mount('AccessibleNameHarness');
    await page.getByRole('button', { name: 'Open Described' }).click();
    const dialog = page.locator('dialog[data-dialog-id="a11y-described"]');
    await expect(dialog).toBeVisible();

    expect(await libraryAttributes(dialog)).toEqual({
      'aria-busy': 'false',
      'aria-describedby': 'a11y-body',
      'aria-labelledby': 'a11y-heading',
      'data-dialog-id': 'a11y-described',
      'data-dialog-type': 'dialog',
      'data-dialog-z': BASE_Z,
      'data-testid': 'dialog-a11y-described',
      role: 'alertdialog',
    });
  });

  test('a non-modal dialog spells its variant, which is the selector every panel stylesheet uses', async ({
    mount,
    page,
  }) => {
    // `dialog[data-dialog-type='non-modal']` is the documented way user-land CSS reaches every
    // panel at once. Nothing asserted the value at an element, in any binding — a spread that lost
    // it would break every such stylesheet and leave the suite green.
    await mount('ContainedOverlayHarness');
    await page.getByRole('button', { name: 'Open Contained' }).click();
    const dialog = page.locator('dialog[data-dialog-id="contained-overlay"]');
    await expect(dialog).toBeVisible();

    expect(await libraryAttributes(dialog)).toEqual({
      'aria-busy': 'false',
      'data-dialog-id': 'contained-overlay',
      'data-dialog-type': 'non-modal',
      'data-dialog-z': BASE_Z,
      'data-testid': 'dialog-contained-overlay',
    });
  });

  test('Solid writes the same table, from an effect rather than a spread', async ({
    mount,
    page,
  }) => {
    await mount('SolidBasicHarness');
    await page.getByTestId('open').click();
    const dialog = page.locator('dialog[data-dialog-id="solid-basic"]');
    await expect(dialog).toBeVisible();
    // That harness has a `prepare`, so the busy flag is the settle point the read needs.
    await expect(dialog).toHaveAttribute('aria-busy', 'false');

    expect(await libraryAttributes(dialog)).toEqual({
      'aria-busy': 'false',
      'aria-label': 'Solid basic',
      'data-dialog-id': 'solid-basic',
      'data-dialog-type': 'dialog',
      'data-dialog-z': BASE_Z,
      'data-testid': 'dialog-solid-basic',
    });
  });

  test('umbra/vanilla writes it onto markup the caller wrote, adding nothing else', async ({
    mount,
    page,
  }) => {
    // The one binding where the element is not the library's: `setDialogAttributes` writes the
    // table onto a `<dialog>` the story authored, so "nothing else" is a claim about restraint
    // rather than about a spread.
    await mount('VanillaBasicHarness');
    await page.getByTestId('open').click();
    const dialog = page.locator('dialog[data-dialog-id="vanilla-basic"]');
    await expect(dialog).toBeVisible();

    expect(await libraryAttributes(dialog)).toEqual({
      'aria-busy': 'false',
      'aria-label': 'Vanilla basic',
      'data-dialog-id': 'vanilla-basic',
      'data-dialog-type': 'dialog',
      'data-dialog-z': BASE_Z,
      'data-testid': 'dialog-vanilla-basic',
    });
  });
});
