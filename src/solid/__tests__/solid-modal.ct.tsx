import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { frontDialogId } from '../../__tests__/stack-probe.js';
import {
  SolidBasicHarness,
  SolidClaimlessReclaimHarness,
  SolidPrepareFailureHarness,
  SolidShadowRootHarness,
  SolidBusyHarness,
  SolidContainedHarness,
  SolidLabellingHarness,
  SolidDisposalHarness,
  SolidLiveStateHarness,
  SolidOutletDisposalHarness,
  SolidPortalHarness,
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

  test('the dialog carries its accessible name and its busy state', async ({ mount, page }) => {
    // Solid builds the element itself, so both halves are its own code. `aria-busy` is the half
    // that had to become a render effect — the accessible name never changes, this does — which
    // is why "written" and "still right after the transition" are asserted separately.
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

    // Nothing re-renders here: `hasRunningAction` is a getter, and the two places that read it
    // are the only two that update. If it had been captured instead of tracked, both would be
    // stuck on the value they had when the modal opened.
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('running')).toHaveText('running');
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('action.isRunning names which one, and survives the binding’s own wrapper', async ({
    mount,
    page,
  }) => {
    // Solid re-wraps the core factory to attach `undeclare` on cleanup, so `isRunning` reaches
    // this binding only because that wrapper re-attaches it. A forwarding arrow would leave the
    // property behind and this would read `undefined is not a function`.
    await mount(<SolidBasicHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('confirm-running')).toHaveText('no');

    await page.getByRole('button', { name: 'Confirm' }).click();

    // Tracked, not captured: these are two separate reads of the same signal, and only the one
    // asking about `confirm` changes.
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
    await expect(page.getByTestId('foreground')).toHaveText('none');
    await expect(page.getByTestId('lookup-type')).toHaveText('none');

    await page.getByTestId('open').click();

    await expect(page.getByTestId('open-count')).toHaveText('1');
    // The snapshot's second field, subscribed to separately on this binding: `openDialogs`
    // moving is not evidence that `foreground` does.
    await expect(page.getByTestId('foreground')).toHaveText('solid-slide');
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

test.describe('what Solid does on the way out', () => {
  // Three cleanup paths React's suite covers and this one did not — coverage put every one of
  // them at zero executions. Disposal in Solid is a branch being replaced, which is what a child
  // function does here: the owner of the old branch is disposed, and its `onCleanup`s run.

  test('a disposed modal unregisters itself from the manager', async ({ mount, page }) => {
    await mount(<SolidDisposalHarness />);
    await expect(page.getByTestId('registration')).toHaveText('registered');

    await page.getByTestId('unmount').click();

    await expect(page.getByTestId('registration')).toHaveText('gone');
  });

  test('disposing it while open closes it and leaves no dialog behind', async ({ mount, page }) => {
    // The regression React already had once, in the other direction: a teardown that missed a
    // dependency left an orphaned dialog open in the top layer with nothing driving it.
    await mount(<SolidDisposalHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-disposal')).toBeVisible();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // From inside the dialog: it owns the top layer while open, so the outer button is unclickable.
    await page.getByTestId('unmount-from-inside').click();

    await expect(page.getByTestId('registration')).toHaveText('gone');
    await expect(page.locator('dialog[data-modal-id="solid-disposal"]')).toHaveCount(0);
    await expect(page.locator('dialog:modal')).toHaveCount(0);
  });

  test('an outlet forgets a modal that was disposed inside it', async ({ mount, page }) => {
    // `outlet.unregister` had never run. Without it the outlet keeps rendering the element of a
    // modal whose reactive graph is gone — visible, and driven by nothing.
    await mount(<SolidOutletDisposalHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-outlet-disposal')).toBeVisible();

    await page.getByTestId('unmount-from-inside').click();

    await expect(page.locator('dialog[data-modal-id="solid-outlet-disposal"]')).toHaveCount(0);
  });
});

test.describe('placement (Solid)', () => {
  test('portal: true mounts the dialog itself and leaves Modal null', async ({ mount, page }) => {
    // The one place the two hook bindings' surfaces differ: React's `createPortal` returns a node
    // the caller still renders, so a Solid modal that owns its element mounts it and hands back
    // `null`. Untested until now, which also meant the `document.body` cleanup was.
    await mount(<SolidPortalHarness />);
    await expect(page.getByTestId('modal-slot')).toHaveText('null');

    await page.getByTestId('open').click();
    await expect(page.getByTestId('modal-solid-portal')).toBeVisible();

    // In `document.body`, not inside the component that declared it.
    expect(
      await page.evaluate(() => {
        const dialog = document.querySelector('[data-modal-id="solid-portal"]');
        return dialog?.parentElement === document.body;
      })
    ).toBe(true);
  });

  test('a contained non-modal panel gets a positioned host of its own', async ({ mount, page }) => {
    // `nonModal: true` without `portal` renders into a library-owned wrapper and positions
    // `absolute` against it — the branch that makes an inline panel immune to a transformed
    // ancestor. In Solid the binding builds that wrapper itself, and nothing had exercised it.
    await mount(<SolidContainedHarness />);
    await page.getByTestId('open').click();

    await expect(page.getByTestId('modal-solid-contained')).toBeVisible();
    const host = page.locator('[data-modal-container="solid-contained"]');
    await expect(host).toHaveCount(1);
    // `absolute`, which `dialogPlacement` spells out and its doc explains: the host covers the
    // region it was placed in rather than taking part in the flow, and the dialog is positioned
    // against it.
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
    // `isPreparing`, `hasRunningAction` and `error` reach the return as well as the render args,
    // and that second copy exists for the trigger *outside* the modal — a spinner on the button
    // that opened it, an error beside it. On this binding they are getters over signals, so
    // reaching the return and staying live once there are two different claims, and the type
    // system only checks the first.
    await mount(<SolidLiveStateHarness />);
    await expect(page.getByTestId('outer-preparing')).toHaveText('ready');
    await expect(page.getByTestId('outer-running')).toHaveText('idle');
    await expect(page.getByTestId('outer-error')).toHaveText('none');

    await page.getByTestId('open').click();

    // `prepare` gates the open, and the gate is visible from outside while it runs.
    await expect(page.getByTestId('outer-preparing')).toHaveText('preparing');
    await expect(page.getByTestId('outer-preparing')).toHaveText('ready');

    await page.getByRole('button', { name: 'Boom' }).click();
    await expect(page.getByTestId('outer-running')).toHaveText('running');

    // The action throws, so the error lands on both sides of the seam and the running flag clears.
    await expect(page.getByTestId('outer-error')).toHaveText('boom failed');
    await expect(page.getByTestId('inner-error')).toHaveText('boom failed');
    await expect(page.getByTestId('outer-running')).toHaveText('idle');
    // A failed action does not close the modal — there is a retry to offer.
    await expect(page.getByTestId('modal-solid-live-state')).toBeVisible();
  });
});

/**
 * The labelling diagnostic, on the binding where it is easiest to get wrong.
 *
 * Solid's lifecycle effect tracks what its body reads, so the late-title half is what would catch
 * `isPreparing` going back to being read behind the function instead of passed into it.
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
    // The baseline, and it is what makes the next test mean something: a reorder that never happened
    // and a reorder that was not needed are indistinguishable from outside.
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

    // Nothing in `src/solid/` implements any of this — the policy lives on the manager and the
    // binding reaches it through `useModal`'s returned instance. Which is why nothing else would
    // notice if it stopped: `binding-parity.test.ts` compares export names, and this is a method.
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
 * The five options React's suite exercised and this one did not.
 *
 * They are not new behaviour — every one is a shared `attach*` function — which is exactly why the
 * absence mattered: the claim this binding makes is that it reaches the same code from its own
 * effects, and until something presses the keys, that claim rests on reading the source.
 */
test.describe('umbra/solid — the options only React had exercised', () => {
  test('containFocus wraps Tab inside a non-modal panel', async ({ mount, page }) => {
    await mount(<SolidNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // A non-modal dialog is not inert-guarded by the top layer, so without `containFocus` Tab walks
    // straight out into the page. Three focusables, so wrapping is distinguishable from "focus stayed
    // on the same element".
    await page.getByTestId('first').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('second')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('third')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('first')).toBeFocused();

    // And backwards, because a wrap that only worked forwards would leave Shift+Tab escaping.
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('third')).toBeFocused();
  });

  test('a custom dismissKey closes it, and Escape does not', async ({ mount, page }) => {
    await mount(<SolidNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Escape first: a non-modal dialog never gets the native `cancel` that a modal one does, so a
    // panel closing on Escape here could only mean the declared key was ignored.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    // And the reason, which is the assertion that cannot pass on a panel that closed: `isVisible`
    // alone stays true through the exit animation, so on its own it matches either outcome.
    await expect(page.getByTestId('last-reason')).toHaveText('none');

    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('dismissOnClickOutside closes it on a click in the page', async ({ mount, page }) => {
    await mount(<SolidNonModalOptionsHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Inside first — the assertion that this is click-*outside* and not click-anywhere.
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

    // `aborted`, not `settled`: the signal handed to `prepare` is aborted by the close, which is what
    // lets a caller cancel the fetch behind a loading modal instead of finishing it into a closed one.
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

/**
 * `reconcileOpen` from a Solid signal, and the focus restored after a failed action.
 *
 * Both were exercised on React and on nothing else. The reconciliation is the same three lines, in
 * `createEffect` instead of `useEffect` — which is the claim: the helper is framework-free and the
 * binding is the only thing that changes.
 */
// Only `reconcileOpen`: the failed-action restore is the matrix's `~` cell, whose harness
// (`SolidFailedActionHarness`) waits for the design change that would make its test pass.
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

    // Opened by id with the signal still false: the reconciliation puts it back, or the call site is
    // left believing a dialog on screen is closed.
    await page.getByTestId('open-behind-its-back').click();
    await expect(page.getByTestId('signal')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('asked')).toContainText('close');
  });

  test('lowering the signal during the exit asks for nothing', async ({ mount, page }) => {
    await mount(<SolidReconcileHarness />);
    await page.getByTestId('raise').click();
    await expect(page.getByTestId('asked')).toHaveText('open');

    // Inside the 120 ms window where `phase` is `'closing'` and `isVisible` is still true. Deciding on
    // `isVisible` would ask for a second close on a dialog already leaving.
    await page.getByTestId('close-and-lower').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('asked')).toHaveText('open');
    await expect(page.getByTestId('open-count')).toHaveText('1');
  });
});

test.describe('a dialog inside a shadow root (Solid)', () => {
  test('gets the library backdrop and its opening focus', async ({ mount, page }) => {
    // The whole Solid app is rendered into a shadow root, which is how a widget keeps the host
    // page's CSS out of it. Two things break there and both fail quietly: `adoptedStyleSheets`
    // does not cross the boundary, so the dialog falls back to the UA backdrop; and
    // `document.activeElement` answers with the host, so a focus policy reading it concludes
    // focus has left the dialog on every check. The core asks `getRootNode()` for both.
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
 * The floor under the reclaim, on the second hook binding.
 *
 * The repair is core and reached through `createFocusCoordinator`, but the scheduling around it is
 * each binding's own — Solid's component body runs once where React's re-runs — so this is measured
 * rather than inferred from the shared function.
 */
test.describe('a dialog that claimed no opening focus (Solid)', () => {
  test('gets the keyboard back when a panel opens underneath', async ({ mount, page }) => {
    const component = await mount(<SolidClaimlessReclaimHarness />);
    await component.getByTestId('solid-open-both').click();

    await expect(page.locator('dialog[data-modal-id="solid-claimless"]')).toBeVisible();
    await expect(page.locator('dialog[data-modal-id="solid-claimless-panel"]')).toBeVisible();

    // Nothing outside the modal holds it: it is in the top layer, and a keyboard on `<body>` there
    // is a dialog whose own keydown listener hears nothing.
    await expect(
      page.locator(
        ':focus:not(dialog[data-modal-id="solid-claimless"], dialog[data-modal-id="solid-claimless"] *)'
      )
    ).toHaveCount(0);
    // And it is the *first* action, not the last — the half two buttons are there to show.
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
