import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  OpeningFocusForegroundHarness,
  ReclaimFocusHarness,
  ReclaimWithoutClaimHarness,
  ShadowReclaimWithoutClaimHarness,
} from './opening-focus-foreground.story.js';

/**
 * The opening focus defers to the foreground.
 *
 * A dialog opening underneath another is not what the user is looking at, and taking the keyboard
 * from what they are looking at is the worst thing an opening can do: the dialog in front is left
 * with no focus, so its own keydown listener hears nothing and its dismiss key goes dead. Reported
 * from an application — a connection error in the top layer, focused on its cancel button, losing
 * focus the instant a side panel opened behind it — and the press that followed was then claimed
 * by the panel, which navigated.
 */

test('a panel opening underneath does not take focus from the dialog in front', async ({
  mount,
  page,
}) => {
  const component = await mount(<OpeningFocusForegroundHarness />);
  await component.getByTestId('off-open-interruption').click();
  const interruption = page.locator('dialog[data-modal-id="off-interruption"]');
  await expect(interruption).toBeVisible();
  // `showModal()` puts focus in the dialog on its own; which element is the platform’s business.
  await expect(page.locator(String.raw`dialog[data-modal-id="off-interruption"]`)).toBeVisible();

  await page.getByTestId('off-open-panel').click();
  await expect(page.locator('dialog[data-modal-id="off-panel"]')).toBeVisible();

  // The claim that discriminates: the panel asked for `focusOnOpen` and must be refused. The
  // opener button is where focus legitimately sits after the click that opened the panel — what
  // matters is that it is still inside the interruption, not in the panel.
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
  // The other half, or the fix would just be "never focus a non-modal dialog": alone, the panel's
  // `focusOnOpen` claim is honoured exactly as before.
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
    // A non-modal panel arriving underneath: the platform keeps it there, nothing is re-shown, so
    // the reclaim is the only thing that can put the focus back.
    const component = await mount(<ReclaimFocusHarness behindIsModal={false} />);
    await component.getByTestId('rf-open-front').click();
    // Its own claim, honoured on the opening — the state the reclaim must not simply repeat.
    await expect(page.getByTestId('rf-front-claimed')).toBeFocused();

    await page.getByTestId('rf-schedule').click();
    await page.getByTestId('rf-front-input').click();
    await page.getByTestId('rf-front-input').fill('half a sentence');
    await expect(page.getByTestId('rf-front-input')).toBeFocused();

    // The stack moves under it: the panel opens behind and the platform's focusing steps take the
    // keyboard away.
    await expect(page.locator('dialog[data-modal-id="rf-behind"]')).toBeVisible();

    // Handed back to the field, with what was typed still in it. A reclaim that re-honoured the
    // claim would put the ring on "Done" and lose the caret — which is what the first
    // implementation did, and what its own test could not see.
    await expect(page.getByTestId('rf-front-input')).toBeFocused();
    await expect(page.getByTestId('rf-front-input')).toHaveValue('half a sentence');
  });

  test('the modal left behind by a close ends up with the keyboard', async ({ mount, page }) => {
    // Two modal dialogs with a policy keeping one underneath — the arrangement `prioritize` and the
    // opening-focus rule produce together.
    //
    // **This one characterises rather than fixes**, and the distinction is worth writing down because
    // the reasoning that predicted a defect here was wrong. Reading the code says the dialog left
    // behind declined its opening focus and nothing ever offers it again. What the code does not show
    // is that a raise *re-records* the platform's previously-focused element: `raiseDialog` re-shows
    // the front dialog at a moment when the newcomer holds the focus, so the front dialog's native
    // close hands the keyboard back into the dialog behind it. Measured, not deduced — this test
    // passes against the implementation that predates the reclaim.
    //
    // It stays because nothing asserted it, the chain it depends on is three indirections long, and
    // any change to when a raise happens would break it silently.
    const component = await mount(<ReclaimFocusHarness behindIsModal={true} />);
    await component.getByTestId('rf-open-front').click();
    await page.getByTestId('rf-schedule').click();
    await expect(page.locator('dialog[data-modal-id="rf-behind"]')).toBeVisible();

    // It declined its opening focus, correctly — the policy put it underneath.
    await expect(page.getByTestId('rf-behind-claimed')).not.toBeFocused();

    await page.getByTestId('rf-close-front').click();
    await expect(page.locator('dialog[data-modal-id="rf-front"]')).not.toBeVisible();

    // Now it is the one in front, so the focus is its own — and its `focusOnOpen` is the floor,
    // since nothing ever held focus inside it. Without this the dialog is left focusless: the native
    // close hands the keyboard to whatever was focused before the *front* dialog opened, which is
    // outside this one.
    await expect(page.getByTestId('rf-behind-claimed')).toBeFocused();
  });

  test('and its hotkeys work, which is what the focus is for', async ({ mount, page }) => {
    const component = await mount(<ReclaimFocusHarness behindIsModal={true} />);
    await component.getByTestId('rf-open-front').click();
    await page.getByTestId('rf-schedule').click();
    await expect(page.locator('dialog[data-modal-id="rf-behind"]')).toBeVisible();
    await page.getByTestId('rf-close-front').click();
    await expect(page.locator('dialog[data-modal-id="rf-front"]')).not.toBeVisible();

    // Why the focus matters at all, and the reason the assertion above is not cosmetic: a dialog with
    // no focus inside it hears no keydown, so every hotkey it declares except Escape is dead —
    // Escape survives on the native `cancel`, which is focus-independent, and nothing else does.
    await page.keyboard.press('Enter');

    await expect(page.locator('dialog[data-modal-id="rf-behind"]')).not.toBeVisible();
  });
});

test.describe('a dialog that claimed no opening focus still gets its keyboard back', () => {
  test('a panel opening underneath does not leave focus on the body', async ({ mount, page }) => {
    // The defect this pins: `reclaimFocus` aimed only at a `focusOnOpen` marker and then fell
    // through to `dialog.focus()`, which an open `<dialog>` refuses. A modal with no claim was
    // left on screen with the keyboard on `<body>` — and from there Tab reaches nothing.
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
    // The floor focuses a candidate and then asks who holds it. Asked of the `document`, a shadow
    // root answers with the *host*, so the confirmation fails on a candidate that took focus and
    // the scan walks the whole list — leaving the dialog on its last control. Read through the
    // root's own `activeElement`, which is the only place the true answer lives.
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
    // `showModal()` picks the first focusable, and it picks it under the modality of the click
    // that opened the dialog — so the focus is real and the ring is not, on Chromium and Firefox.
    // The keyboard is somewhere the user cannot see, which is 2.4.7 with a working Enter key.
    //
    // Asserted on the element that actually holds focus rather than on a named button, because
    // which one the platform picks is the platform's business; that it is *visible* is ours.
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
