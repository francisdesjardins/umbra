import { expect, test } from '@playwright/experimental-ct-react';
import {
  SolidBasicHarness,
  SolidDeclarationHarness,
  SolidMessageHarness,
  SolidOutletHarness,
  SolidSlideHarness,
} from './solid-modal.story';

/**
 * `umbra/solid`, against a real browser and a real `<dialog>`.
 *
 * These are deliberately the same assertions `use-modal.ct.tsx` makes of the React binding, in
 * the same order — because the claim the second binding exists to support is that the surface is
 * the same one. Where a test has no React counterpart, it is testing something only a
 * fine-grained renderer can get wrong.
 */

test.describe('useModal (Solid)', () => {
  test('modal is initially closed', async ({ mount, page }) => {
    await mount(<SolidBasicHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('modal-solid-basic')).not.toBeVisible();
  });

  test('opens when open() is called, and reaches the top layer', async ({ mount, page }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('modal-solid-basic')).toBeVisible();
    await expect(page.getByTestId('modal-solid-basic')).toContainText('Solid content');
    // `showModal()`, not `show()` — the same variant React's default is.
    await expect(page.locator('dialog[data-modal-id="solid-basic"]:modal')).toHaveCount(1);
  });

  test('an action closes with its own reason', async ({ mount, page }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('Escape dismisses', async ({ mount, page }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-basic')).toBeVisible();

    await page.keyboard.press('Escape');

    // `Escape` is the Cancel action's declared hotkey, so the action wins over dismissal — the
    // same precedence React's binding gives it.
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });

  test('an action hotkey runs the same path its button does', async ({ mount, page }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-basic')).toBeVisible();

    await page.keyboard.press('Enter');

    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('focusOnOpen claims the opening focus', async ({ mount, page }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByRole('button', { name: 'Confirm' })).toBeFocused();
  });

  test('a running action is live in the render args and disables every button', async ({
    mount,
    page,
  }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();

    // Nothing re-renders here: `hasRunningAction` is a getter, and the two places that read it
    // are the only two that update. If it had been captured instead of tracked, both would be
    // stuck on the value they had when the modal opened.
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('running')).toHaveText('running');
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('isPreparing is live while prepare runs', async ({ mount, page }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open-slow').click();

    await expect(page.getByTestId('preparing')).toHaveText('preparing');
    await expect(page.getByTestId('preparing')).toHaveText('ready');
  });

  test('openAndWait resolves with how it closed', async ({ mount, page }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open-and-wait').click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByTestId('last-reason')).toHaveText('awaited:cancel');
  });

  test('a removed action stops counting — backdrop dismissal comes back', async ({
    mount,
    page,
  }) => {
    // The one thing React's binding cannot get wrong and this one can. React expires an action's
    // declaration by re-running `render` wholesale; here the button is removed by its own
    // conditional and nothing re-runs, so the engine only learns about it from the `onCleanup`
    // the Solid action factory registers. Backdrop dismissal is what makes that observable: it is
    // opt-out without actions and opt-in with them.
    await mount(<SolidDeclarationHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-declaration')).toBeVisible();

    // With an action drawn, a backdrop click must not dismiss.
    await page.mouse.click(5, 5);
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('drop-action').click();
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveCount(0);

    await page.mouse.click(5, 5);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });

  test('an outlet renders the dialog and Modal becomes null', async ({ mount, page }) => {
    await mount(<SolidOutletHarness />);
    await expect(page.getByTestId('modal-slot')).toHaveText('null');

    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-outlet')).toBeVisible();
    await expect(page.getByTestId('modal-solid-outlet')).toContainText('Rendered by the outlet');
  });
});

test.describe('template hooks (Solid)', () => {
  test('useSlideModal hands the direction to its render context', async ({ mount, page }) => {
    await mount(<SolidSlideHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('direction')).toHaveText('right');
    await expect(page.getByTestId('modal-solid-slide')).toBeVisible();
  });

  test('the template’s context stays live, because it is merged and not spread', async ({
    mount,
    page,
  }) => {
    // The Solid-only failure this exists for. `useSlideModal` composes `args` with `direction`
    // through `mergeProps`; a spread would read every getter once and hand the template a frozen
    // copy, so `isPreparing` would go in and never come back out.
    await mount(<SolidSlideHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('slide-preparing')).toHaveText('preparing');
    await expect(page.getByTestId('slide-preparing')).toHaveText('ready');
  });

  test('the manager hooks are live from outside the panel', async ({ mount, page }) => {
    // `useDialogManager` returns an object of getters and `useLookup` an accessor — deliberately
    // different shapes, for a reason the types force. Both have to update, or the difference is
    // just an inconsistency.
    await mount(<SolidSlideHarness />);
    await expect(page.getByTestId('open-count')).toHaveText('0');
    await expect(page.getByTestId('lookup-type')).toHaveText('none');

    await page.getByTestId('open').click();

    await expect(page.getByTestId('open-count')).toHaveText('1');
    // A template names itself, which is what makes this readable at all.
    await expect(page.getByTestId('lookup-type')).toHaveText('slide');
  });

  test('useMessageModal opens, closes with its action’s reason, and reports its type', async ({
    mount,
    page,
  }) => {
    await mount(<SolidMessageHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('modal-solid-message')).toContainText('Message body');
    await expect(page.getByTestId('lookup-type')).toHaveText('message');

    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });
});
