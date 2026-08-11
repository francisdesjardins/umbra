import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  VanillaBasicHarness,
  VanillaContainedHarness,
  VanillaDestroyHarness,
  VanillaExplicitHostHarness,
  VanillaFailingActionHarness,
  VanillaNoHostHarness,
  VanillaOpenRequestHarness,
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

  test('isActionRunning answers for one action, off the button', async ({ mount, page }) => {
    // `bindAction` keeps the button itself in step; this is the same fact for everything that is
    // not the button, which here is markup the binding has never touched.
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('confirm-running')).toHaveText('no');

    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByTestId('confirm-running')).toHaveText('yes');
    await expect(page.getByTestId('cancel-running')).toHaveText('no');

    await expect(page.getByTestId('confirm-running')).toHaveText('no');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
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

/**
 * The contained variant — `nonModal: true` without `portal`, the one that needs the caller to
 * supply a region.
 *
 * A controller owns no markup, so where the other two bindings render a host this one has to be
 * pointed at one, and every branch of that resolution is here: the parent by default, an explicit
 * `host`, and neither.
 */
test.describe('bindDialog — contained placement', () => {
  test('positions the panel against the dialog’s parent by default', async ({ mount, page }) => {
    await mount(<VanillaContainedHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    const host = page.getByTestId('host');
    // The marker CSS reaches the host by, and the id it carries is the panel's.
    await expect(host).toHaveAttribute('data-modal-container', 'vanilla-contained');

    const measured = await page.evaluate(() => {
      const hostEl = document.querySelector('[data-testid="host"]');
      const dialog = document.querySelector('dialog[data-modal-id="vanilla-contained"]');
      if (!(hostEl instanceof HTMLElement) || !(dialog instanceof HTMLElement)) {
        return null;
      }
      const region = document.querySelector('[data-testid="region"]');
      return {
        hostPosition: getComputedStyle(hostEl).position,
        // The host exists to be a containing block and nothing else, so it must not be a hit
        // target — the region behind it stays as clickable as it was.
        hostPointerEvents: getComputedStyle(hostEl).pointerEvents,
        dialogPosition: getComputedStyle(dialog).position,
        dialogPointerEvents: getComputedStyle(dialog).pointerEvents,
        // Never the top layer: that is what `nonModal` buys, and what makes containment mean
        // anything at all.
        inTopLayer: dialog.matches(':modal'),
        hostBox: hostEl.getBoundingClientRect().width,
        regionBox: region?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(measured).not.toBeNull();
    expect(measured?.hostPosition).toBe('absolute');
    expect(measured?.hostPointerEvents).toBe('none');
    expect(measured?.dialogPosition).toBe('absolute');
    expect(measured?.dialogPointerEvents).toBe('auto');
    expect(measured?.inTopLayer).toBe(false);
    // The host fills the sized region it was given — the precondition the whole variant rests on,
    // and the one whose failure makes every other assertion here pass vacuously.
    expect(measured?.hostBox).toBe(400);
    expect(measured?.regionBox).toBe(400);
  });

  test('the host overlays its region without becoming a hit target', async ({ mount, page }) => {
    // The host is styled at bind time and is `inset: 0` over the whole region from then on — so
    // for as long as the panel is closed it is an invisible sheet across everything behind it.
    // `pointerEvents: none` is what keeps that from killing the region's own controls, and this
    // is the assertion that notices if it ever stops being applied.
    await mount(<VanillaContainedHarness />);
    await expect(page.getByTestId('host')).toHaveAttribute(
      'data-modal-container',
      'vanilla-contained'
    );
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    await page.getByTestId('behind').click();
    await expect(page.getByTestId('behind-clicks')).toHaveText('1');

    // Open, and the panel itself does cover the region — `pointerEvents: auto` is on the dialog,
    // which is the half that has to capture. Containment would mean nothing otherwise.
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    const covered = await page.evaluate(() => {
      const region = document.querySelector('[data-testid="region"]');
      if (!region) {
        return null;
      }
      const box = region.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit?.closest('dialog')?.getAttribute('data-modal-id') ?? null;
    });
    expect(covered).toBe('vanilla-contained');
  });

  test('positions against an explicit host rather than the parent', async ({ mount, page }) => {
    await mount(<VanillaExplicitHostHarness />);
    await page.getByTestId('open').click();

    // The dialog's parent is `wrapper`; the named host is its grandparent. A pass here cannot be
    // the default branch answering by coincidence.
    await expect(page.getByTestId('host')).toHaveAttribute(
      'data-modal-container',
      'vanilla-explicit-host'
    );
    await expect(page.getByTestId('wrapper')).not.toHaveAttribute('data-modal-container', /.*/);
  });

  test('degrades rather than throwing when there is no host at all', async ({ mount, page }) => {
    await mount(<VanillaNoHostHarness />);

    // Bound despite the missing host: the controller answers, which is the whole claim.
    await page.getByTestId('probe').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');

    // And it styled nothing on the way past — a binding that fell back to `document.body` would
    // position an unrelated element and be far worse than the warning it logs instead.
    await expect(page.locator('[data-modal-container]')).toHaveCount(0);
  });
});

/**
 * The controller's two remaining doors: the reactive surface, and the teardown.
 *
 * Both are driven from the page rather than from unmount — the coverage fixture reads its counters
 * before React's cleanup runs, so a teardown watched only at unmount is a teardown nothing asserted.
 */
test.describe('bindDialog — subscription and teardown', () => {
  test('destroy unregisters the dialog and stops the subscription', async ({ mount, page }) => {
    await mount(<VanillaDestroyHarness />);
    await expect(page.getByTestId('registered')).toHaveText('yes');

    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('destroy').click();

    // Gone from the registry: a manager still holding it would keep answering lookups for a
    // dialog whose listeners have all been detached.
    await expect(page.getByTestId('registered')).toHaveText('no');
    // `destroy()` closes what it unregisters, so a subscription the unsubscribe failed to detach
    // has a transition to hear right here.
    await expect(page.getByTestId('after-destroy')).toHaveText('no');
    await expect(page.locator('dialog[data-modal-id="vanilla-destroy"][open]')).toHaveCount(0);
  });
});

/**
 * `onOpenRequest` through the controller — the manager's asking door, forwarded rather than
 * reimplemented.
 */
test.describe('bindDialog — open requests', () => {
  test('an accepted request opens the dialog', async ({ mount, page }) => {
    await mount(<VanillaOpenRequestHarness />);
    await page.getByTestId('ask-nicely').click();

    await expect(page.getByTestId('outcome')).toHaveText('accepted');
    await expect(page.locator('dialog[data-modal-id="vanilla-request"]:modal')).toHaveCount(1);
  });

  test('a refused request reports why, and nothing opens', async ({ mount, page }) => {
    // Refusal is explicit and acceptance is the default — the manager cannot infer either, so
    // this is the branch that proves the handler was actually consulted.
    await mount(<VanillaOpenRequestHarness />);
    await page.getByTestId('ask-rudely').click();

    await expect(page.getByTestId('outcome')).toHaveText('refused:wrong payload');
    await expect(page.locator('dialog[data-modal-id="vanilla-request"]')).not.toBeVisible();
  });
});
