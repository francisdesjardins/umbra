import { expect, test } from '@playwright/experimental-ct-react';
import type { Page } from '@playwright/test';
import {
  ActionErrorHotkeyRetryHarness,
  BackdropHitTestHarness,
  EscWithoutFocusHarness,
  KeyPassthroughHarness,
  TransitionToggleHarness,
  BasicHarness,
  OnOpenAbortHarness,
  CustomDismissKeyHarness,
  DismissKeyDisabledHarness,
  NonModalClickOutsideDefaultHarness,
  NonModalClickOutsideHarness,
  NonModalCustomDismissKeyHarness,
  NonModalEscIsolationHarness,
  NonModalHarness,
  NonModalStackHarness,
  PortalDefaultHarness,
  PortalNonModalDefaultHarness,
  PortalNonModalOptInHarness,
  PortalOptInHarness,
  OpenAndWaitHarness,
  OpenAndWaitOrderingHarness,
  DismissWhilePreparingDefaultHarness,
  DismissWhilePreparingDisabledHarness,
  ReopenSettlesHarness,
  StableIdentityHarness,
  AccessibleNameHarness,
  StylingSurfaceHarness,
  StructuralToggleHarness,
  StackedModalsHarness,
  NestedHotkeyScopeHarness,
  ContainedOverlayHarness,
  FocusUnderAnotherModalHarness,
} from './use-modal.story';

test.describe('useModal', () => {
  test('modal is initially closed', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('modal-basic-modal')).not.toBeVisible();
  });

  test('opens when open() is called', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('modal-basic-modal')).toBeVisible();
    await expect(page.getByTestId('modal-basic-modal')).toContainText('Modal content');
  });

  test('closes with reason "confirm" via controller', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-basic-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('closes with reason "cancel" via controller', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('closes with reason "dismiss" on Escape key', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-basic-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('open() settles immediately when the modal is already open (regression)', async ({
    mount,
    page,
  }) => {
    await mount(<ReopenSettlesHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-reopen-modal')).toBeVisible();
    await expect(page.getByTestId('settle-count')).toHaveText('1');
    // Second open() while already open must resolve, not hang forever.
    await page.getByRole('button', { name: 'Reopen' }).click();
    await expect(page.getByTestId('settle-count')).toHaveText('2');
    // The modal stays open and functional.
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByTestId('modal-reopen-modal')).not.toBeVisible();
  });

  test('openAndWait resolves with the close reason', async ({ mount, page }) => {
    await mount(<OpenAndWaitHarness />);
    await page.getByRole('button', { name: 'Open and Wait' }).click();
    await expect(page.getByTestId('status')).toHaveText('waiting');
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('status')).toHaveText('resolved:done');
  });

  test('openAndWait settles even when the close lands during prepare', async ({ mount, page }) => {
    await mount(<OpenAndWaitOrderingHarness />);
    await page.getByTestId('open-and-wait').click();
    await expect(page.getByTestId('loading-state')).toHaveText('loading');
    // Dismissed before `prepare` ever settles — the window a close resolver registered on the
    // line *after* the open would fall into, waiting for a close that already happened. The
    // store-side invariant that makes that a real hazard is in `modal-store.test.ts`.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('outcome')).toHaveText('settled:dismiss');
  });

  test('can be opened and closed multiple times', async ({ mount, page }) => {
    await mount(<BasicHarness />);

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-basic-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-basic-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });
});

test.describe('useModal — data-modal-type', () => {
  test('modal dialog has data-modal-type="modal"', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-basic-modal')).toHaveAttribute('data-modal-type', 'modal');
  });

  test('non-modal dialog has data-modal-type="non-modal"', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('modal-non-modal-dialog')).toHaveAttribute(
      'data-modal-type',
      'non-modal'
    );
  });
});

test.describe('useModal — nonModal', () => {
  test('opens with dialog.show() (not in top-layer)', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('modal-non-modal-dialog')).toBeVisible();
  });

  test('sets data-modal-z attribute on the dialog element', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    const dialog = page.getByTestId('modal-non-modal-dialog');
    await expect(dialog).toBeVisible();
    const zAttr = await dialog.getAttribute('data-modal-z');
    expect(zAttr).toBeTruthy();
    expect(Number(zAttr)).toBeGreaterThanOrEqual(1300);
  });

  test('sets z-index style on the dialog element', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    const dialog = page.getByTestId('modal-non-modal-dialog');
    await expect(dialog).toBeVisible();
    const zIndex = await dialog.evaluate((el) => {
      return el.style.zIndex;
    });
    expect(Number(zIndex)).toBeGreaterThanOrEqual(1300);
  });

  test('clicks outside the dialog do not close it', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Click on the outside button — should work and NOT close the dialog
    await page.getByTestId('outside-button').click();
    await expect(page.getByTestId('open-count')).toHaveText('1');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });

  test('ESC key still closes when dialog has focus', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('modal-non-modal-dialog')).toBeVisible();

    // Focus the dialog content, then press Escape
    await page.getByRole('button', { name: 'Confirm' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('body scroll is not locked for non-modal dialogs', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('body-overflow')).toHaveText('free');
  });

  test('stacked non-modal dialogs have increasing z-index', async ({ mount, page }) => {
    await mount(<NonModalStackHarness />);

    await page.getByRole('button', { name: 'Open First' }).click();
    await expect(page.getByTestId('modal-non-modal-first')).toBeVisible();

    // Open second from inside the first
    await page.getByRole('button', { name: 'Open Second' }).click();
    await expect(page.getByTestId('modal-non-modal-second')).toBeVisible();

    const firstZ = Number(
      await page.getByTestId('modal-non-modal-first').getAttribute('data-modal-z')
    );
    const secondZ = Number(
      await page.getByTestId('modal-non-modal-second').getAttribute('data-modal-z')
    );
    expect(secondZ).toBeGreaterThan(firstZ);

    // Body scroll should not be locked
    await expect(page.getByTestId('body-overflow')).toHaveText('free');
  });

  test('closes via controller button', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('modal-non-modal-dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('ESC closes non-modal when focus is outside the dialog', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('modal-non-modal-dialog')).toBeVisible();

    // Move focus outside the dialog
    await page.getByTestId('outside-button').focus();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('ESC on non-modal does not propagate to underlying elements', async ({ mount, page }) => {
    await mount(<NonModalEscIsolationHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('modal-esc-isolation-panel')).toBeVisible();

    // Focus an element outside the dialog
    await page.getByTestId('outside-button').focus();
    await page.keyboard.press('Escape');

    // Panel should be closed
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
    // ESC must not have leaked to the document bubble listener
    await expect(page.getByTestId('leak-count')).toHaveText('0');
  });

  test('ESC closes only the topmost non-modal in a stack', async ({ mount, page }) => {
    await mount(<NonModalStackHarness />);
    await page.getByRole('button', { name: 'Open First' }).click();
    await expect(page.getByTestId('modal-non-modal-first')).toBeVisible();

    // Open second from inside first
    await page.getByRole('button', { name: 'Open Second' }).click();
    await expect(page.getByTestId('modal-non-modal-second')).toBeVisible();

    // ESC should close only the topmost (second)
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-non-modal-second')).not.toBeVisible();
    await expect(page.getByTestId('modal-non-modal-first')).toBeVisible();

    // ESC again should close the first
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-non-modal-first')).not.toBeVisible();
  });
});

test.describe('useModal — dismissKey', () => {
  test('custom dismissKey closes on that key, Escape does not', async ({ mount, page }) => {
    await mount(<CustomDismissKeyHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Escape should NOT close — dismissKey is Delete
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Delete should close with 'dismiss'
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('dismissKey: false disables all key-based dismissal', async ({ mount, page }) => {
    await mount(<DismissKeyDisabledHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Only the explicit Close button works
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('close');
  });

  test('custom dismissKey on non-modal closes from outside and isolates', async ({
    mount,
    page,
  }) => {
    await mount(<NonModalCustomDismissKeyHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Focus outside and press Delete — should close
    await page.getByTestId('outside-button').focus();
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
    // Delete must not have leaked to the document bubble listener
    await expect(page.getByTestId('leak-count')).toHaveText('0');
  });

  test('custom dismissKey on non-modal ignores Escape', async ({ mount, page }) => {
    await mount(<NonModalCustomDismissKeyHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });
});

test.describe('useModal — portal', () => {
  test('modal dialog renders inline by default (no portal)', async ({ mount, page }) => {
    await mount(<PortalDefaultHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-parent')).not.toHaveText('BODY');
  });

  test('modal dialog portals to body when portal: true', async ({ mount, page }) => {
    await mount(<PortalOptInHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-parent')).toHaveText('BODY');
  });

  test('non-modal dialog renders inline by default (no portal)', async ({ mount, page }) => {
    await mount(<PortalNonModalDefaultHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-parent')).not.toHaveText('BODY');
  });

  test('non-modal dialog portals to body when portal: true', async ({ mount, page }) => {
    await mount(<PortalNonModalOptInHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-parent')).toHaveText('BODY');
  });

  test('modal without portal: full lifecycle works', async ({ mount, page }) => {
    await mount(<PortalDefaultHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-portal-default')).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('done');
  });

  test('non-modal without portal: full lifecycle works', async ({ mount, page }) => {
    await mount(<PortalNonModalDefaultHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('modal-portal-non-modal-default')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('non-modal without portal: click-through still works', async ({ mount, page }) => {
    await mount(<PortalNonModalDefaultHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('outside-button').click();
    await expect(page.getByTestId('open-count')).toHaveText('1');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });

  test('non-modal without portal: ESC still closes', async ({ mount, page }) => {
    await mount(<PortalNonModalDefaultHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('modal-portal-non-modal-default')).toBeVisible();

    await page.getByRole('button', { name: 'Confirm' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('toggling a structural prop (portal) while open tears the dialog down cleanly and can reopen (regression: portal missing from teardown deps left an orphaned open dialog)', async ({
    mount,
    page,
  }) => {
    await mount(<StructuralToggleHarness />);
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Flip `portal` while open — the dialog must remount into a new structure, so the
    // modal has to close rather than leave a stuck, still-open dialog blocking the page.
    await page.getByTestId('toggle-portal').click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
    // Exactly one dialog element, and it is not open.
    await expect(page.getByTestId('modal-structural-toggle')).toHaveCount(1);
    await expect(page.getByTestId('modal-structural-toggle')).not.toBeVisible();

    // And it can be reopened (state fully reset).
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('modal-structural-toggle')).toBeVisible();
  });
});

test.describe('useModal — dismissWhilePreparing', () => {
  test('dismissWhilePreparing: false — ESC during prepare does not close', async ({
    mount,
    page,
  }) => {
    await mount(<DismissWhilePreparingDisabledHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('loading-state')).toHaveText('loading');

    // Focus inside the dialog, then press ESC — must be blocked while prepare runs
    await page.getByTestId('resolve-loading').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('loading-state')).toHaveText('loading');
  });

  test('dismissWhilePreparing: false — ESC after prepare resolves does close', async ({
    mount,
    page,
  }) => {
    await mount(<DismissWhilePreparingDisabledHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('loading-state')).toHaveText('loading');

    // Resolve loading
    await page.getByTestId('resolve-loading').click();
    await expect(page.getByTestId('loading-state')).toHaveText('ready');

    // ESC now allowed
    await page.getByTestId('resolve-loading').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('dismissWhilePreparing: true (default) — ESC during prepare closes', async ({
    mount,
    page,
  }) => {
    await mount(<DismissWhilePreparingDefaultHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('loading-state')).toHaveText('loading');

    // ESC during loading — default is true, so dismiss is allowed
    await page.getByRole('button', { name: 'Confirm' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });
});

test.describe('useModal — dismissOnClickOutside', () => {
  test('click outside closes non-modal with reason "dismiss"', async ({ mount, page }) => {
    await mount(<NonModalClickOutsideHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Click outside the dialog
    await page.getByTestId('outside-button').click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('click inside dialog does not close it', async ({ mount, page }) => {
    await mount(<NonModalClickOutsideHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Click inside the dialog content
    await page.getByText('Click outside to dismiss').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });

  test('default false — click outside does not close', async ({ mount, page }) => {
    await mount(<NonModalClickOutsideDefaultHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('outside-button').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });

  test('can reopen after click-outside dismiss', async ({ mount, page }) => {
    await mount(<NonModalClickOutsideHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('outside-button').click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    // Reopen
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });
});

test.describe('useModal — returned identities', () => {
  test('open/openAndWait/handle keep a stable identity across re-renders and a full lifecycle', async ({
    mount,
    page,
  }) => {
    await mount(<StableIdentityHarness />);
    await expect(page.getByTestId('identity')).toHaveText('stable');

    // Arbitrary re-render of the owning component.
    await page.getByRole('button', { name: 'Force Re-render' }).click();
    await expect(page.getByTestId('tick')).toHaveText('1');
    await expect(page.getByTestId('identity')).toHaveText('stable');

    // Re-renders driven by the store's own phase transitions.
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('identity')).toHaveText('stable');

    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('identity')).toHaveText('stable');
  });
});

test.describe('useModal — backdrop click hit testing', () => {
  test('a keyboard-activated button does not dismiss the modal (its click reports clientX/Y of 0)', async ({
    mount,
    page,
  }) => {
    await mount(<BackdropHitTestHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Enter on a focused button dispatches a click at (0, 0) — outside the dialog's
    // rect. Only the target check keeps it from reading as a backdrop dismissal.
    await page.getByTestId('content-button').focus();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('activated')).toHaveText('yes');

    // `is-visible` reports `phase !== 'closed'`, so it still reads 'open' for the whole
    // exit animation — asserting it immediately would pass even on a dismissal that
    // is already under way. Settle past the exit duration first, then assert.
    await page.waitForTimeout(400);
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('last-reason')).toHaveText('');
  });

  test('content clicks still bubble out of the dialog to user-land ancestors', async ({
    mount,
    page,
  }) => {
    await mount(<BackdropHitTestHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('content-button').click();
    await expect(page.getByTestId('activated')).toHaveText('yes');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('bubbled-clicks')).toHaveText('1');
  });

  test('a genuine backdrop click still dismisses', async ({ mount, page }) => {
    await mount(<BackdropHitTestHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Top-left corner of the viewport is backdrop, outside the centred dialog.
    await page.mouse.click(5, 5);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('the transition-disabled answer is re-measured per open, not cached for the element', async ({
    mount,
    page,
  }) => {
    // The cached answer decides how the close path finalizes: immediately, or after waiting
    // for a `transitionend`. Caching it for the element's lifetime means a modal whose
    // transitions are switched off between opens still waits for an event that can never
    // fire, and only finalizes on the safety timeout — which logs this warning.
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Animation fallback timeout')) {
        warnings.push(message.text());
      }
    });

    await mount(<TransitionToggleHarness />);

    // First cycle with transitions live — the normal path, `transitionend` fires.
    await page.getByRole('button', { name: 'Open Toggle' }).click();
    await expect(page.getByTestId('toggle-is-visible')).toHaveText('open');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('toggle-is-visible')).toHaveText('closed');
    expect(warnings).toEqual([]);

    // Same element, transitions now disabled by a stylesheet.
    await page.getByRole('button', { name: 'Disable Transitions' }).click();
    await page.getByRole('button', { name: 'Open Toggle' }).click();
    await expect(page.getByTestId('toggle-is-visible')).toHaveText('open');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('toggle-is-visible')).toHaveText('closed');

    // Give the safety timeout (exitDuration + 50ms) time to fire if the close path took it.
    await page.waitForTimeout(400);
    expect(warnings).toEqual([]);
  });
});

test.describe('a non-modal panel and the page keyboard', () => {
  test('a dismiss key the panel refuses to act on still reaches the app', async ({
    mount,
    page,
  }) => {
    // Claiming the key when the panel closes is right — the app should not also react to the
    // press that closed it. Claiming it and then declining to close is not: the key is gone
    // and nothing happened, which in an app with its own shortcuts reads as a dead keyboard.
    await mount(<KeyPassthroughHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('panel-preparing')).toHaveText('preparing');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-key-passthrough')).toBeVisible();
    await expect(page.getByTestId('app-escapes')).toHaveText('1');
  });

  test('a dismiss key the panel acts on is consumed', async ({ mount, page }) => {
    await mount(<KeyPassthroughHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await page.getByRole('button', { name: 'Finish Preparing' }).click();
    await expect(page.getByTestId('panel-preparing')).toHaveText('ready');

    // Now the panel does dismiss, so the app must not see the key that dismissed it.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-key-passthrough')).not.toBeVisible();
    await expect(page.getByTestId('app-escapes')).toHaveText('0');
  });
});

test.describe('ESC does not depend on where focus is', () => {
  test('closes a modal whose content holds nothing focusable', async ({ mount, page }) => {
    await mount(<EscWithoutFocusHarness />);
    await page.getByRole('button', { name: 'Open Unfocusable' }).click();
    await expect(page.getByTestId('unfocusable-is-visible')).toHaveText('open');

    // Focus outside the dialog is ordinary: `showModal()` has nowhere to put it when nothing
    // in the content is focusable, and content that swaps after opening (a loading panel
    // giving way to the real thing) drops whatever held it. Reproduced directly here.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    expect(
      await page.evaluate(() => {
        const dialog = document.querySelector('[data-testid="modal-esc-no-focus"]');
        return dialog?.contains(document.activeElement) ?? false;
      })
    ).toBe(false);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('unfocusable-is-visible')).toHaveText('closed');
    await expect(page.getByTestId('unfocusable-reason')).toHaveText('dismiss');
  });

  test('never leaves the dialog natively closed while the store still has it open', async ({
    mount,
    page,
  }) => {
    // The failure this guards: the browser's own cancel closes the `<dialog>` behind the
    // store's back. The element keeps rendering — but out of the top layer, so it reappears
    // wherever it sits in the tree, backdrop gone.
    await mount(<EscWithoutFocusHarness />);
    await page.getByRole('button', { name: 'Open Unfocusable' }).click();
    await expect(page.getByTestId('unfocusable-is-visible')).toHaveText('open');
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    const desynced = await page.evaluate(() => {
      const dialog = document.querySelector('[data-testid="modal-esc-no-focus"]');
      const storeSaysOpen =
        document.querySelector('[data-testid="unfocusable-is-visible"]')?.textContent === 'open';
      return storeSaysOpen && dialog?.hasAttribute('open') === false;
    });
    expect(desynced, 'the dialog was closed natively while the store still had it open').toBe(
      false
    );
  });
});

test.describe('focus survives a failed action', () => {
  test('the hotkey still fires on the retry', async ({ mount, page }) => {
    // The failure this guards: the action's button is the autofocus target and goes `disabled`
    // while it runs, so focus lands on `<body>`. Restoring it in the same tick the engine
    // reports the failure focuses a button React has not re-enabled yet — a silent no-op that
    // leaves the modal with no keyboard at all.
    await mount(<ActionErrorHotkeyRetryHarness />);
    await page.getByRole('button', { name: 'Open Retry' }).click();
    await expect(page.getByTestId('retry-is-visible')).toHaveText('open');

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('retry-error')).toHaveText('Save failed');
    await expect(page.getByTestId('retry-attempts')).toHaveText('1');

    // Polled, not read once: the restore is deliberately deferred to the next animation frame —
    // that delay *is* the fix — while the assertion above settles as soon as React commits the
    // attempt count. Reading synchronously here raced that frame and failed about one run in ten.
    await expect
      .poll(() => {
        return page.evaluate(() => {
          const dialog = document.querySelector('[data-testid="modal-action-error-retry"]');
          return dialog?.contains(document.activeElement) ?? false;
        });
      }, 'focus was left outside the dialog after the action failed')
      .toBe(true);

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('retry-attempts')).toHaveText('2');
  });
});

test.describe('the styling surface', () => {
  test('`data-modal-id` and `data-modal-type` are the hooks CSS reaches a dialog by', async ({
    mount,
    page,
  }) => {
    await mount(<StylingSurfaceHarness />);
    await page.getByRole('button', { name: 'Open Sized' }).click();

    // One selector reaches one dialog, by the id its author gave it — no test id, no class
    // the consumer has to invent, no knowledge of where in the tree it renders.
    await expect(page.locator('dialog[data-modal-id="styling-surface"]')).toBeVisible();
    await expect(page.locator('dialog[data-modal-id="styling-surface"]')).toHaveAttribute(
      'data-modal-type',
      'modal'
    );
    // And the variant attribute pairs with it: `dialog[data-modal-type='non-modal']` is every
    // non-modal dialog at once.
    await expect(page.locator('dialog[data-modal-id="styling-surface-slide"]')).toHaveCount(1);
  });

  test('`--dialog-backdrop` overrides the library backdrop without out-specifying it', async ({
    mount,
    page,
  }) => {
    await mount(<StylingSurfaceHarness />);
    await page.getByRole('button', { name: 'Open Sized' }).click();

    const backdrop = await page
      .locator('dialog[data-modal-id="styling-surface"]')
      .evaluate((node) => {
        return getComputedStyle(node, '::backdrop').backgroundColor;
      });
    expect(backdrop).toBe('rgb(0, 128, 0)');
  });

  test('`style` sizes the dialog box, which the library never does', async ({ mount, page }) => {
    await mount(<StylingSurfaceHarness />);
    await page.getByRole('button', { name: 'Open Sized' }).click();

    // Computed, not measured: a bounding box during the entrance transition reports the
    // animated transform, which is the animation's answer rather than the style's.
    const size = await page.locator('dialog[data-modal-id="styling-surface"]').evaluate((node) => {
      const style = getComputedStyle(node);
      return { width: style.width, height: style.height };
    });
    expect(size).toEqual({ width: '200px', height: '120px' });
  });

  test('a template keeps its placement while the caller sets the size', async ({ mount, page }) => {
    await mount(<StylingSurfaceHarness />);
    await page.getByRole('button', { name: 'Open Drawer' }).click();

    const dialog = page.locator('dialog[data-modal-id="styling-surface-slide"]');
    await expect(dialog).toBeVisible();

    const style = await dialog.evaluate((node) => {
      const computed = getComputedStyle(node);
      return { width: computed.width, left: computed.left, height: computed.height };
    });
    // The caller's width won; the template's left-edge placement and full height survived the
    // merge, which is the whole point of merging rather than replacing.
    expect(style.width).toBe('240px');
    expect(style.left).toBe('0px');
    expect(style.height).not.toBe('240px');
  });
});

test.describe('the accessible name', () => {
  test('`ariaLabel` names the dialog for assistive technology', async ({ mount, page }) => {
    await mount(<AccessibleNameHarness />);
    await page.getByRole('button', { name: 'Open Labelled' }).click();

    // By role and name — the query a screen reader user's experience is made of.
    await expect(page.getByRole('dialog', { name: 'Session settings' })).toBeVisible();
  });

  test('`ariaLabelledBy` / `ariaDescribedBy` point at the content, and `role` can interrupt', async ({
    mount,
    page,
  }) => {
    await mount(<AccessibleNameHarness />);
    await page.getByRole('button', { name: 'Open Described' }).click();

    const dialog = page.getByRole('alertdialog', { name: 'Delete workspace' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-describedby', 'a11y-body');
  });

  test('a dialog given no name has none — the library never invents one', async ({
    mount,
    page,
  }) => {
    await mount(<AccessibleNameHarness />);
    await page.getByRole('button', { name: 'Open Anonymous' }).click();

    const dialog = page.locator('dialog[data-modal-id="a11y-anonymous"]');
    await expect(dialog).toBeVisible();
    // Absent, not empty: `aria-label=""` would hide the omission from an audit.
    await expect(dialog).not.toHaveAttribute('aria-label', /.*/);
    await expect(dialog).not.toHaveAttribute('role', /.*/);
  });
});

test.describe('prepare is told when the modal goes away', () => {
  test('closing aborts the work it started', async ({ mount, page }) => {
    const component = await mount(<OnOpenAbortHarness />);
    await component.getByRole('button', { name: 'Open' }).click();
    await expect(component.getByTestId('outcome')).toHaveText('loading');

    await page.keyboard.press('Escape');

    // The promise only ever settles through the signal, so this text is the abort firing and
    // nothing else. Without it the request would outlive the dialog that asked for it.
    await expect(component.getByTestId('outcome')).toHaveText('aborted');
  });

  test('a reopen gets its own signal, and the first abort does not carry over', async ({
    mount,
    page,
  }) => {
    const component = await mount(<OnOpenAbortHarness />);

    await component.getByRole('button', { name: 'Open' }).click();
    await page.keyboard.press('Escape');
    await expect(component.getByTestId('aborts')).toHaveText('1');

    await component.getByRole('button', { name: 'Open' }).click();
    // Loading again rather than still 'aborted': the second open is not holding the first
    // controller, which is what would make a reopened dialog abort itself instantly.
    await expect(component.getByTestId('outcome')).toHaveText('loading');

    await page.keyboard.press('Escape');
    await expect(component.getByTestId('aborts')).toHaveText('2');
  });
});

test.describe('modals working together', () => {
  const openAllThree = async (page: Page) => {
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await page.getByTestId('panel-open-middle').click();
    await page.getByTestId('mid-open-message').click();
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle,message');
  };

  test('the dismiss key unwinds the stack one modal per press, front to back', async ({
    mount,
    page,
  }) => {
    await mount(<StackedModalsHarness />);
    await openAllThree(page);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stack-visible')).toHaveText('panel');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stack-visible')).toHaveText('');

    await expect(page.getByTestId('stack-log')).toHaveText(
      'message:dismiss | middle:dismiss | panel:dismiss'
    );
  });

  test('a hotkey fires on the modal in front, and only there', async ({ mount, page }) => {
    // All three declare Enter. The message modal is in front, so its action is the only one
    // that may run — the modals underneath hold the same key for their own meaning.
    await mount(<StackedModalsHarness />);
    await openAllThree(page);

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('stack-acks')).toHaveText('1');
    await expect(page.getByTestId('stack-saves')).toHaveText('0');
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle');
  });

  test('the modal underneath keeps its own hotkey once it is back in front', async ({
    mount,
    page,
  }) => {
    await mount(<StackedModalsHarness />);
    await openAllThree(page);

    await page.keyboard.press('Enter'); // acknowledges the message modal
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle');

    await page.keyboard.press('Enter'); // now the middle modal is in front
    await expect(page.getByTestId('stack-saves')).toHaveText('1');
    await expect(page.getByTestId('stack-visible')).toHaveText('panel');
  });
});

test.describe('a hotkey belongs to the dialog that declared it', () => {
  test('an outer modal never dispatches through a nested dialog\u2019s button', async ({
    mount,
    page,
  }) => {
    // The nested panel's button carries the same `aria-keyshortcuts` and comes first in
    // document order, so an unscoped lookup finds it and runs the wrong action.
    await mount(<NestedHotkeyScopeHarness />);
    await page.getByRole('button', { name: 'Open Outer' }).click();
    await page.getByTestId('nested-open-inner').click();
    await expect(page.getByTestId('nested-inner-btn')).toBeVisible();

    // Focus back in the outer modal — legitimate here, a non-modal panel blocks nothing.
    await page.getByTestId('nested-outer-btn').focus();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('nested-fired')).toHaveText('outer');
  });
});

test.describe('the mouse across a stack', () => {
  test('a non-modal stands down while a modal is above it, and takes over once it is not', async ({
    mount,
    page,
  }) => {
    await mount(<StackedModalsHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await page.getByTestId('panel-open-middle').click();
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle');

    // A click in the corner lands on the modal's backdrop. The panel dismisses on click-outside
    // and nothing blocks the pointer for it — it has to stand down because it is not in front.
    await page.mouse.click(20, 20);
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stack-visible')).toHaveText('panel');

    // Now it is in front, so the same click is its to act on.
    await page.mouse.click(20, 20);
    await expect(page.getByTestId('stack-visible')).toHaveText('');
    await expect(page.getByTestId('stack-log')).toHaveText('middle:dismiss | panel:dismiss');
  });

  test('a click on an action button reaches only the modal it belongs to', async ({
    mount,
    page,
  }) => {
    await mount(<StackedModalsHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await page.getByTestId('panel-open-middle').click();
    await page.getByTestId('mid-open-message').click();
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle,message');

    await page.getByTestId('msg-ack').click();
    await expect(page.getByTestId('stack-acks')).toHaveText('1');
    await expect(page.getByTestId('stack-saves')).toHaveText('0');
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle');
  });
});

test.describe('the stack and the no-focus Escape path', () => {
  test('one press still unwinds one modal when focus is outside the dialogs', async ({
    mount,
    page,
  }) => {
    // Focus outside an open modal is ordinary — `showModal()` has nowhere to put it when nothing
    // in the content is focusable, and content that swaps after opening drops whatever held it.
    // The keydown listener never hears that press; the browser's own `cancel` does, and it fires
    // on the dialog. Nothing above suppresses it, so this is the one path where a nested stack
    // could still collapse in a single press.
    await mount(<StackedModalsHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await page.getByTestId('panel-open-middle').click();
    await page.getByTestId('mid-open-message').click();
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle,message');

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stack-visible')).toHaveText('panel,middle');
  });
});

test.describe('focus while another modal is in front', () => {
  test('a settling action does not pull focus out of the modal above it', async ({
    mount,
    page,
  }) => {
    await mount(<FocusUnderAnotherModalHarness />);
    await page.getByRole('button', { name: 'Open Underneath' }).click();

    // Start the slow save, then open the second modal over it while it is still in flight.
    await page.getByTestId('under-save').click();
    await page.getByTestId('under-open-child').click();
    await page.getByTestId('over-field').focus();
    await expect(page.getByTestId('over-field')).toBeFocused();

    // The save lands. The modal underneath restores focus when its action settles — but the
    // user is in the modal in front, and that is not its focus to move.
    await expect(page.getByTestId('under-done')).toHaveText('1');
    await expect(page.getByTestId('over-field')).toBeFocused();
  });
});

test.describe('a contained dialog covers its host rather than displacing it', () => {
  test('content already in the host stays where it was when the dialog opens', async ({
    mount,
    page,
  }) => {
    // The failure this guards: the host the library renders is a `height: 100%` block, so in
    // normal flow it is laid out *after* the content it was meant to cover — pushing that
    // content out of a fixed-height, clipped region the moment the dialog opens. A detail pane
    // sliding over a list is the ordinary use of contained placement, and it must not require
    // the caller to discover that their list has to leave the flow.
    await mount(<ContainedOverlayHarness />);
    const rowBefore = await page.getByTestId('overlay-row').boundingBox();

    await page.getByRole('button', { name: 'Open Contained' }).click();
    await expect(page.getByTestId('overlay-is-visible')).toHaveText('open');
    await page.waitForTimeout(300);

    const rowAfter = await page.getByTestId('overlay-row').boundingBox();
    expect(rowAfter?.y, 'the row moved when the dialog opened').toBeCloseTo(rowBefore?.y ?? -1, 0);
    await expect(page.getByTestId('overlay-row')).toBeVisible();
  });
});
