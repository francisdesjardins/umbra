import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { frontDialogId } from '../../__tests__/stack-probe.js';
import {
  VanillaBasicHarness,
  VanillaBusyHarness,
  VanillaClaimlessReclaimHarness,
  VanillaContainedHarness,
  VanillaDestroyHarness,
  VanillaDismissRequestHarness,
  VanillaExplicitHostHarness,
  VanillaFailingActionHarness,
  VanillaNoHostHarness,
  VanillaNonModalOptionsHarness,
  VanillaOpenRequestHarness,
  VanillaPortalHarness,
  VanillaPrepareFailureHarness,
  VanillaReconcileHarness,
  VanillaLabellingHarness,
  VanillaRestoreOnUnbindHarness,
  VanillaShadowRootHarness,
  VanillaShadowStackHarness,
  VanillaUnbindHarness,
  VanillaServerOpenHarness,
} from './bind-dialog.story';

/**
 * `umbra/vanilla`, against a real browser and a `<dialog>` the caller wrote — deliberately the same
 * assertions the hook bindings make. Tests with no counterpart cover what only a controller has:
 * binding and unbinding an action on a button that already exists.
 */

test.describe('bindDialog', () => {
  test('leaves the caller’s dialog closed until asked', async ({ mount, page }) => {
    await mount(<VanillaBasicHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('dialog-vanilla-basic')).not.toBeVisible();
  });

  test('opens it into the top layer, and stamps the styling contract on it', async ({
    mount,
    page,
  }) => {
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('is-visible')).toHaveText('open');
    // `showModal()`, not `show()` — the hook bindings' default variant.
    await expect(page.locator('dialog[data-dialog-id="vanilla-basic"]:modal')).toHaveCount(1);
    await expect(page.getByTestId('dialog-vanilla-basic')).toHaveAttribute(
      'data-dialog-type',
      'dialog'
    );
    await expect(page.getByTestId('dialog-vanilla-basic')).toHaveAttribute(
      'aria-label',
      'Vanilla basic'
    );
    await expect(page.getByTestId('dialog-vanilla-basic')).toContainText('Vanilla content');
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

    // Not `dismiss`: Cancel declared Escape as its hotkey, so the action wins.
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
    // No renderer: `bindAction` writes `disabled` / `data-loading` (CSS) / `aria-busy` (AT) itself.
    await mount(<VanillaBasicHarness />);
    await page.getByTestId('open').click();

    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'data-loading',
      'true'
    );
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });

  test('isActionRunning answers for one action, off the button', async ({ mount, page }) => {
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
    // The unbind is how a caller retires an action, and `hasActions()` gates backdrop dismissal.
    await mount(<VanillaUnbindHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('dialog-vanilla-unbind')).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('drop-action').click();
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveCount(0);

    await page.mouse.click(5, 5);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });

  test('a failed action hands focus back to the button that ran it', async ({ mount, page }) => {
    // `bindAction` disables the button from a subscriber registered ahead of the focus coordinator,
    // so `activeElement` at action start is already blurred. Plain markup: the shadow root it was
    // found in was never the cause.
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
    // Quiet failures: `adoptedStyleSheets` stops at the boundary, `document.activeElement` is the host.
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
    // The library's own value: Chrome ships a UA default, so "something painted" proves nothing.
    expect(measured.backdrop).toBe('rgba(0, 0, 0, 0.7)');
    expect(measured.focused).toBe('confirm');
  });
});

/**
 * The contained variant — `nonModal: true` without `portal`. A controller owns no markup, so it must
 * be pointed at a host where the hook bindings render one; every branch of that resolution is here.
 */
test.describe('bindDialog — contained placement', () => {
  test('positions the panel against the dialog’s parent by default', async ({ mount, page }) => {
    await mount(<VanillaContainedHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    const host = page.getByTestId('host');
    await expect(host).toHaveAttribute('data-dialog-container', 'vanilla-contained');

    const measured = await page.evaluate(() => {
      const hostEl = document.querySelector('[data-testid="host"]');
      const dialog = document.querySelector('dialog[data-dialog-id="vanilla-contained"]');
      if (!(hostEl instanceof HTMLElement) || !(dialog instanceof HTMLElement)) {
        return null;
      }
      const region = document.querySelector('[data-testid="region"]');
      return {
        hostPosition: getComputedStyle(hostEl).position,
        // A containing block and nothing else, so never a hit target.
        hostPointerEvents: getComputedStyle(hostEl).pointerEvents,
        dialogPosition: getComputedStyle(dialog).position,
        dialogPointerEvents: getComputedStyle(dialog).pointerEvents,
        // Never the top layer, which is what makes containment mean anything.
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
    // The host fills its sized region: without this precondition every assertion above is vacuous.
    expect(measured?.hostBox).toBe(400);
    expect(measured?.regionBox).toBe(400);
  });

  test('the host overlays its region without becoming a hit target', async ({ mount, page }) => {
    // The host is an `inset: 0` sheet over the region even closed; `pointerEvents: none` saves it.
    await mount(<VanillaContainedHarness />);
    await expect(page.getByTestId('host')).toHaveAttribute(
      'data-dialog-container',
      'vanilla-contained'
    );
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    await page.getByTestId('behind').click();
    await expect(page.getByTestId('behind-clicks')).toHaveText('1');

    // Open, the dialog does cover the region: `pointerEvents: auto` is the half that must capture.
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    const covered = await page.evaluate(() => {
      const region = document.querySelector('[data-testid="region"]');
      if (!region) {
        return null;
      }
      const box = region.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit?.closest('dialog')?.getAttribute('data-dialog-id') ?? null;
    });
    expect(covered).toBe('vanilla-contained');
  });

  test('positions against an explicit host rather than the parent', async ({ mount, page }) => {
    await mount(<VanillaExplicitHostHarness />);
    await page.getByTestId('open').click();

    // The parent is `wrapper` and the named host its grandparent, so the default branch cannot pass.
    await expect(page.getByTestId('host')).toHaveAttribute(
      'data-dialog-container',
      'vanilla-explicit-host'
    );
    await expect(page.getByTestId('wrapper')).not.toHaveAttribute('data-dialog-container', /.*/);
  });

  test('degrades rather than throwing when there is no host at all', async ({ mount, page }) => {
    await mount(<VanillaNoHostHarness />);

    await page.getByTestId('probe').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');

    // And styled nothing: a fallback to `document.body` would position an unrelated element.
    await expect(page.locator('[data-dialog-container]')).toHaveCount(0);
  });

  test('portal places without relocating', async ({ mount, page }) => {
    // Narrower here: moving the caller's markup would take its ids, stylesheet scope and listeners,
    // so `portal: true` only selects `fixed` — the caller owns whether that reaches the viewport.
    await mount(<VanillaPortalHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // A `data-dialog-container` here would mean the contained branch had been taken instead.
    await expect(page.locator('[data-dialog-container]')).toHaveCount(0);

    const measured = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[data-dialog-id="vanilla-portal"]');
      const transformed = document.querySelector('[data-testid="transformed"]');
      if (!(dialog instanceof HTMLElement) || !(transformed instanceof HTMLElement)) {
        return null;
      }
      const box = dialog.getBoundingClientRect();
      const ancestor = transformed.getBoundingClientRect();
      return {
        position: getComputedStyle(dialog).position,
        // Where it lives, not where it paints: the proof the element was not moved.
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

    // Measured: `fixed` resolved against the **transformed ancestor**, not the viewport — why the doc
    // tells a vanilla caller to place the `<dialog>` outside one. Through the centres, the UA keeping
    // `width: fit-content` and `margin: auto` so `inset: 0` never stretches it.
    const box = measured?.box;
    const ancestor = measured?.ancestor;
    const viewport = measured?.viewport;
    expect(box && ancestor && viewport).toBeTruthy();
    if (!box || !ancestor || !viewport) {
      return;
    }
    expect(box.x + box.width / 2).toBeCloseTo(ancestor.x + ancestor.width / 2, 1);
    expect(box.y + box.height / 2).toBeCloseTo(ancestor.y + ancestor.height / 2, 1);
    // Guards the guard: the centres must disagree, or the above passes on a viewport-anchored panel.
    expect(Math.abs(ancestor.x + ancestor.width / 2 - viewport.width / 2)).toBeGreaterThan(50);
  });
});

/**
 * The reactive surface and the teardown, driven from the page: the coverage fixture reads its
 * counters before React's cleanup, so an unmount-only teardown is unasserted.
 */
test.describe('bindDialog — subscription and teardown', () => {
  test('destroy unregisters the dialog and stops the subscription', async ({ mount, page }) => {
    await mount(<VanillaDestroyHarness />);
    await expect(page.getByTestId('registered')).toHaveText('yes');

    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('destroy').click();

    // A manager still holding it would answer lookups for a dialog with no listeners left.
    await expect(page.getByTestId('registered')).toHaveText('no');
    // `destroy()` closes what it unregisters, so a leaked subscription has a transition to hear.
    await expect(page.getByTestId('after-destroy')).toHaveText('no');
    await expect(page.locator('dialog[data-dialog-id="vanilla-destroy"][open]')).toHaveCount(0);
  });
});

/** `onOpenRequest` through the controller — forwarded to the manager, not reimplemented. */
test.describe('bindDialog — open requests', () => {
  test('an accepted request opens the dialog', async ({ mount, page }) => {
    await mount(<VanillaOpenRequestHarness />);
    await page.getByTestId('ask-nicely').click();

    await expect(page.getByTestId('outcome')).toHaveText('accepted');
    await expect(page.locator('dialog[data-dialog-id="vanilla-request"]:modal')).toHaveCount(1);
  });

  test('a refused request reports why, and nothing opens', async ({ mount, page }) => {
    // Refusal is explicit where acceptance is the default, so this branch proves the handler ran.
    await mount(<VanillaOpenRequestHarness />);
    await page.getByTestId('ask-rudely').click();

    await expect(page.getByTestId('outcome')).toHaveText('refused:wrong payload');
    await expect(page.locator('dialog[data-dialog-id="vanilla-request"]')).not.toBeVisible();
  });
});

/**
 * What a renderer would clean up by unmounting: the writes on a button the controller does not own,
 * and the attribute on a dialog it does not own.
 */
test.describe('bindDialog — what teardown hands back', () => {
  test('unbinding restores the caller’s button, mid-action included', async ({ mount, page }) => {
    await mount(<VanillaRestoreOnUnbindHarness />);
    await page.getByTestId('open').click();

    const slow = page.getByTestId('slow-action');
    await expect(slow).toHaveAttribute('aria-keyshortcuts', 'Control+S');

    // Never settles, so the unbind lands while the button is stuck.
    await slow.click();
    await expect(slow).toBeDisabled();
    await expect(slow).toHaveAttribute('aria-busy', 'true');

    await page.getByTestId('unbind').click();

    // Not a stale attribute but a dead control in the caller's page.
    await expect(slow).toBeEnabled();
    await expect(slow).not.toHaveAttribute('aria-busy', /.*/);
    await expect(slow).not.toHaveAttribute('data-loading', /.*/);
    await expect(slow).not.toHaveAttribute('aria-keyshortcuts', /.*/);
    // `bindAction` writes `type`, and a button that had none must not come back with one.
    await expect(slow).not.toHaveAttribute('type', /.*/);

    // Restored, not cleared: disabled in the markup before binding, so switching it on is wrong.
    await expect(page.getByTestId('already-off')).toBeDisabled();

    await page.keyboard.press('Control+s');
    await expect(slow).toBeEnabled();
  });

  test('a controller destroyed mid-prepare does not leave the dialog marked busy', async ({
    mount,
    page,
  }) => {
    // `destroy()` unsubscribes first, so nothing clears `aria-busy` off the surviving element.
    await mount(<VanillaBusyHarness />);
    await page.getByTestId('open').click();

    const dialog = page.locator('dialog[data-dialog-id="vanilla-busy"]');
    await expect(dialog).toHaveAttribute('aria-busy', 'true');

    await page.getByTestId('destroy').click();
    await expect(dialog).toHaveAttribute('aria-busy', 'false');
  });

  test('aria-busy clears when prepare settles', async ({ mount, page }) => {
    await mount(<VanillaBusyHarness />);
    await page.getByTestId('open').click();

    const dialog = page.locator('dialog[data-dialog-id="vanilla-busy"]');
    await expect(dialog).toHaveAttribute('aria-busy', 'true');

    await page.getByTestId('release').click();
    await expect(dialog).toHaveAttribute('aria-busy', 'false');
  });
});

/**
 * The labelling diagnostic, on the binding it was designed around. Neither dialog passes an aria
 * option — both carry their attributes, or their absence, in the caller's own markup, which reading
 * `options.ariaLabelledBy` would be blind to.
 */
test.describe('bindDialog — a dismissal the owner answers', () => {
  // The seam is shared and unit-tested; what is not otherwise asserted is that *this* binding
  // reaches it. Reverting this call site to `store.close()` passes every other test in the suite.
  test('a backdrop click is reported to the owner instead of closing the dialog', async ({
    mount,
    page,
  }) => {
    const component = await mount(<VanillaDismissRequestHarness />);
    await component.getByTestId('open').click();

    const dialog = page.locator('dialog[data-dialog-id="vanilla-dismiss-request"]');
    await expect(dialog).toBeVisible();

    await page.mouse.click(5, 5);

    await expect(component.getByTestId('cause')).toHaveText('backdrop-click');
    await page.waitForTimeout(600);
    await expect(dialog).toBeVisible();
  });
});

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
    await expect(page.locator('dialog[data-dialog-id="vanilla-broken-label"]')).toBeVisible();
    await page.waitForTimeout(300);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('vanilla-broken-title');
  });

  test('reports a dialog with no accessible name at all', async ({ mount, page }) => {
    // Never fires in the playground now, so this is its only end-to-end exercise.
    const warnings = labellingWarnings(page);

    await mount(<VanillaLabellingHarness />);
    await page.getByTestId('open-nameless').click();
    await expect(page.locator('dialog[data-dialog-id="vanilla-nameless"]')).toBeVisible();
    await page.waitForTimeout(300);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('no accessible name');
  });
});

test.describe('a shadow-root dialog in a stack', () => {
  /**
   * `document.elementFromPoint` stops at a shadow host, so the shared probe cannot see a dialog in
   * one. Pierced here rather than in that helper, this being the only suite with a shadow root.
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
      return element?.closest('dialog')?.getAttribute('data-dialog-id') ?? null;
    });
  }

  async function focusedInShadow(page: Page): Promise<string | null> {
    return page.evaluate(() => {
      const root = document.querySelector('[data-testid="shadow-stack-host"]')?.shadowRoot;
      return root?.activeElement?.id ?? null;
    });
  }

  /**
   * Which dialog holds the keyboard — the coarser question, and the one the library answers. *Which
   * control* is engine-dependent after a raise, so the id probe above only fits where position is.
   */
  async function focusedDialogInShadow(page: Page): Promise<string | null> {
    return page.evaluate(() => {
      const root = document.querySelector('[data-testid="shadow-stack-host"]')?.shadowRoot;
      return root?.activeElement?.closest('dialog')?.getAttribute('data-dialog-id') ?? null;
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
    // Dispatched, not clicked: the shadow dialog is dialog, so this button is under its backdrop.
    await component.getByTestId('open-light-over').dispatchEvent('click');
    await expect(page.locator('dialog[data-dialog-id="vanilla-light-over"]')).toBeVisible();

    // `prioritize` is inherited, so nothing else would fail if a binding stopped reaching it.
    await expect
      .poll(() => {
        return frontDialogIdDeep(page);
      })
      .toBe('vanilla-shadow-front');
    await expect
      .poll(() => {
        return frontDialogId(page);
      })
      .not.toBe('vanilla-light-over');
  });

  test('keeps the keyboard when something opens over it', async ({ mount, page }) => {
    const component = await mount(<VanillaShadowStackHarness />);
    await component.getByTestId('toggle-policy').click();
    await component.getByTestId('open-shadow-front').click();
    await expect
      .poll(() => {
        return focusedInShadow(page);
      })
      .toBe('shadow-confirm');

    await page.locator('#shadow-note').click();
    await expect
      .poll(() => {
        return focusedInShadow(page);
      })
      .toBe('shadow-note');

    await component.getByTestId('open-light-over').dispatchEvent('click');
    await expect(page.locator('dialog[data-dialog-id="vanilla-light-over"]')).toBeVisible();

    // About the **dialog**, not the control, and from a root where a document check reads "gone".
    await expect
      .poll(() => {
        return focusedDialogInShadow(page);
      })
      .toBe('vanilla-shadow-front');

    // **And on the control the user left, on every engine.** A raise re-shows the dialog and the
    // engine focuses something on the way back. `isRaisingDialog` closes that window, so the
    // reclaim reads focus inside but not where the memory says as the library's own move.
    await expect
      .poll(() => {
        return focusedInShadow(page);
      })
      .toBe('shadow-note');
  });

  test('a policy installed over it keeps the caret where it was', async ({ mount, page }) => {
    const component = await mount(<VanillaShadowStackHarness />);
    await component.getByTestId('open-shadow-front').click();
    await page.locator('#shadow-note').click();
    await page.locator('#shadow-note').fill('typed in a shadow root');
    await expect
      .poll(() => {
        return focusedInShadow(page);
      })
      .toBe('shadow-note');

    // Mid-word, so the assertion below is about the caret and not merely about the field: a
    // close-and-re-show restores focus but not a selection, and `fill()` alone leaves it at the end
    // where a re-show would also put it.
    await page.locator('#shadow-note').evaluate((field) => {
      if (field instanceof HTMLInputElement) {
        field.setSelectionRange(5, 5);
      }
    });

    // A late install seeds its tracking from the top layer as it already stands, so a stack that was
    // right needs no round-trip at all — where an empty seed compares against nothing and lifts
    // every open modal dialog bottom-first, this one included, while it holds the keyboard.
    await component.getByTestId('toggle-policy').dispatchEvent('click');
    await expect(component.getByTestId('policy')).toHaveText('on');

    await expect
      .poll(() => {
        return focusedInShadow(page);
      })
      .toBe('shadow-note');
    await expect(page.locator('#shadow-note')).toHaveValue('typed in a shadow root');
    await expect
      .poll(() => {
        return page.locator('#shadow-note').evaluate((field) => {
          return field instanceof HTMLInputElement ? field.selectionStart : -1;
        });
      })
      .toBe(5);
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
    await expect(page.locator('dialog[data-dialog-id="vanilla-light-over"]')).toBeVisible();

    // A raise is `close()` + `showModal()`, and `close()` *queues* its event, so `dialog.open` is back
    // at `true` when the caller's own listener runs — the only way to tell a raise from a real close.
    await expect(component.getByTestId('native-closes')).toHaveText('1');
    await expect(component.getByTestId('open-when-closed')).toHaveText('still-open');
  });
});

/**
 * Three options React's suite exercised and this one did not — each a shared `attach*` function, so
 * the claim is that a binding with no render pass reaches them the same way.
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
    // The reason too: `isVisible` stays true through an exit, so it matches a closing panel as well.
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

/**
 * `reconcileOpen` from the controller's snapshot — why `phase` is on this binding's surface alone:
 * with no render pass, the snapshot is the only clock a caller has.
 */
test.describe('bindDialog — reconcileOpen from the snapshot', () => {
  test('the flag drives the dialog, and stays authoritative over an imperative open', async ({
    mount,
    page,
  }) => {
    await mount(<VanillaReconcileHarness />);
    await expect(page.getByTestId('phase')).toHaveText('closed');

    await page.getByTestId('raise').click();
    await expect(page.getByTestId('phase')).toHaveText('open');
    await expect(page.getByTestId('open-count')).toHaveText('1');

    await page.getByTestId('lower').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');

    await page.getByTestId('open-behind-its-back').click();
    await expect(page.getByTestId('wanted')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('asked')).toContainText('close');
  });

  test('lowering the flag during the exit asks for nothing', async ({ mount, page }) => {
    await mount(<VanillaReconcileHarness />);
    await page.getByTestId('raise').click();
    await expect(page.getByTestId('asked')).toHaveText('open');

    await page.getByTestId('close-and-lower').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');

    // The flag lowered and the dialog gone, with nothing asked twice.
    await expect(page.getByTestId('asked')).toHaveText('open');

    // **The exit is a real one, and the sequence says so.** This harness asks for
    // `{ duration: 0, exitDuration: 120 }`: read the *entrance* duration at open and the exit is
    // skipped, so `'closing'` never publishes. `isVisible` versus `phase` on `['closing', true]` is
    // exhaustive in `core/__tests__/reconcile-open.test.ts` instead.
    await expect(page.getByTestId('phases-seen')).toHaveText('opening,open,closing,closed');
    await expect(page.getByTestId('open-count')).toHaveText('1');
  });
});

test.describe('bindDialog — a dialog the server rendered open', () => {
  const DIALOG = 'dialog[data-dialog-id="vanilla-server-open"]';

  /** What the three sources of truth say, which is the whole point: they must agree. */
  const state = async (page: Page) => {
    return page.evaluate((sel) => {
      const d = document.querySelector(sel);
      if (!(d instanceof HTMLDialogElement)) {
        return 'no dialog';
      }
      return `open=${String(d.open)} shown=${String(d.getBoundingClientRect().height > 0)}`;
    }, DIALOG);
  };

  test('a non-modal one is adopted where it stands', async ({ mount, page }) => {
    // Without adoption the store starts `closed` and the first pass writes `display: none` over it.
    const component = await mount(<VanillaServerOpenHarness nonModal />);

    await expect(component.getByTestId('phase')).toHaveText('open');
    expect(await state(page)).toBe('open=true shown=true');
  });

  test('a modal one is closed instead, because the top layer is not enterable from HTML', async ({
    mount,
    page,
  }) => {
    // Only script reaches the top layer, so a served `open` is a *non-modal* open with no backdrop.
    const component = await mount(<VanillaServerOpenHarness nonModal={false} />);

    await expect(component.getByTestId('phase')).toHaveText('closed');
    expect(await state(page)).toBe('open=false shown=false');
  });
});

/**
 * The floor under the reclaim, on a binding that renders nothing. `createFocusCoordinator` is shared,
 * but the director builds it for the hook pair and `bindDialog` builds its own at a different point.
 */
test.describe('bindDialog — a dialog that claimed no opening focus', () => {
  test('gets the keyboard back when a panel opens underneath', async ({ mount, page }) => {
    const component = await mount(<VanillaClaimlessReclaimHarness />);
    await component.getByTestId('open-both').click();

    await expect(page.locator('dialog[data-dialog-id="vanilla-claimless"]')).toBeVisible();
    await expect(page.locator('dialog[data-dialog-id="vanilla-claimless-panel"]')).toBeVisible();

    // Nothing outside the dialog holds it: a keyboard on `<body>` under the top layer is unreachable.
    await expect(
      page.locator(
        ':focus:not(dialog[data-dialog-id="vanilla-claimless"], dialog[data-dialog-id="vanilla-claimless"] *)'
      )
    ).toHaveCount(0);
    // The *first* focusable, not the last — the half only two buttons can show.
    await expect(page.getByTestId('vanilla-claimless-cancel')).toBeFocused();
  });
});

test.describe('bindDialog — onError', () => {
  test('a prepare that throws is reported, and the dialog still settles', async ({
    mount,
    page,
  }) => {
    const component = await mount(<VanillaPrepareFailureHarness />);
    await component.getByTestId('vpf-open').click();

    await expect(page.locator('dialog[data-dialog-id="vanilla-prepare-failure"]')).toBeVisible();

    await expect(component.getByTestId('vpf-sources')).toHaveText('prepare');
    await expect(component.getByTestId('vpf-message')).toHaveText('report is unavailable');

    // A report, not a veto. `aria-busy`, on the caller's markup, says the settle reached the element.
    await expect(component.getByTestId('vpf-preparing')).toHaveText('ready');
    await expect(page.locator('dialog[data-dialog-id="vanilla-prepare-failure"]')).toHaveAttribute(
      'aria-busy',
      'false'
    );
  });
});
