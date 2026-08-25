import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { frontDialogId } from '../../__tests__/stack-probe.js';
import {
  SolidBasicHarness,
  SolidClaimlessReclaimHarness,
  SolidFailedActionHarness,
  SolidPrepareFailureHarness,
  SolidShadowRootHarness,
  SolidBusyHarness,
  SolidContainedHarness,
  SolidLabellingHarness,
  SolidDisposalHarness,
  SolidLiveStateHarness,
  SolidOutletDisposalHarness,
  SolidPortalHarness,
  SolidPortalHostHarness,
  SolidDismissRequestHarness,
  SolidDeclarationHarness,
  SolidMessageHarness,
  SolidNonModalOptionsHarness,
  SolidReconcileHarness,
  SolidOpenOrderHarness,
  SolidOutletHarness,
  SolidSlideHarness,
  SolidStackPriorityHarness,
} from './solid-modal.story';

/**
 * `umbra/solid`, against a real browser and a real `<dialog>` — deliberately the same assertions
 * `use-dialog.ct.tsx` makes of React, in the same order, because the claim is one shared surface.
 * Tests with no React counterpart cover what only a fine-grained renderer can get wrong.
 */

test.describe('useDialog (Solid)', () => {
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
    // `showModal()`, not `show()` — React's default variant.
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

    // Cancel declared Escape as its hotkey, so the action wins over dismissal.
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

  test('the dialog carries its accessible name and its busy state', async ({ mount, page }) => {
    // Solid writes both itself; the name never changes, `aria-busy` does — hence a render effect.
    await mount(<SolidBusyHarness />);
    await page.getByTestId('open-busy').click();

    const dialog = page.locator('dialog[data-modal-id="solid-busy"]');
    await expect(page.getByRole('dialog', { name: 'Solid loading' })).toBeVisible();
    await expect(page.getByTestId('busy-preparing')).toHaveText('preparing');
    await expect(dialog).toHaveAttribute('aria-busy', 'true');

    await page.getByTestId('busy-release').click();
    await expect(page.getByTestId('busy-preparing')).toHaveText('ready');
    await expect(dialog).toHaveAttribute('aria-busy', 'false');
  });

  test('a running action is live in the render args and disables every button', async ({
    mount,
    page,
  }) => {
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();

    // Nothing re-renders: captured instead of tracked, this getter would be stuck at open time.
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('running')).toHaveText('running');
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('action.isRunning names which one, and survives the binding’s own wrapper', async ({
    mount,
    page,
  }) => {
    // Solid re-wraps the core factory, so a forwarding arrow would leave `isRunning` behind.
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('confirm-running')).toHaveText('no');

    await page.getByRole('button', { name: 'Confirm' }).click();

    // Two reads of the same signal, and only the one asking about `confirm` changes.
    await expect(page.getByTestId('confirm-running')).toHaveText('yes');
    await expect(page.getByTestId('cancel-running')).toHaveText('no');
    await expect(page.getByTestId('running')).toHaveText('running');

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
    // React expires a declaration by re-running `render`; here nothing re-runs, so the engine
    // learns only from the factory's `onCleanup`. Backdrop dismissal makes that observable.
    await mount(<SolidDeclarationHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-declaration')).toBeVisible();

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
  test('useSlideDialog hands the direction to its render context', async ({ mount, page }) => {
    await mount(<SolidSlideHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('direction')).toHaveText('right');
    await expect(page.getByTestId('modal-solid-slide')).toBeVisible();
  });

  test('the template’s context stays live, because it is merged and not spread', async ({
    mount,
    page,
  }) => {
    // `mergeProps`, not a spread: a spread freezes every getter, so `isPreparing` never returns.
    await mount(<SolidSlideHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('slide-preparing')).toHaveText('preparing');
    await expect(page.getByTestId('slide-preparing')).toHaveText('ready');
  });

  test('the manager hooks are live from outside the panel', async ({ mount, page }) => {
    // `useDialogManager` returns getters, `useLookup` an accessor; both have to stay live.
    await mount(<SolidSlideHarness />);
    await expect(page.getByTestId('open-count')).toHaveText('0');
    await expect(page.getByTestId('foreground')).toHaveText('none');
    await expect(page.getByTestId('lookup-type')).toHaveText('none');

    await page.getByTestId('open').click();

    await expect(page.getByTestId('open-count')).toHaveText('1');
    // Subscribed separately: `openDialogs` moving is not evidence that `foreground` does.
    await expect(page.getByTestId('foreground')).toHaveText('solid-slide');
    await expect(page.getByTestId('lookup-type')).toHaveText('slide');
  });

  test('useMessageDialog opens, closes with its action’s reason, and reports its type', async ({
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

test.describe('what Solid does on the way out', () => {
  // Disposal in Solid is a branch replaced: the old owner goes and its `onCleanup`s run. All three
  // paths measured at zero executions before these tests existed.

  test('a disposed modal unregisters itself from the manager', async ({ mount, page }) => {
    await mount(<SolidDisposalHarness />);
    await expect(page.getByTestId('registration')).toHaveText('registered');

    await page.getByTestId('unmount').click();

    await expect(page.getByTestId('registration')).toHaveText('gone');
  });

  test('disposing it while open closes it and leaves no dialog behind', async ({ mount, page }) => {
    // React's own regression once: a missed teardown dependency orphaned an open top-layer dialog.
    await mount(<SolidDisposalHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-disposal')).toBeVisible();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // From inside: an open dialog owns the top layer, so the outer button is unclickable.
    await page.getByTestId('unmount-from-inside').click();

    await expect(page.getByTestId('registration')).toHaveText('gone');
    await expect(page.locator('dialog[data-modal-id="solid-disposal"]')).toHaveCount(0);
    await expect(page.locator('dialog:modal')).toHaveCount(0);
  });

  test('an outlet forgets a modal that was disposed inside it', async ({ mount, page }) => {
    // Without `outlet.unregister` the outlet keeps rendering a modal whose graph is gone.
    await mount(<SolidOutletDisposalHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-outlet-disposal')).toBeVisible();

    await page.getByTestId('unmount-from-inside').click();

    await expect(page.locator('dialog[data-modal-id="solid-outlet-disposal"]')).toHaveCount(0);
  });
});

test.describe('umbra/solid — a dismissal this binding must report', () => {
  // `answerDismiss` is unit-tested, but nothing asserted this binding *reaches* it: a backdrop
  // handler closing the store itself works perfectly and ignores `onDismissRequest`, which is the
  // defect the option exists to prevent. Reverting this call site passes every other test.
  test('a backdrop click is reported to the owner instead of closing the dialog', async ({
    mount,
    page,
  }) => {
    await mount(<SolidDismissRequestHarness />);
    await page.getByTestId('open').click();

    const dialog = page.locator('dialog[data-modal-id="solid-dismiss-request"]');
    await expect(dialog).toBeVisible();

    await page.mouse.click(5, 5);

    await expect(page.getByTestId('cause')).toHaveText('backdrop-click');
    await page.waitForTimeout(600);
    await expect(dialog).toBeVisible();
  });
});

test.describe('placement (Solid)', () => {
  test('portal: true mounts the dialog itself and leaves Modal null', async ({ mount, page }) => {
    // The one place the hook surfaces differ: Solid owns the element, mounts it, returns `null`.
    await mount(<SolidPortalHarness />);
    await expect(page.getByTestId('modal-slot')).toHaveText('null');

    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-portal')).toBeVisible();

    expect(
      await page.evaluate(() => {
        const dialog = document.querySelector('[data-modal-id="solid-portal"]');
        return dialog?.parentElement === document.body;
      })
    ).toBe(true);
  });

  // A host the caller names, resolved once at mount — so it has to exist by then. That is the
  // arrangement `PortalTarget` describes, and the one this binding can honour.
  test('a portal host of the caller’s own is where the dialog lands', async ({ mount, page }) => {
    await mount(<SolidPortalHostHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-portal-host')).toBeVisible();

    expect(
      await page.evaluate(() => {
        const dialog = document.querySelector('[data-modal-id="solid-portal-host"]');
        return dialog?.parentElement?.getAttribute('data-testid');
      })
    ).toBe('solid-themed-host');
  });

  test('a contained non-modal panel gets a positioned host of its own', async ({ mount, page }) => {
    // A library-owned wrapper, positioned against — the branch immune to a transformed ancestor.
    await mount(<SolidContainedHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('modal-solid-contained')).toBeVisible();
    const host = page.locator('[data-modal-container="solid-contained"]');
    await expect(host).toHaveCount(1);
    // `absolute`, so the host covers its region rather than taking part in the flow.
    expect(
      await host.evaluate((element) => {
        return getComputedStyle(element).position;
      })
    ).toBe('absolute');
  });

  test('the live fields on the hook’s return stay live outside the dialog', async ({
    mount,
    page,
  }) => {
    // The copy for the trigger *outside* the modal. Getters over signals, so reaching the return
    // and staying live once there are two claims and the type system checks only the first.
    await mount(<SolidLiveStateHarness />);
    await expect(page.getByTestId('outer-preparing')).toHaveText('ready');
    await expect(page.getByTestId('outer-running')).toHaveText('idle');
    await expect(page.getByTestId('outer-error')).toHaveText('none');

    await page.getByTestId('open').click();

    await expect(page.getByTestId('outer-preparing')).toHaveText('preparing');
    await expect(page.getByTestId('outer-preparing')).toHaveText('ready');

    await page.getByRole('button', { name: 'Boom' }).click();
    await expect(page.getByTestId('outer-running')).toHaveText('running');

    // The error lands on both sides of the seam, and a failed action leaves the modal up to retry.
    await expect(page.getByTestId('outer-error')).toHaveText('boom failed');
    await expect(page.getByTestId('inner-error')).toHaveText('boom failed');
    await expect(page.getByTestId('outer-running')).toHaveText('idle');
    await expect(page.getByTestId('modal-solid-live-state')).toBeVisible();
  });
});

/**
 * The labelling diagnostic. Solid's lifecycle effect tracks what its body reads, so the late-title
 * half catches `isPreparing` being read behind the function instead of passed into it.
 */
test.describe('the labelling diagnostic (Solid)', () => {
  const warningsOn = (page: Page) => {
    const lines: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') {
        lines.push(message.text());
      }
    });
    return lines;
  };

  const labelling = (lines: string[]) => {
    return lines.filter((line) => {
      return line.includes('Dialog labelling');
    });
  };

  test('reports a reference that points at no element', async ({ mount, page }) => {
    const warnings = warningsOn(page);

    await mount(<SolidLabellingHarness />);
    await page.getByTestId('open-dangling').click();
    await expect(page.locator('dialog[data-modal-id="solid-dangling"]')).toBeVisible();
    await page.waitForTimeout(300);

    expect(labelling(warnings)).toHaveLength(1);
    expect(labelling(warnings)[0]).toContain('solid-dangling-title');
  });

  test('says nothing about a name its prepare had not rendered yet', async ({ mount, page }) => {
    const warnings = warningsOn(page);

    await mount(<SolidLabellingHarness />);
    await page.getByTestId('open-late').click();
    await expect(page.getByTestId('solid-late-pending')).toBeVisible();
    await page.waitForTimeout(300);

    await page.getByTestId('solid-late-release').click();
    await expect(page.locator('#solid-late-title')).toBeVisible();
    await page.waitForTimeout(300);

    expect(labelling(warnings)).toEqual([]);
  });
});

test.describe('prioritize (Solid)', () => {
  test('without a policy the dialog that opened last is in front', async ({ mount, page }) => {
    // The baseline: a reorder that never happened and one not needed look the same from outside.
    await mount(<SolidOpenOrderHarness />);
    await page.getByTestId('solid-sp-open-warning').click();
    await page.getByTestId('solid-sp-open-panel').click();
    await expect(page.locator('dialog[data-modal-id="solid-sp-panel"]')).toBeVisible();

    await expect
      .poll(() => {
        return frontDialogId(page);
      })
      .toBe('solid-sp-panel');
  });

  test('the policy is inherited by this binding too', async ({ mount, page }) => {
    await mount(<SolidStackPriorityHarness />);
    await page.getByTestId('solid-sp-open-warning').click();
    await page.getByTestId('solid-sp-open-panel').click();
    await expect(page.locator('dialog[data-modal-id="solid-sp-panel"]')).toBeVisible();

    // Nothing in `src/solid/` implements this, so nothing else would notice if it stopped arriving.
    await expect
      .poll(() => {
        return frontDialogId(page);
      })
      .toBe('solid-sp-warning');
    await expect(page.locator('dialog[data-modal-id="solid-sp-panel"]')).toHaveAttribute(
      'open',
      ''
    );
  });
});

/**
 * Five options React's suite exercised and this one did not — each a shared `attach*` function, so
 * the claim is that this binding reaches the same code from its own effects.
 */
test.describe('umbra/solid — the options only React had exercised', () => {
  test('containFocus wraps Tab inside a non-modal panel', async ({ mount, page }) => {
    await mount(<SolidNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // No top layer to guard it; three focusables, so a wrap differs from focus staying put.
    await page.getByTestId('first').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('third')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('first')).toBeFocused();

    // Backwards too: a forward-only wrap would leave Shift+Tab escaping.
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('third')).toBeFocused();
  });

  test('a custom dismissKey closes it, and Escape does not', async ({ mount, page }) => {
    await mount(<SolidNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // No native `cancel` on a non-modal dialog, so an Escape close means the key was ignored.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    // The reason too: `isVisible` stays true through an exit, so it matches a closing panel as well.
    await expect(page.getByTestId('last-reason')).toHaveText('none');

    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('dismissOnClickOutside closes it on a click in the page', async ({ mount, page }) => {
    await mount(<SolidNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Inside first — this is click-*outside*, not click-anywhere.
    await page.getByTestId('third').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('outside').click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('a close aborts the prepare it was waiting on', async ({ mount, page }) => {
    await mount(<SolidNonModalOptionsHarness />);
    await page.getByTestId('open-held').click();
    await expect(page.getByTestId('prepare-outcome')).toHaveText('running');

    await page.getByTestId('close-mid-prepare').click();

    // `aborted`, not `settled`: the close aborts `prepare`'s signal, cancelling the fetch behind it.
    await expect(page.getByTestId('prepare-outcome')).toHaveText('aborted');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });

  test('onOpenRequest can refuse, and the refusal carries its reason', async ({ mount, page }) => {
    await mount(<SolidNonModalOptionsHarness />);
    await page.getByTestId('request').click();

    await expect(page.getByTestId('request-outcome')).toHaveText('refused: solid said no');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
  });
});

test.describe('umbra/solid — focus after a failed action', () => {
  test('lands on the button that ran it, which Solid had already replaced', async ({
    mount,
    page,
  }) => {
    // The discriminating arrangement: the opening focus is `other` (first focusable, no claim), so a
    // restore that falls to its floor is visible as *not* landing on `fail`. Solid replaces the
    // button when the action's state changes, so every element the coordinator captured is detached
    // by the time this settles — it re-queries `[data-action-reason]` instead of trusting a node.
    await mount(<SolidFailedActionHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('other')).toBeFocused();

    await page.getByTestId('fail').click();
    await expect(page.getByTestId('failures')).toHaveText('1');
    await expect(page.getByTestId('error')).toHaveText('solid action failed');

    await expect(page.getByTestId('fail')).toBeFocused();
  });
});

/**
 * `reconcileOpen` from a Solid signal — the same three lines, in `createEffect` instead of
 * `useEffect`, which is the claim: the helper is framework-free and only the binding changes.
 */
test.describe('umbra/solid — reconcileOpen', () => {
  test('the signal drives the dialog, and stays authoritative over an imperative open', async ({
    mount,
    page,
  }) => {
    await mount(<SolidReconcileHarness />);
    await expect(page.getByTestId('phase')).toHaveText('closed');

    await page.getByTestId('raise').click();
    await expect(page.getByTestId('phase')).toHaveText('open');
    await expect(page.getByTestId('open-count')).toHaveText('1');

    await page.getByTestId('lower').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');

    // Opened by id with the signal still false: unreconciled, the call site believes it is closed.
    await page.getByTestId('open-behind-its-back').click();
    await expect(page.getByTestId('signal')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('asked')).toContainText('close');
  });

  test('lowering the signal during the exit asks for nothing', async ({ mount, page }) => {
    await mount(<SolidReconcileHarness />);
    await page.getByTestId('raise').click();
    await expect(page.getByTestId('asked')).toHaveText('open');

    // Inside the 120 ms window where `phase` is `'closing'` but `isVisible` is still true.
    await page.getByTestId('close-and-lower').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('asked')).toHaveText('open');
    await expect(page.getByTestId('open-count')).toHaveText('1');
  });
});

test.describe('a dialog inside a shadow root (Solid)', () => {
  test('gets the library backdrop and its opening focus', async ({ mount, page }) => {
    // The whole app in a shadow root, as a widget keeping the host page's CSS out. Two quiet
    // failures: `adoptedStyleSheets` stops at the boundary and `document.activeElement` is the host.
    await mount(<SolidShadowRootHarness />);
    await page.getByTestId('open').click();

    await expect
      .poll(() => {
        return page.evaluate(() => {
          const root = document.querySelector('[data-testid="solid-shadow-host"]')?.shadowRoot;
          return root?.querySelector('dialog')?.matches(':modal') ?? false;
        });
      })
      .toBe(true);

    const measured = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="solid-shadow-host"]')?.shadowRoot;
      const dialog = root?.querySelector('dialog');
      return {
        backdrop: dialog ? getComputedStyle(dialog, '::backdrop').backgroundColor : null,
        focusIsInside: dialog?.contains(root?.activeElement ?? null) ?? false,
      };
    });

    // The library's own sheet, adopted into *this* root. The UA default measures rgba(0, 0, 0, 0.1).
    expect(measured.backdrop).toBe('rgba(0, 0, 0, 0.7)');
    expect(measured.focusIsInside, 'focus did not settle inside the shadowed dialog').toBe(true);
  });
});

/**
 * The floor under the reclaim, on the second hook binding. `createFocusCoordinator` is shared but the
 * scheduling around it is each binding's own — Solid's body runs once where React's re-runs.
 */
test.describe('a dialog that claimed no opening focus (Solid)', () => {
  test('gets the keyboard back when a panel opens underneath', async ({ mount, page }) => {
    const component = await mount(<SolidClaimlessReclaimHarness />);
    await component.getByTestId('solid-open-both').click();

    await expect(page.locator('dialog[data-modal-id="solid-claimless"]')).toBeVisible();
    await expect(page.locator('dialog[data-modal-id="solid-claimless-panel"]')).toBeVisible();

    // Nothing outside holds it: a keyboard on `<body>` under the top layer hears nothing.
    await expect(
      page.locator(
        ':focus:not(dialog[data-modal-id="solid-claimless"], dialog[data-modal-id="solid-claimless"] *)'
      )
    ).toHaveCount(0);
    // The *first* action, not the last — the half two buttons are there to show.
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  });
});

test.describe('onError (Solid)', () => {
  test('a prepare that throws is reported, and the modal still settles', async ({
    mount,
    page,
  }) => {
    const component = await mount(<SolidPrepareFailureHarness />);
    await component.getByTestId('solid-pf-open').click();

    await expect(page.locator('dialog[data-modal-id="solid-prepare-failure"]')).toBeVisible();

    await expect(component.getByTestId('solid-pf-sources')).toHaveText('prepare');
    await expect(component.getByTestId('solid-pf-message')).toHaveText('report is unavailable');

    // A report, not a veto — and the half that was invisible before the option existed.
    await expect(component.getByTestId('solid-pf-visible')).toHaveText('open');
    await expect(component.getByTestId('solid-pf-preparing')).toHaveText('ready');
    await expect(page.locator('dialog[data-modal-id="solid-prepare-failure"]')).toHaveAttribute(
      'aria-busy',
      'false'
    );
  });
});
