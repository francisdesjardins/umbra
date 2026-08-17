import { expect, test } from '@playwright/experimental-ct-react';
import { UseFormHarness } from './use-form.story';

/**
 * `useForm` — the stand-in the two `/ui-integrations` form cards share. Asserted here are the
 * hook's three decisions: when a message may appear, that a submit is refused until the values are
 * clean, and that the `aria-describedby` it hands out points at something rendered.
 */

test.describe('when a message is allowed to appear', () => {
  test('stays quiet while the field is still being typed into', async ({ mount, page }) => {
    // Telling someone their email is invalid on the third character is true and useless.
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('email').fill('no-at-sign');

    await expect(c.getByTestId('email-error')).toHaveText('');
  });

  test('speaks once the field is blurred', async ({ mount, page }) => {
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('email').fill('no-at-sign');
    await page.getByTestId('email').blur();

    await expect(c.getByTestId('email-error')).toHaveText('Invalid email');
  });

  test('says nothing about a field the user never touched', async ({ mount, page }) => {
    // Reported from the playground: any button press blurs whatever the dialog autofocused, so a
    // blur-on-leave rule complains about a field nobody typed in.
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('name').focus();
    await page.getByTestId('name').blur();

    await expect(c.getByTestId('name-error')).toHaveText('');
  });

  test('a blurred field says nothing when it is valid', async ({ mount, page }) => {
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('email').fill('a@b.co');
    await page.getByTestId('email').blur();

    await expect(c.getByTestId('email-error')).toHaveText('');
  });

  test('a submit reveals every wrong field at once', async ({ mount, page }) => {
    // A submit says the user is finished; drip-feeding one problem at a time is three round trips.
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('submit').click();

    await expect(c.getByTestId('name-error')).toHaveText('Name is required');
    await expect(c.getByTestId('email-error')).toHaveText('Invalid email');
    await expect(c.getByTestId('agree-error')).toHaveText('You must agree');
  });
});

test.describe('the submit gate', () => {
  test('does not run the callback while anything is wrong', async ({ mount, page }) => {
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('submit').click();

    await expect(c.getByTestId('submitted')).toHaveText('');
  });

  test('runs it once every field is clean', async ({ mount, page }) => {
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('name').fill('Ada');
    await page.getByTestId('email').fill('ada@example.com');
    await page.getByTestId('agree').check();
    await page.getByTestId('submit').click();

    await expect(c.getByTestId('submitted')).toHaveText('ada@example.com');
  });

  test('a value `field` refuses still gates the submit', async ({ mount, page }) => {
    // `agree` is a boolean, so `field('agree')` would not compile and the harness uses `set` — the
    // validator sees it either way, which is the point of the two doors.
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('name').fill('Ada');
    await page.getByTestId('email').fill('ada@example.com');
    await page.getByTestId('submit').click();

    await expect(c.getByTestId('submitted')).toHaveText('');
    await expect(c.getByTestId('agree-error')).toHaveText('You must agree');
  });
});

test.describe('what the field props promise', () => {
  test('describedby is absent while clean and resolves once it is not', async ({ mount, page }) => {
    // A describedby pointing at an element that is not rendered resolves to nothing.
    const c = await mount(<UseFormHarness />);
    await expect(c.getByTestId('described-by')).toHaveText('none');

    await page.getByTestId('email').fill('nope');
    await page.getByTestId('email').blur();

    await expect(c.getByTestId('described-by')).toHaveText('harness-email-error');
    const target = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="email"]');
      const id = input?.getAttribute('aria-describedby');
      return id === null || id === undefined
        ? null
        : (document.getElementById(id)?.textContent ?? null);
    });
    expect(target).toBe('Invalid email');
  });

  test('reset forgets the values and every message with them', async ({ mount, page }) => {
    const c = await mount(<UseFormHarness />);
    await page.getByTestId('email').fill('nope');
    await page.getByTestId('email').blur();
    await expect(c.getByTestId('email-error')).toHaveText('Invalid email');

    await page.getByTestId('reset').click();

    await expect(c.getByTestId('email')).toHaveValue('');
    await expect(c.getByTestId('email-error')).toHaveText('');
  });
});
