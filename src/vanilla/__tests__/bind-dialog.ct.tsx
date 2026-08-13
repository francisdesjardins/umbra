import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { frontDialogId } from '../../__tests__/stack-probe.js';
import {
  VanillaBasicHarness,
  VanillaBusyHarness,
  VanillaContainedHarness,
  VanillaDestroyHarness,
  VanillaExplicitHostHarness,
  VanillaFailingActionHarness,
  VanillaNoHostHarness,
  VanillaNonModalOptionsHarness,
  VanillaOpenRequestHarness,
  VanillaPortalHarness,
  VanillaLabellingHarness,
  VanillaRestoreOnUnbindHarness,
  VanillaShadowRootHarness,
  VanillaShadowStackHarness,
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
    // The one the comment above names and nothing asserted: `data-loading` is for CSS, this is
    // the half assistive technology reads.
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'aria-busy',
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

  test('portal places without relocating', async ({ mount, page }) => {
    // The one option whose meaning is *narrower* here than in the hook bindings, and the reason it
    // needs a test rather than a sentence: the type accepts it, the placement half arrives, and
    // nothing in the code path would have told you the other half does not. React portals its
    // dialog into `document.body` and Solid mounts its own there; this binding was handed markup
    // the caller wrote, and moving that would take its ids, its stylesheet scope and its listeners
    // with it. So `portal: true` selects `fixed` and leaves the element alone — which means the
    // caller, not the library, owns whether `fixed` reaches the viewport.
    await mount(<VanillaPortalHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // No host is styled: the portaled variant has none, so a `data-modal-container` here would mean
    // the contained branch had been taken instead.
    await expect(page.locator('[data-modal-container]')).toHaveCount(0);

    const measured = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[data-modal-id="vanilla-portal"]');
      const transformed = document.querySelector('[data-testid="transformed"]');
      if (!(dialog instanceof HTMLElement) || !(transformed instanceof HTMLElement)) {
        return null;
      }
      const box = dialog.getBoundingClientRect();
      const ancestor = transformed.getBoundingClientRect();
      return {
        position: getComputedStyle(dialog).position,
        // Where it lives, not where it is painted: the assertion that the element was not moved.
        parentTestId: dialog.parentElement?.dataset['testid'] ?? null,
        inBody: dialog.parentElement === document.body,
        inTopLayer: dialog.matches(':modal'),
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        ancestor: { x: ancestor.x, y: ancestor.y, width: ancestor.width, height: ancestor.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    });

    expect(measured).not.toBeNull();
    expect(measured?.position).toBe('fixed');
    expect(measured?.parentTestId).toBe('wrapper');
    expect(measured?.inBody).toBe(false);
    expect(measured?.inTopLayer).toBe(false);

    // And the consequence, measured rather than asserted in prose: the containing block `fixed`
    // resolved against is the **transformed ancestor**, not the viewport. Read through the centres,
    // because `inset: 0` does not stretch a `<dialog>` — the UA keeps `width: fit-content` and
    // `margin: auto`, so the panel is content-sized and centred in whatever block won. This is why
    // the option's doc tells a vanilla caller to place the `<dialog>` outside such an ancestor
    // themselves: the library cannot, and a test that only checked `position: fixed` would report
    // this arrangement as working.
    const box = measured?.box;
    const ancestor = measured?.ancestor;
    const viewport = measured?.viewport;
    expect(box && ancestor && viewport).toBeTruthy();
    if (!box || !ancestor || !viewport) {
      return;
    }
    expect(box.x + box.width / 2).toBeCloseTo(ancestor.x + ancestor.width / 2, 1);
    expect(box.y + box.height / 2).toBeCloseTo(ancestor.y + ancestor.height / 2, 1);
    // Guards the guard: the two centres have to disagree, or the assertion above would pass on a
    // panel that was viewport-anchored after all.
    expect(Math.abs(ancestor.x + ancestor.width / 2 - viewport.width / 2)).toBeGreaterThan(50);
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

/**
 * The two things a controller has to clean up that a renderer would have done by unmounting: the
 * writes on a button it does not own, and the attribute on a dialog it does not own.
 */
test.describe('bindDialog — what teardown hands back', () => {
  test('unbinding restores the caller’s button, mid-action included', async ({ mount, page }) => {
    await mount(<VanillaRestoreOnUnbindHarness />);
    await page.getByTestId('open').click();

    const slow = page.getByTestId('slow-action');
    await expect(slow).toHaveAttribute('aria-keyshortcuts', 'Control+S');

    // Start an action that never settles, so the unbind lands while the button is stuck.
    await slow.click();
    await expect(slow).toBeDisabled();
    await expect(slow).toHaveAttribute('aria-busy', 'true');

    await page.getByTestId('unbind').click();

    // Not a stale attribute — a dead control in the caller's page, which is why this is a fix and
    // not a tidy-up.
    await expect(slow).toBeEnabled();
    await expect(slow).not.toHaveAttribute('aria-busy', /.*/);
    await expect(slow).not.toHaveAttribute('data-loading', /.*/);
    await expect(slow).not.toHaveAttribute('aria-keyshortcuts', /.*/);
    // `bindAction` writes `type`, and a button that had none must not come back with one.
    await expect(slow).not.toHaveAttribute('type', /.*/);

    // Restored, not cleared: this one was disabled in the markup before anything bound it, and an
    // unbind that switched it on would be handing back something the caller never wrote.
    await expect(page.getByTestId('already-off')).toBeDisabled();

    // The hotkey went with the attribute.
    await page.keyboard.press('Control+s');
    await expect(slow).toBeEnabled();
  });

  test('a controller destroyed mid-prepare does not leave the dialog marked busy', async ({
    mount,
    page,
  }) => {
    // `destroy()` unsubscribes first, so the notification that would clear `aria-busy` never
    // arrives — and the element is the caller's, so it outlives the controller wearing it.
    await mount(<VanillaBusyHarness />);
    await page.getByTestId('open').click();

    const dialog = page.locator('dialog[data-modal-id="vanilla-busy"]');
    await expect(dialog).toHaveAttribute('aria-busy', 'true');

    await page.getByTestId('destroy').click();
    await expect(dialog).toHaveAttribute('aria-busy', 'false');
  });

  test('aria-busy clears when prepare settles', async ({ mount, page }) => {
    await mount(<VanillaBusyHarness />);
    await page.getByTestId('open').click();

    const dialog = page.locator('dialog[data-modal-id="vanilla-busy"]');
    await expect(dialog).toHaveAttribute('aria-busy', 'true');

    await page.getByTestId('release').click();
    await expect(dialog).toHaveAttribute('aria-busy', 'false');
  });
});

/**
 * The labelling diagnostic, on the binding it was designed around.
 *
 * Neither dialog here passes an aria option — both carry their attributes (or their absence) in
 * the caller's own markup. That is the case reading `options.ariaLabelledBy` would be blind to,
 * and it is the ordinary one in this binding: the `id` and the reference to it are written by
 * hand, in two places, by someone who never sees the result.
 */
test.describe('bindDialog — the labelling diagnostic', () => {
  const labellingWarnings = (page: Page) => {
    const lines: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('Dialog labelling')) {
        lines.push(message.text());
      }
    });
    return lines;
  };

  test('reports a reference the caller’s markup gets wrong', async ({ mount, page }) => {
    const warnings = labellingWarnings(page);

    await mount(<VanillaLabellingHarness />);
    await page.getByTestId('open-broken').click();
    await expect(page.locator('dialog[data-modal-id="vanilla-broken-label"]')).toBeVisible();
    await page.waitForTimeout(300);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('vanilla-broken-title');
  });

  test('reports a dialog with no accessible name at all', async ({ mount, page }) => {
    // The finding that never fires in the playground any more, so this is the only place it is
    // exercised end to end rather than as a pure function.
    const warnings = labellingWarnings(page);

    await mount(<VanillaLabellingHarness />);
    await page.getByTestId('open-nameless').click();
    await expect(page.locator('dialog[data-modal-id="vanilla-nameless"]')).toBeVisible();
    await page.waitForTimeout(300);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('no accessible name');
  });
});

test.describe('a shadow-root dialog in a stack', () => {
  /**
   * The front dialog, asked through the shadow root as well as the document.
   *
   * `document.elementFromPoint` stops at a shadow host — it hands back the host, not what is inside —
   * so the shared probe cannot see a dialog in one. Piercing here rather than in the shared helper,
   * because this is the only suite with a shadow root in it and the helper says so.
   */
  async function frontDialogIdDeep(page: Page): Promise<string | null> {
    return page.evaluate(() => {
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      let element = document.elementFromPoint(x, y);
      while (element?.shadowRoot) {
        const inner = element.shadowRoot.elementFromPoint(x, y);
        if (inner === null || inner === element) {
          break;
        }
        element = inner;
      }
      return element?.closest('dialog')?.getAttribute('data-modal-id') ?? null;
    });
  }

  /** What holds focus inside the shadow root, by id. */
  async function focusedInShadow(page: Page): Promise<string | null> {
    return page.evaluate(() => {
      const root = document.querySelector('[data-testid="shadow-stack-host"]')?.shadowRoot;
      return root?.activeElement?.id ?? null;
    });
  }

  test('the policy puts it in front of a light-DOM dialog opened later', async ({
    mount,
    page,
  }) => {
    const component = await mount(<VanillaShadowStackHarness />);
    await component.getByTestId('toggle-policy').click();
    await expect(component.getByTestId('policy')).toHaveText('on');

    await component.getByTestId('open-shadow-front').click();
    // Dispatched rather than clicked: the shadow dialog is modal and in the top layer, so the page
    // behind it — this button included — is under its backdrop.
    await component.getByTestId('open-light-over').dispatchEvent('click');
    await expect(page.locator('dialog[data-modal-id="vanilla-light-over"]')).toBeVisible();

    // `prioritize` lives on the manager and every binding inherits it without a line of its own,
    // which is exactly why nothing would fail if one of them stopped reaching it: the parity test
    // compares export names, and this is a method.
    expect(await frontDialogIdDeep(page)).toBe('vanilla-shadow-front');
    expect(await frontDialogId(page)).not.toBe('vanilla-light-over');
  });

  test('keeps the keyboard when something opens over it', async ({ mount, page }) => {
    const component = await mount(<VanillaShadowStackHarness />);
    await component.getByTestId('toggle-policy').click();
    await component.getByTestId('open-shadow-front').click();
    expect(await focusedInShadow(page)).toBe('shadow-confirm');

    await page.locator('#shadow-note').click();
    expect(await focusedInShadow(page)).toBe('shadow-note');

    await component.getByTestId('open-light-over').dispatchEvent('click');
    await expect(page.locator('dialog[data-modal-id="vanilla-light-over"]')).toBeVisible();

    // The claim: the dialog in front still has the keyboard, from inside a shadow root — where
    // `document.activeElement` answers with the host and a document-scoped check would read "focus
    // left" forever.
    //
    // **The position is not preserved here, and that is a known limit rather than an oversight.** The
    // newcomer's `showModal()` takes the focus first, so the raise cannot see where it was inside this
    // dialog; the coordinator remembers, but the raise's own `showModal()` fires a `focusin` that
    // overwrites the memory before the reclaim runs. So focus lands on the first focusable rather than
    // back in the field. Fixing it means teaching the `focusin` bookkeeping to ignore focus the
    // library itself moves during a raise — see the guard in `core/attach-focus.ts`. The late-install
    // case below *does* preserve it, because there no newcomer steals the focus first.
    expect(await focusedInShadow(page)).toBe('shadow-confirm');
  });

  test('a policy installed over it keeps the caret where it was', async ({ mount, page }) => {
    const component = await mount(<VanillaShadowStackHarness />);
    await component.getByTestId('open-shadow-front').click();
    await page.locator('#shadow-note').click();
    await page.locator('#shadow-note').fill('typed in a shadow root');
    expect(await focusedInShadow(page)).toBe('shadow-note');

    // The late install: nothing is tracked yet, so the first plan lifts everything bottom-first —
    // this dialog, while it holds the keyboard. That is the one arrangement reaching `raiseDialog`'s
    // focus restore, and here it also drives the walk into the shadow root, since
    // `document.activeElement` is the host and the real answer is one tree down.
    await component.getByTestId('toggle-policy').dispatchEvent('click');
    await expect(component.getByTestId('policy')).toHaveText('on');

    expect(await focusedInShadow(page)).toBe('shadow-note');
    await expect(page.locator('#shadow-note')).toHaveValue('typed in a shadow root');
  });

  test('a raise fires the native close event, with the dialog already open again', async ({
    mount,
    page,
  }) => {
    const component = await mount(<VanillaShadowStackHarness />);
    await component.getByTestId('toggle-policy').click();
    await component.getByTestId('open-shadow-front').click();
    await expect(component.getByTestId('native-closes')).toHaveText('0');

    await component.getByTestId('open-light-over').dispatchEvent('click');
    await expect(page.locator('dialog[data-modal-id="vanilla-light-over"]')).toBeVisible();

    // Moving a modal dialog is `close()` + `showModal()`, so the element emits a `close` nobody asked
    // for. `close()` *queues* it, which is what leaves `dialog.open` back at `true` by the time a
    // listener runs — the only way a listener can tell a raise from a real close. This matters here
    // and nowhere else: the `<dialog>` and this listener are the caller's.
    await expect(component.getByTestId('native-closes')).toHaveText('1');
    await expect(component.getByTestId('open-when-closed')).toHaveText('still-open');
  });
});

/**
 * The three options React's suite exercised and this one did not.
 *
 * Its own describe because they are not controller-specific behaviour — each is a shared `attach*`
 * function — and the point is that a binding with no render pass reaches them the same way.
 */
test.describe('bindDialog — the options only React had exercised', () => {
  test('containFocus wraps Tab inside the panel', async ({ mount, page }) => {
    await mount(<VanillaNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Three focusables, so a wrap is distinguishable from "focus never moved".
    await page.getByTestId('first').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('third')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('first')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('third')).toBeFocused();
  });

  test('a custom dismissKey closes it, and Escape does not', async ({ mount, page }) => {
    await mount(<VanillaNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    // The reason, not just visibility: `isVisible` alone stays true through an exit animation, so on
    // its own it would match a panel that closed as well as one that did not.
    await expect(page.getByTestId('last-reason')).toHaveText('none');

    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('dismissOnClickOutside closes it on a click in the page', async ({ mount, page }) => {
    await mount(<VanillaNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Inside first — this is click-outside, not click-anywhere.
    await page.getByTestId('third').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('last-reason')).toHaveText('none');

    await page.getByTestId('outside').click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });
});
