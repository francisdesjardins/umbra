import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import {
  ActionErrorHotkeyRetryHarness,
  BackdropHitTestHarness,
  BusyWhilePreparingHarness,
  EscAnsweredByNobodyHarness,
  ReconcileOpenHarness,
  RestoreNotInFrontHarness,
  EscWithoutFocusHarness,
  KeyPassthroughHarness,
  TransitionToggleHarness,
  BasicHarness,
  PrepareFailureHarness,
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
  PortalHostHarness,
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
  DanglingLabelHarness,
  LateTitleHarness,
  OutletLabelHarness,
  VolatileKeyDownHarness,
  ShadowRootHarness,
  RenderPhaseHarness,
} from './use-dialog.story';

test.describe('useDialog', () => {
  test('modal is initially closed', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('dialog-basic-modal')).not.toBeVisible();
  });

  test('opens when open() is called', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-basic-modal')).toBeVisible();
    await expect(page.getByTestId('dialog-basic-modal')).toContainText('Modal content');
  });

  test('closes with reason "confirm" via controller', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dialog-basic-modal')).toBeVisible();
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
    await expect(page.getByTestId('dialog-basic-modal')).toBeVisible();
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
    await expect(page.getByTestId('dialog-reopen-modal')).toBeVisible();
    await expect(page.getByTestId('settle-count')).toHaveText('1');
    await page.getByRole('button', { name: 'Reopen' }).click();
    await expect(page.getByTestId('settle-count')).toHaveText('2');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByTestId('dialog-reopen-modal')).not.toBeVisible();
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
    // Dismissed before `prepare` settles: a resolver registered after the open waits forever.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('outcome')).toHaveText('settled:dismiss');
  });

  test('can be opened and closed multiple times', async ({ mount, page }) => {
    await mount(<BasicHarness />);

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dialog-basic-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dialog-basic-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });
});

test.describe('useDialog — data-dialog-type', () => {
  test('modal dialog has data-dialog-type="modal"', async ({ mount, page }) => {
    await mount(<BasicHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dialog-basic-modal')).toHaveAttribute(
      'data-dialog-type',
      'modal'
    );
  });

  test('non-modal dialog has data-dialog-type="non-modal"', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('dialog-non-modal-dialog')).toHaveAttribute(
      'data-dialog-type',
      'non-modal'
    );
  });
});

test.describe('useDialog — nonModal', () => {
  test('opens with dialog.show() (not in top-layer)', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-non-modal-dialog')).toBeVisible();
  });

  test('sets data-dialog-z attribute on the dialog element', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    const dialog = page.getByTestId('dialog-non-modal-dialog');
    await expect(dialog).toBeVisible();
    const zAttr = await dialog.getAttribute('data-dialog-z');
    expect(zAttr).toBeTruthy();
    expect(Number(zAttr)).toBeGreaterThanOrEqual(1300);
  });

  test('sets z-index style on the dialog element', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    const dialog = page.getByTestId('dialog-non-modal-dialog');
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

    await page.getByTestId('outside-button').click();
    await expect(page.getByTestId('open-count')).toHaveText('1');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });

  test('ESC key still closes when dialog has focus', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('dialog-non-modal-dialog')).toBeVisible();

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
    await expect(page.getByTestId('dialog-non-modal-first')).toBeVisible();

    await page.getByRole('button', { name: 'Open Second' }).click();
    await expect(page.getByTestId('dialog-non-modal-second')).toBeVisible();

    const firstZ = Number(
      await page.getByTestId('dialog-non-modal-first').getAttribute('data-dialog-z')
    );
    const secondZ = Number(
      await page.getByTestId('dialog-non-modal-second').getAttribute('data-dialog-z')
    );
    expect(secondZ).toBeGreaterThan(firstZ);

    await expect(page.getByTestId('body-overflow')).toHaveText('free');
  });

  test('closes via controller button', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('dialog-non-modal-dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('ESC closes non-modal when focus is outside the dialog', async ({ mount, page }) => {
    await mount(<NonModalHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('dialog-non-modal-dialog')).toBeVisible();

    await page.getByTestId('outside-button').focus();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('ESC on non-modal does not propagate to underlying elements', async ({ mount, page }) => {
    await mount(<NonModalEscIsolationHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('dialog-esc-isolation-panel')).toBeVisible();

    await page.getByTestId('outside-button').focus();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
    // The press must not reach the document bubble listener.
    await expect(page.getByTestId('leak-count')).toHaveText('0');
  });

  test('ESC closes only the topmost non-modal in a stack', async ({ mount, page }) => {
    await mount(<NonModalStackHarness />);
    await page.getByRole('button', { name: 'Open First' }).click();
    await expect(page.getByTestId('dialog-non-modal-first')).toBeVisible();

    await page.getByRole('button', { name: 'Open Second' }).click();
    await expect(page.getByTestId('dialog-non-modal-second')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dialog-non-modal-second')).not.toBeVisible();
    await expect(page.getByTestId('dialog-non-modal-first')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dialog-non-modal-first')).not.toBeVisible();
  });
});

test.describe('useDialog — dismissKey', () => {
  test('custom dismissKey closes on that key, Escape does not', async ({ mount, page }) => {
    await mount(<CustomDismissKeyHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('open');

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

    await page.getByTestId('outside-button').focus();
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
    // The press must not reach the document bubble listener.
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

test.describe('useDialog — portal', () => {
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

  test('a portal host of the caller’s own is where the dialog lands', async ({ mount, page }) => {
    // `portal: true` is `document.body`, which is the wrong answer wherever the tree the dialog
    // left was doing something — here, declaring the custom property the dialog reads.
    await mount(<PortalHostHarness />);
    await page.getByRole('button', { name: 'Open' }).click();

    const parent = await page.getByTestId('dialog-portal-host').evaluate((node) => {
      return node.parentElement?.dataset['testid'] ?? 'none';
    });

    expect(parent).toBe('themed-host');
    await expect(page.getByTestId('inherited-ink')).toHaveText('rebeccapurple');
  });

  test('modal without portal: full lifecycle works', async ({ mount, page }) => {
    await mount(<PortalDefaultHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dialog-portal-default')).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('done');
  });

  test('non-modal without portal: full lifecycle works', async ({ mount, page }) => {
    await mount(<PortalNonModalDefaultHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('dialog-portal-non-modal-default')).toBeVisible();
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
    await expect(page.getByTestId('dialog-portal-non-modal-default')).toBeVisible();

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

    // A remount into a new structure must close, not leave a stuck dialog blocking the page.
    await page.getByTestId('toggle-portal').click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
    await expect(page.getByTestId('dialog-structural-toggle')).toHaveCount(1);
    await expect(page.getByTestId('dialog-structural-toggle')).not.toBeVisible();

    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-structural-toggle')).toBeVisible();
  });
});

test.describe('useDialog — dismissWhilePreparing', () => {
  test('dismissWhilePreparing: false — ESC during prepare does not close', async ({
    mount,
    page,
  }) => {
    await mount(<DismissWhilePreparingDisabledHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('loading-state')).toHaveText('loading');

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

    await page.getByTestId('resolve-loading').click();
    await expect(page.getByTestId('loading-state')).toHaveText('ready');

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

    await page.getByRole('button', { name: 'Confirm' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });
});

test.describe('useDialog — dismissOnClickOutside', () => {
  test('click outside closes non-modal with reason "dismiss"', async ({ mount, page }) => {
    await mount(<NonModalClickOutsideHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    await page.getByTestId('outside-button').click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('dismiss');
  });

  test('click inside dialog does not close it', async ({ mount, page }) => {
    await mount(<NonModalClickOutsideHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

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

    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');
  });
});

test.describe('useDialog — returned identities', () => {
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

test.describe('useDialog — backdrop click hit testing', () => {
  test('a keyboard-activated button does not dismiss the modal (its click reports clientX/Y of 0)', async ({
    mount,
    page,
  }) => {
    await mount(<BackdropHitTestHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    // Enter dispatches a click at (0, 0), outside the dialog's rect; only the target check saves it.
    await page.getByTestId('content-button').focus();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('activated')).toHaveText('yes');

    // `is-visible` is `phase !== 'closed'`, so settle past the exit or a dismissal under way passes.
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
    // The answer decides whether the close finalizes at once or on `transitionend`; cached per
    // element, transitions switched off between opens leave it on the safety timeout, which warns.
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
    // Claiming the key and then declining to close is a dead keyboard: gone, and nothing happened.
    await mount(<KeyPassthroughHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await expect(page.getByTestId('panel-preparing')).toHaveText('preparing');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dialog-key-passthrough')).toBeVisible();
    await expect(page.getByTestId('app-escapes')).toHaveText('1');
  });

  test('a dismiss key the panel acts on is consumed', async ({ mount, page }) => {
    await mount(<KeyPassthroughHarness />);
    await page.getByRole('button', { name: 'Open Panel' }).click();
    await page.getByRole('button', { name: 'Finish Preparing' }).click();
    await expect(page.getByTestId('panel-preparing')).toHaveText('ready');

    // Now the panel does dismiss, so the app must not see the key that dismissed it.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dialog-key-passthrough')).not.toBeVisible();
    await expect(page.getByTestId('app-escapes')).toHaveText('0');
  });
});

test.describe('ESC does not depend on where focus is', () => {
  test('closes a modal whose content holds nothing focusable', async ({ mount, page }) => {
    await mount(<EscWithoutFocusHarness />);
    await page.getByRole('button', { name: 'Open Unfocusable' }).click();
    await expect(page.getByTestId('unfocusable-is-visible')).toHaveText('open');

    // Focus outside is ordinary: nothing focusable in the content, or content that swapped after open.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    expect(
      await page.evaluate(() => {
        const dialog = document.querySelector('[data-testid="dialog-esc-no-focus"]');
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
    // A native cancel behind the store's back leaves the element rendering out of the top layer.
    await mount(<EscWithoutFocusHarness />);
    await page.getByRole('button', { name: 'Open Unfocusable' }).click();
    await expect(page.getByTestId('unfocusable-is-visible')).toHaveText('open');
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    const desynced = await page.evaluate(() => {
      const dialog = document.querySelector('[data-testid="dialog-esc-no-focus"]');
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
    // The autofocus target goes `disabled` mid-action, so a same-tick restore silently no-ops.
    await mount(<ActionErrorHotkeyRetryHarness />);
    await page.getByRole('button', { name: 'Open Retry' }).click();
    await expect(page.getByTestId('retry-is-visible')).toHaveText('open');

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('retry-error')).toHaveText('Save failed');
    await expect(page.getByTestId('retry-attempts')).toHaveText('1');

    // Polled: the restore is deferred a frame (that delay *is* the fix); reading once flaked.
    await expect
      .poll(() => {
        return page.evaluate(() => {
          const dialog = document.querySelector('[data-testid="dialog-action-error-retry"]');
          return dialog?.contains(document.activeElement) ?? false;
        });
      }, 'focus was left outside the dialog after the action failed')
      .toBe(true);

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('retry-attempts')).toHaveText('2');
  });

  test('an option changing identity mid-action does not cost the restore', async ({
    mount,
    page,
  }) => {
    // **The gate on the director's granularity** (`core/modal-director.ts`): the focus step's
    // attachment remembers a running action, and a director keyed on every step's inputs would
    // rebuild it here — `onKeyDown` being an inline arrow and an action starting a render.
    await mount(<VolatileKeyDownHarness />);
    await page.getByRole('button', { name: 'Open Volatile' }).click();
    await expect(page.getByTestId('volatile-is-visible')).toHaveText('open');

    const save = page.getByTestId('volatile-save');
    await expect(save).toBeFocused();
    await save.click();
    // Its completion, not its busy state: a 20 ms action can settle between two polls.
    await expect(page.getByTestId('volatile-settled')).toHaveText('1');
    // …and it re-rendered while it ran, which is what hands `useDialog` a new `onKeyDown`.
    await expect(page.getByTestId('volatile-renders')).toHaveText('1');

    // **On the button, not merely inside**: the broken variant leaves focus on the `<dialog>`.
    await expect
      .poll(() => {
        return page.evaluate(() => {
          return document.activeElement?.getAttribute('data-testid') ?? null;
        });
      }, 'focus did not return to the button that ran the action')
      .toBe('volatile-save');
  });
});

test.describe('the styling surface', () => {
  test('`data-dialog-id` and `data-dialog-type` are the hooks CSS reaches a dialog by', async ({
    mount,
    page,
  }) => {
    await mount(<StylingSurfaceHarness />);
    await page.getByRole('button', { name: 'Open Sized' }).click();

    // One selector, by the id its author gave it — no test id, no class, no knowledge of the tree.
    await expect(page.locator('dialog[data-dialog-id="styling-surface"]')).toBeVisible();
    await expect(page.locator('dialog[data-dialog-id="styling-surface"]')).toHaveAttribute(
      'data-dialog-type',
      'modal'
    );
    // The variant attribute pairs with it: `dialog[data-dialog-type='non-modal']` reaches all at once.
    await expect(page.locator('dialog[data-dialog-id="styling-surface-slide"]')).toHaveCount(1);
  });

  test('`--dialog-backdrop` overrides the library backdrop without out-specifying it', async ({
    mount,
    page,
  }) => {
    await mount(<StylingSurfaceHarness />);
    await page.getByRole('button', { name: 'Open Sized' }).click();

    const backdrop = await page
      .locator('dialog[data-dialog-id="styling-surface"]')
      .evaluate((node) => {
        return getComputedStyle(node, '::backdrop').backgroundColor;
      });
    expect(backdrop).toBe('rgb(0, 128, 0)');
  });

  test('`style` sizes the dialog box, which the library never does', async ({ mount, page }) => {
    await mount(<StylingSurfaceHarness />);
    await page.getByRole('button', { name: 'Open Sized' }).click();

    // Computed, not measured: a bounding box mid-entrance reports the animated transform.
    const size = await page.locator('dialog[data-dialog-id="styling-surface"]').evaluate((node) => {
      const style = getComputedStyle(node);
      return { width: style.width, height: style.height };
    });
    expect(size).toEqual({ width: '200px', height: '120px' });
  });

  test('a template keeps its placement while the caller sets the size', async ({ mount, page }) => {
    await mount(<StylingSurfaceHarness />);
    await page.getByRole('button', { name: 'Open Drawer' }).click();

    const dialog = page.locator('dialog[data-dialog-id="styling-surface-slide"]');
    await expect(dialog).toBeVisible();

    const style = await dialog.evaluate((node) => {
      const computed = getComputedStyle(node);
      return { width: computed.width, left: computed.left, height: computed.height };
    });
    // The caller's width won, the template's left edge and full height survived: merged, not replaced.
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

    const dialog = page.locator('dialog[data-dialog-id="a11y-anonymous"]');
    await expect(dialog).toBeVisible();
    // Absent, not empty: `aria-label=""` would hide the omission from an audit.
    await expect(dialog).not.toHaveAttribute('aria-label', /.*/);
    await expect(dialog).not.toHaveAttribute('role', /.*/);
  });
});

test.describe('aria-busy while prepare runs', () => {
  test('the dialog says it is loading, and stops saying so', async ({ mount, page }) => {
    await mount(<BusyWhilePreparingHarness />);
    await page.getByRole('button', { name: 'Open Slow' }).click();

    const dialog = page.locator('dialog[data-dialog-id="busy-slow"]');
    await expect(dialog).toBeVisible();
    // Alongside `isPreparing`, so this cannot pass on a dialog that never got as far as preparing.
    await expect(page.getByTestId('slow-preparing')).toHaveText('preparing');
    await expect(dialog).toHaveAttribute('aria-busy', 'true');

    await page.getByTestId('release').click();
    await expect(page.getByTestId('slow-preparing')).toHaveText('ready');
    await expect(dialog).toHaveAttribute('aria-busy', 'false');
  });

  test('a modal with no prepare is not busy to begin with', async ({ mount, page }) => {
    // Written, not merely absent, so "never busy" and "busy forever" cannot look the same.
    await mount(<BusyWhilePreparingHarness />);
    await page.getByRole('button', { name: 'Open Instant' }).click();

    const dialog = page.locator('dialog[data-dialog-id="busy-instant"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-busy', 'false');
  });
});

test.describe('prepare is told when the modal goes away', () => {
  test('closing aborts the work it started', async ({ mount, page }) => {
    const component = await mount(<OnOpenAbortHarness />);
    await component.getByRole('button', { name: 'Open' }).click();
    await expect(component.getByTestId('outcome')).toHaveText('loading');

    await page.keyboard.press('Escape');

    // The promise settles only through the signal, so this text is the abort firing and nothing else.
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
    // Loading, not still 'aborted': holding the first controller would abort a reopen instantly.
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
    // All three declare Enter; only the front one may run it.
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
  test('an outer modal never dispatches through a nested dialog’s button', async ({
    mount,
    page,
  }) => {
    // The nested button holds the same `aria-keyshortcuts` and comes first in document order.
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

    // The corner is the modal's backdrop; nothing blocks the pointer for the panel, which dismisses
    // on click-outside — it stands down only because it is not in front.
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
    // With focus outside, only the native `cancel` hears the press — the one unsuppressed path.
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

    await page.getByTestId('under-save').click();
    await page.getByTestId('under-open-child').click();
    await page.getByTestId('over-field').focus();
    await expect(page.getByTestId('over-field')).toBeFocused();

    // The modal underneath restores focus when its action settles, but that is not its focus to move.
    await expect(page.getByTestId('under-done')).toHaveText('1');
    await expect(page.getByTestId('over-field')).toBeFocused();
  });

  test('and the guard is the library’s, not the top layer’s', async ({ mount, page }) => {
    // Two **non-modal** panels: above, inertness makes Chromium no-op the restore's `focus()` so the
    // test passes either way, while WebKit does not. Nothing is inert here, so every engine steals.
    await mount(<RestoreNotInFrontHarness />);
    await page.getByTestId('open-behind').click();

    await page.getByTestId('behind-save').click();
    await page.getByTestId('open-front').click();
    await page.getByTestId('front-field').focus();
    await expect(page.getByTestId('front-field')).toBeFocused();

    await expect(page.getByTestId('settled')).toHaveText('1');
    await expect(page.getByTestId('front-field')).toBeFocused();
  });
});

test.describe('a contained dialog covers its host rather than displacing it', () => {
  test('content already in the host stays where it was when the dialog opens', async ({
    mount,
    page,
  }) => {
    // An in-flow `height: 100%` host is laid out *after* the content it should cover, pushing it out
    // of a clipped region — a detail pane over a list must not force the list out of the flow.
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

/**
 * The runtime diagnostic for a labelling reference that resolves to nothing. Two of the three are
 * dialogs it must stay **quiet** about, and those are the tests that matter: a check that warned on
 * correct code lands its noise on the people who did the work right.
 */
test.describe('the labelling diagnostic', () => {
  /** Every warning the page emitted, as text. */
  const warningsOn = (page: Page) => {
    const lines: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') {
        lines.push(message.text());
      }
    });
    return lines;
  };

  test('reports an `ariaLabelledBy` that points at no element', async ({ mount, page }) => {
    const warnings = warningsOn(page);

    await mount(<DanglingLabelHarness />);
    await page.getByRole('button', { name: 'Open Dangling' }).click();
    await expect(page.locator('dialog[data-dialog-id="labelling-dangling"]')).toBeVisible();
    // The check is deferred a frame; give it one and a margin.
    await page.waitForTimeout(300);

    const labelling = warnings.filter((line) => {
      return line.includes('Dialog labelling');
    });
    expect(labelling).toHaveLength(1);
    expect(labelling[0]).toContain('labelling-dangling-title');
  });

  test('says nothing about a name its `prepare` had not rendered yet', async ({ mount, page }) => {
    // A spinner while it loads is the documented normal case; checking before `prepare` settles
    // would report every one of them as broken.
    const warnings = warningsOn(page);

    await mount(<LateTitleHarness />);
    await page.getByRole('button', { name: 'Open Late' }).click();
    await expect(page.getByTestId('late-pending')).toBeVisible();
    // The window where the reference genuinely resolves to nothing, and must not be read.
    await page.waitForTimeout(300);

    await page.getByTestId('late-release').click();
    await expect(page.locator('#labelling-late-title')).toBeVisible();
    await page.waitForTimeout(300);

    expect(
      warnings.filter((line) => {
        return line.includes('Dialog labelling');
      })
    ).toEqual([]);
  });

  test('says nothing about a dialog rendered through the outlet', async ({ mount, page }) => {
    // The path most likely to lag: `DialogOutlet` registers from an effect, a commit behind the hook
    // that names it. Measured, the phase reaches `'open'` after the outlet rendered.
    const warnings = warningsOn(page);

    await mount(<OutletLabelHarness />);
    await page.getByRole('button', { name: 'Open Outlet' }).click();
    await expect(page.locator('#labelling-outlet-title')).toBeVisible();
    await page.waitForTimeout(300);

    expect(
      warnings.filter((line) => {
        return line.includes('Dialog labelling');
      })
    ).toEqual([]);
  });
});

/**
 * The intersection two well-covered halves leave open: a stack in which **nothing** answers the
 * dismiss key. Its own describe because both halves are already pinned; what is untested is their
 * composition, the class of gap the compatibility matrix exists to surface.
 */
test.describe('useDialog — the dismiss key answered by nobody', () => {
  test('a deaf modal in front leaves the panel behind alone, and the press reaches the page', async ({
    mount,
    page,
  }) => {
    await mount(<EscAnsweredByNobodyHarness />);
    await page.getByTestId('open-panel').click();
    await expect(page.getByTestId('panel-visible')).toHaveText('open');

    // From inside the panel's render, the only place a button stays clickable under a modal.
    await page.getByTestId('open-modal').click();
    await expect(page.getByTestId('dialog-visible')).toHaveText('open');

    await page.keyboard.press('Escape');

    // **Neither closes**: falling through to the panel behind would close what the user cannot see.
    await expect(page.getByTestId('dialog-visible')).toHaveText('open');
    await expect(page.getByTestId('panel-visible')).toHaveText('open');
    await expect(page.getByTestId('panel-reason')).toHaveText('');
    await expect(page.getByTestId('dialog-reason')).toHaveText('');

    // **Still the page's press**: the panel's listener captures, so one it swallowed never lands here.
    await expect(page.getByTestId('presses-seen')).toHaveText('1');

    // `dismissKey: false` turns off the key, not the dialog.
    await page.getByTestId('close-modal').click();
    await expect(page.getByTestId('dialog-visible')).toHaveText('closed');
    await expect(page.getByTestId('dialog-reason')).toHaveText('confirm');

    // Foreground again, so the stand-down lasted the stack rather than sticking.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panel-visible')).toHaveText('closed');
    await expect(page.getByTestId('panel-reason')).toHaveText('dismiss');

    // **Still 1** — the claimed press was stopped at capture and the unclaimed one was not, which
    // is what makes the counter discriminating in both directions.
    await expect(page.getByTestId('presses-seen')).toHaveText('1');
  });
});

/**
 * `reconcileOpen` through the pattern it documents — a controlled `<Panel open={…} />` on a real
 * `<dialog>`, which its unit test over the decision table cannot reach.
 */
test.describe('reconcileOpen — a controlled panel', () => {
  test('the prop drives the dialog, and stays authoritative over an imperative open', async ({
    mount,
    page,
  }) => {
    await mount(<ReconcileOpenHarness />);
    await expect(page.getByTestId('phase')).toHaveText('closed');

    await page.getByTestId('raise-prop').click();
    await expect(page.getByTestId('phase')).toHaveText('open');
    await expect(page.getByTestId('open-count')).toHaveText('1');

    await page.getByTestId('lower-prop').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');

    // Opened by id with the prop still false: the reconciliation has to put it back, or the call
    // site believes a dialog on screen is closed and has no way to close it.
    await page.getByTestId('open-behind-its-back').click();
    await expect(page.getByTestId('prop')).toHaveText('false');
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('reconciliations')).toContainText('close');
  });

  test('a dismissal from inside settles once, and does not reopen', async ({ mount, page }) => {
    await mount(<ReconcileOpenHarness />);
    await page.getByTestId('raise-prop').click();
    await expect(page.getByTestId('phase')).toHaveText('open');
    await expect(page.getByTestId('open-count')).toHaveText('1');

    // `onClose` lowers the prop and the reconciliation runs across the exit — the window where
    // `isVisible` and `phase` disagree.
    await page.getByTestId('close-from-inside').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');
    await expect(page.getByTestId('prop')).toHaveText('false');

    // **Still 1.** Reading `isVisible` would see "prop false, dialog open" across the 120 ms exit
    // and close a dialog already leaving; racing the other way would re-open it.
    await expect(page.getByTestId('open-count')).toHaveText('1');

    // Still usable, which a stuck reconciliation would not be.
    await page.getByTestId('raise-prop').click();
    await expect(page.getByTestId('phase')).toHaveText('open');
    await expect(page.getByTestId('open-count')).toHaveText('2');
  });

  test('lowering the prop during the exit asks for nothing, which is what deciding on phase buys', async ({
    mount,
    page,
  }) => {
    await mount(<ReconcileOpenHarness />);
    await page.getByTestId('raise-prop').click();
    await expect(page.getByTestId('phase')).toHaveText('open');
    await expect(page.getByTestId('reconciliations')).toHaveText('open');

    // Both in one handler, the only way into the window where `phase` is `'closing'` and
    // `isVisible` is still true: `onClose` runs when the exit finishes.
    await page.getByTestId('close-and-lower').click();
    await expect(page.getByTestId('phase')).toHaveText('closed');

    // **Still just the one `open`.** Deciding on `isVisible` would ask for a second `close` across
    // those 120 ms (the cut animation); `'closing'` is neither, so `phase` answers `'none'`.
    await expect(page.getByTestId('reconciliations')).toHaveText('open');
    await expect(page.getByTestId('open-count')).toHaveText('1');
  });
});

test.describe('a dialog inside a shadow root', () => {
  test('gets the library backdrop and its opening focus', async ({ mount, page }) => {
    // A shadow boundary blocks `adoptedStyleSheets` (UA backdrop) and makes `document.activeElement`
    // answer with the *host* (focus reads as gone); the core asks `getRootNode()` for both.
    await mount(<ShadowRootHarness />);
    await page.getByTestId('open').click();
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    const measured = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="shadow-host"]')?.shadowRoot;
      const dialog = root?.querySelector('dialog');
      return {
        found: dialog !== null && dialog !== undefined,
        inTopLayer: dialog?.matches(':modal') ?? false,
        backdrop: dialog ? getComputedStyle(dialog, '::backdrop').backgroundColor : null,
        focused: root?.activeElement?.id ?? null,
      };
    });

    expect(measured.found, 'the dialog was not portaled into the shadow root').toBe(true);
    expect(measured.inTopLayer).toBe(true);
    // The library's own sheet, adopted into *this* root. The UA default measures rgba(0, 0, 0, 0.1).
    expect(measured.backdrop).toBe('rgba(0, 0, 0, 0.7)');
    expect(measured.focused).toBe('shadow-confirm');
  });
});

/**
 * `onError` — a caller's callback that threw, reported while everything else carries on. Each
 * assertion pair is "the failure was reported" **and** "the modal settled anyway"; the first alone
 * would pass on a dialog left stuck announcing itself busy.
 */
test.describe('onError', () => {
  test('a prepare that throws is reported, and the modal still settles', async ({
    mount,
    page,
  }) => {
    const component = await mount(<PrepareFailureHarness />);
    await component.getByTestId('pf-open').click();

    await expect(page.locator('dialog[data-dialog-id="prepare-failure"]')).toBeVisible();

    await expect(component.getByTestId('pf-sources')).toHaveText('prepare');
    await expect(component.getByTestId('pf-message')).toHaveText('report is unavailable');

    // Without `onError` the state below is all a caller sees, and it reads as success: a report,
    // not a veto.
    await expect(component.getByTestId('pf-visible')).toHaveText('open');
    await expect(component.getByTestId('pf-preparing')).toHaveText('ready');
    await expect(page.locator('dialog[data-dialog-id="prepare-failure"]')).toHaveAttribute(
      'aria-busy',
      'false'
    );
  });
});

test.describe('the phase a render can see', () => {
  test('phase reaches the render callback, and agrees with the hook return', async ({ mount }) => {
    const component = await mount(<RenderPhaseHarness />);

    await expect(component.getByTestId('hook-phase')).toHaveText('closed');

    await component.getByTestId('open').click();
    await expect(component.getByTestId('render-phase')).toHaveText('open');
    // One answer, not two: the hook return and the render args read the same store.
    await expect(component.getByTestId('hook-phase')).toHaveText('open');
    await expect(component.getByTestId('hook-visible')).toHaveText('visible');

    // The shape a caller writes against `phase`: while an action runs, the two agree.
    await component.getByTestId('publish').click();
    await expect(component.getByTestId('render-busy')).toHaveText('busy');
    await expect(component.getByTestId('render-held')).toHaveText('busy');
    await expect(component.getByTestId('hook-phase')).toHaveText('closed');

    await component.getByTestId('open').click();
    await expect(component.getByTestId('render-busy')).toHaveText('idle');
    await expect(component.getByTestId('render-held')).toHaveText('idle');

    // **The `'closing'` window, which this harness was long thought unable to hold.** It asks for
    // `{ duration: 0, exitDuration: 900 }` — instant in, animated out — and the transition check
    // read only the *entrance* duration at open, filed `0s` as "transitions are disabled" and
    // skipped the exit entirely, so the close finalized with nothing to observe. Read at the phase
    // that owns the question, the window is real and the render callback sees it. That is also the
    // regression test for the configuration itself: an exit animation the caller asked for.
    await component.getByTestId('close-direct').click();
    await expect(component.getByTestId('hook-phase')).toHaveText('closing');
    await expect(component.getByTestId('render-phase')).toHaveText('closing');
    // Still visible while it leaves — the distinction `phase` exists to make.
    await expect(component.getByTestId('hook-visible')).toHaveText('visible');
    await expect(component.getByTestId('hook-phase')).toHaveText('closed');
    await expect(component.getByTestId('hook-visible')).toHaveText('gone');
  });
});
