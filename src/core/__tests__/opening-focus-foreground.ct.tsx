import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  OpeningFocusForegroundHarness,
  ReclaimFocusHarness,
  ReclaimWithoutClaimHarness,
  ShadowReclaimWithoutClaimHarness,
} from './opening-focus-foreground.story.js';

/**
 * The opening focus defers to the foreground: a dialog opening underneath must not take the
 * keyboard from the one in front, which is left focusless — no keydown heard, dismiss key dead.
 */

test('a panel opening underneath does not take focus from the dialog in front', async ({
  mount,
  page,
}) => {
  const component = await mount(<OpeningFocusForegroundHarness />);
  await component.getByTestId('off-open-interruption').click();
  const interruption = page.locator('dialog[data-modal-id="off-interruption"]');
  await expect(interruption).toBeVisible();
  await expect(page.locator(String.raw`dialog[data-modal-id="off-interruption"]`)).toBeVisible();

  await page.getByTestId('off-open-panel').click();
  await expect(page.locator('dialog[data-modal-id="off-panel"]')).toBeVisible();

  // The discriminating claim: the panel asked for `focusOnOpen` and must be refused, so what
  // matters is that focus is still inside the interruption rather than on any given element.
  const holder = await page.evaluate(() => {
    const active = document.activeElement;
    if (
      document.querySelector('dialog[data-modal-id="off-interruption"]')?.contains(active) === true
    ) {
      return 'inside the interruption';
    }
    return `on ${active?.getAttribute('data-testid') ?? active?.tagName ?? 'nothing'}`;
  });
  expect(holder).toBe('inside the interruption');
});

test('the same panel takes its opening focus when nothing is in front', async ({ mount, page }) => {
  // The other half, or the fix would just be "never focus a non-modal dialog".
  const component = await mount(<OpeningFocusForegroundHarness />);
  await component.getByTestId('off-open-panel-alone').click();
  await expect(page.locator('dialog[data-modal-id="off-panel"]')).toBeVisible();

  await expect(page.getByTestId('off-panel-button')).toBeFocused();
});

test.describe('taking the focus back', () => {
  test('it goes where focus actually was, not to the focusOnOpen claim', async ({
    mount,
    page,
  }) => {
    // A non-modal panel arriving underneath: nothing is re-shown, so only the reclaim can restore.
    const component = await mount(<ReclaimFocusHarness behindIsModal={false} />);
    await component.getByTestId('rf-open-front').click();
    // Its own claim, honoured on the opening — the state the reclaim must not simply repeat.
    await expect(page.getByTestId('rf-front-claimed')).toBeFocused();

    await page.getByTestId('rf-schedule').click();
    await page.getByTestId('rf-front-input').click();
    await page.getByTestId('rf-front-input').fill('half a sentence');
    await expect(page.getByTestId('rf-front-input')).toBeFocused();

    // The stack moves under it: the platform's focusing steps take the keyboard away.
    await expect(page.locator('dialog[data-modal-id="rf-behind"]')).toBeVisible();

    // Handed back to the field with what was typed still in it. A reclaim that re-honoured the
    // claim would put the ring on "Done" and lose the caret — what the first implementation did.
    await expect(page.getByTestId('rf-front-input')).toBeFocused();
    await expect(page.getByTestId('rf-front-input')).toHaveValue('half a sentence');
  });

  test('the modal left behind by a close ends up with the keyboard', async ({ mount, page }) => {
    // Two modal dialogs with a policy keeping one underneath. **This characterises rather than
    // fixes**: a raise *re-records* the platform's previously-focused element, so the front
    // dialog's native close hands the keyboard back into the one behind. Measured, not deduced —
    // it passes against the implementation predating the reclaim, over a three-link chain.
    const component = await mount(<ReclaimFocusHarness behindIsModal={true} />);
    await component.getByTestId('rf-open-front').click();
    await page.getByTestId('rf-schedule').click();
    await expect(page.locator('dialog[data-modal-id="rf-behind"]')).toBeVisible();

    // It declined its opening focus, correctly — the policy put it underneath.
    await expect(page.getByTestId('rf-behind-claimed')).not.toBeFocused();

    await page.getByTestId('rf-close-front').click();
    await expect(page.locator('dialog[data-modal-id="rf-front"]')).not.toBeVisible();

    // Now it is in front, so its `focusOnOpen` is the floor — nothing ever held focus inside it.
    // Without this the native close hands the keyboard to what was focused before the *front* one.
    await expect(page.getByTestId('rf-behind-claimed')).toBeFocused();
  });

  test('and its hotkeys work, which is what the focus is for', async ({ mount, page }) => {
    const component = await mount(<ReclaimFocusHarness behindIsModal={true} />);
    await component.getByTestId('rf-open-front').click();
    await page.getByTestId('rf-schedule').click();
    await expect(page.locator('dialog[data-modal-id="rf-behind"]')).toBeVisible();
    await page.getByTestId('rf-close-front').click();
    await expect(page.locator('dialog[data-modal-id="rf-front"]')).not.toBeVisible();

    // Why the focus matters: a dialog with no focus inside hears no keydown, so every hotkey it
    // declares is dead except Escape, which rides the native `cancel` and is focus-independent.
    await page.keyboard.press('Enter');

    await expect(page.locator('dialog[data-modal-id="rf-behind"]')).not.toBeVisible();
  });
});

test.describe('a dialog that claimed no opening focus still gets its keyboard back', () => {
  test('a panel opening underneath does not leave focus on the body', async ({ mount, page }) => {
    // The defect: `reclaimFocus` aimed only at a `focusOnOpen` marker then fell through to
    // `dialog.focus()`, which an open `<dialog>` refuses — keyboard on `<body>`, Tab reaching none.
    const component = await mount(<ReclaimWithoutClaimHarness />);
    await component.getByTestId('open-both').click();

    await expect(page.locator('dialog[data-modal-id="reclaim-no-claim"]')).toBeVisible();
    await expect(page.locator('dialog[data-modal-id="reclaim-panel"]')).toBeVisible();

    // Asserted as "nothing outside the modal holds it", which stays true wherever inside it landed.
    await expect(
      page.locator(
        ':focus:not(dialog[data-modal-id="reclaim-no-claim"], dialog[data-modal-id="reclaim-no-claim"] *)'
      )
    ).toHaveCount(0);
    await expect(page.locator('dialog[data-modal-id="reclaim-no-claim"] :focus')).toHaveCount(1);
  });

  test('and it is the first control, not the last, inside a shadow root', async ({
    mount,
    page,
  }) => {
    // Asked of the `document`, a shadow root answers with the *host*, so the confirmation fails on
    // a candidate that took focus and the scan walks on to the last control. Read via the root.
    const component = await mount(<ShadowReclaimWithoutClaimHarness />);
    await component.getByTestId('shadow-open-both').click();

    await expect(page.locator('dialog[data-modal-id="shadow-reclaim-no-claim"]')).toBeVisible();
    await expect(page.locator('dialog[data-modal-id="shadow-reclaim-panel"]')).toBeVisible();

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const host = document.querySelector('[data-testid="shadow-reclaim-host"]');
          return host?.shadowRoot?.activeElement?.getAttribute('data-testid') ?? null;
        });
      })
      .toBe('shadow-claimless-cancel');
  });
});

test.describe('the opening focus announces itself', () => {
  test('a dialog that claims nothing still shows where the keyboard went', async ({
    mount,
    page,
  }) => {
    // `showModal()` picks the first focusable under the modality of the click that opened the
    // dialog — so on Chromium and Firefox the focus is real and the ring is not: 2.4.7 with a
    // working Enter key. Asserted on whatever holds focus; the pick is the platform's business.
    const component = await mount(<ReclaimWithoutClaimHarness />);
    await component.getByTestId('open-both').click();

    await expect(page.locator('dialog[data-modal-id="reclaim-no-claim"]')).toBeVisible();

    await expect
      .poll(() => {
        return page.evaluate(() => {
          const active = document.activeElement;
          return active instanceof HTMLElement && active.matches(':focus-visible');
        });
      })
      .toBe(true);
  });
});
