import { expect, test } from '@playwright/experimental-ct-react';
import {
  VanillaBasicHarness,
  VanillaFailingActionHarness,
  VanillaShadowRootHarness,
  VanillaUnbindHarness,
} from './bind-dialog.story';

/**
 * `umbra/vanilla`, against a real browser and a `<dialog>` the caller wrote.
 *
 * Deliberately the same assertions the other two bindings' suites make, because the claim is that
 * a dialog driven this way is not a lesser dialog — the top layer, the dismiss key, the hotkeys,
 * the opening focus and the typed close are all the ones the hook bindings run. Where a test has
 * no counterpart, it is testing what only a controller has: binding an action to a button that
 * already exists, and unbinding it.
 */

test.describe('bindDialog', () => {
  test('leaves the caller’s dialog closed until asked', async ({ mount, page }) => {
    await mount(<VanillaBasicHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('modal-vanilla-basic')).not.toBeVisible();
  });

  test('opens it into the top layer, and stamps the styling contract on it', async ({
    mount,
    page,
  }) => {
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('is-visible')).toHaveText('open');
    // `showModal()`, not `show()` — the same default variant the hook bindings have.
    await expect(page.locator('dialog[data-modal-id="vanilla-basic"]:modal')).toHaveCount(1);
    // The attributes user-land CSS reaches a dialog by, written onto markup the binding did not
    // create.
    await expect(page.getByTestId('modal-vanilla-basic')).toHaveAttribute(
      'data-modal-type',
      'modal'
    );
    await expect(page.getByTestId('modal-vanilla-basic')).toHaveAttribute(
      'aria-label',
      'Vanilla basic'
    );
    await expect(page.getByTestId('modal-vanilla-basic')).toContainText('Vanilla content');
  });

  test('a bound action closes with its own reason', async ({ mount, page }) => {
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('an action’s hotkey runs the same path its button does', async ({ mount, page }) => {
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();

    await page.keyboard.press('Enter');

    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('Escape defers to the action that claimed it', async ({ mount, page }) => {
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();

    await page.keyboard.press('Escape');

    // Not `dismiss`: Cancel declared Escape as its hotkey, so the action wins — the same
    // precedence the hook bindings give it.
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('focusOnOpen claims the opening focus on a button it never rendered', async ({
    mount,
    page,
  }) => {
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByRole('button', { name: 'Confirm' })).toBeFocused();
  });

  test('a running action is pushed onto every bound button', async ({ mount, page }) => {
    // The half a renderer does elsewhere: with nothing re-rendering, `bindAction` subscribes and
    // writes `disabled` / `data-loading` / `aria-busy` itself.
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();

    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'data-loading',
      'true'
    );
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });

  test('openAndWait resolves with how it closed', async ({ mount, page }) => {
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open-and-wait').click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByTestId('last-reason')).toHaveText('awaited:cancel');
  });

  test('unbinding an action retires it — backdrop dismissal comes back', async ({
    mount,
    page,
  }) => {
    // The controller's counterpart to React's render pass and Solid's `onCleanup`: here the
    // caller says when an action is gone, and the unbind is what says it. `hasActions()` decides
    // whether a backdrop click dismisses, which is what makes it observable from outside.
    await mount(<VanillaUnbindHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-vanilla-unbind')).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('drop-action').click();
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveCount(0);

    await page.mouse.click(5, 5);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });

  test('a failed action hands focus back to the button that ran it', async ({ mount, page }) => {
    // Regression: `bindAction` disables the button from its own synchronous engine subscriber,
    // and the caller registers that subscriber before the focus coordinator exists — so reading
    // `activeElement` when the action starts found an already-blurred button and the retry landed
    // on the dialog. Found by putting a dialog in a shadow root, but never a shadow-root problem:
    // this harness is plain markup.
    await mount(<VanillaFailingActionHarness />);
    await page.getByTestId('open').click();

    // The opening focus is Cancel, so a pass here cannot be "focus never moved".
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();

    await page.getByTestId('submit').click();
    await expect(page.getByTestId('error')).toHaveText('submit failed');

    await expect(page.getByTestId('submit')).toBeFocused();
  });
  test('a dialog in a shadow root gets the library backdrop and its opening focus', async ({
    mount,
    page,
  }) => {
    // `adoptedStyleSheets` does not cross a shadow boundary and `document.activeElement`
    // answers with the host, so both of these were silently wrong: the dialog fell back to the
    // UA backdrop, and the focus policy concluded focus had left the dialog on every check.
    await mount(<VanillaShadowRootHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    const measured = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="shadow-host"]')?.shadowRoot;
      const dialog = root?.querySelector('dialog');
      return {
        inTopLayer: dialog?.matches(':modal') ?? false,
        backdrop: dialog ? getComputedStyle(dialog, '::backdrop').backgroundColor : null,
        focused: root?.activeElement?.id ?? null,
      };
    });

    expect(measured.inTopLayer).toBe(true);
    // The library own value, not merely "something painted" — Chrome ships a UA default, so a
    // non-transparent result would pass while proving nothing.
    expect(measured.backdrop).toBe('rgba(0, 0, 0, 0.7)');
    expect(measured.focused).toBe('confirm');
  });
});
