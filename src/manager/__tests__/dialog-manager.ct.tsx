import { expect, test } from '@playwright/experimental-ct-react';
import {
  BlockingHarness,
  BlockingLookupHarness,
  DomEventHarness,
  EventSubscribeHarness,
  ImperativeHarness,
  LookupCollectionHarness,
  LookupFindHarness,
  LookupForegroundHarness,
  LookupUnregisteredHarness,
  MultiModalHarness,
  NoProviderHarness,
  ProviderIsolationHarness,
  ScrollLockHarness,
  ScrollLockTwoManagersHarness,
  UnregisteredNoOpHarness,
} from './dialog-manager.story';

test.describe('dialogManager', () => {
  test('open() opens a registered modal', async ({ mount, page }) => {
    await mount(<ImperativeHarness />);
    await expect(page.getByTestId('has-open')).toHaveText('no');
    await page.getByRole('button', { name: 'Open via Manager' }).click();
    await expect(page.getByTestId('modal-dm-imperative')).toBeVisible();
    await expect(page.getByTestId('has-open')).toHaveText('yes');
  });

  test('close() closes an open modal with controller reason', async ({ mount, page }) => {
    await mount(<ImperativeHarness />);
    await page.getByRole('button', { name: 'Open via Manager' }).click();
    await expect(page.getByTestId('modal-dm-imperative')).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByTestId('has-open')).toHaveText('no');
    await expect(page.getByTestId('last-reason')).toHaveText('close');
  });

  test('close() with explicit reason records the given reason', async ({ mount, page }) => {
    await mount(<ImperativeHarness />);
    await page.getByRole('button', { name: 'Open via Manager' }).click();
    await page.getByRole('button', { name: 'Force Close via Manager' }).click();
    await expect(page.getByTestId('has-open')).toHaveText('no');
    await expect(page.getByTestId('last-reason')).toHaveText('forced');
  });

  test('hasAnyOpen updates reactively via useDialogManager', async ({ mount, page }) => {
    await mount(<ImperativeHarness />);
    await expect(page.getByTestId('has-open')).toHaveText('no');
    await page.getByRole('button', { name: 'Open via Manager' }).click();
    await expect(page.getByTestId('has-open')).toHaveText('yes');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByTestId('has-open')).toHaveText('no');
  });

  test('modal can be opened and closed multiple times imperatively', async ({ mount, page }) => {
    await mount(<ImperativeHarness />);
    await page.getByRole('button', { name: 'Open via Manager' }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByTestId('has-open')).toHaveText('no');

    await page.getByRole('button', { name: 'Open via Manager' }).click();
    await page.getByRole('button', { name: 'Force Close via Manager' }).click();
    await expect(page.getByTestId('has-open')).toHaveText('no');
    await expect(page.getByTestId('last-reason')).toHaveText('forced');
  });

  test('subscribe receives open then close events in order', async ({ mount, page }) => {
    await mount(<EventSubscribeHarness />);
    await expect(page.getByTestId('events')).toHaveText('');
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('events')).toHaveText('open:dm-events,close:dm-events');
  });

  test('subscribe receives correct close reason in event', async ({ mount, page }) => {
    await mount(<EventSubscribeHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('events')).toContainText('close:dm-events');
  });

  test('openCount and foreground update as modals open and close', async ({ mount, page }) => {
    await mount(<MultiModalHarness />);
    await expect(page.getByTestId('dialog-count')).toHaveText('0');
    await expect(page.getByTestId('top-dialog')).toHaveText('');

    // Open first modal via button outside
    await page.getByRole('button', { name: 'Open First' }).click();
    await expect(page.getByTestId('dialog-count')).toHaveText('1');
    await expect(page.getByTestId('top-dialog')).toHaveText('dm-first');

    // Open second modal from inside first modal
    await page.getByRole('button', { name: 'Open Second' }).click();
    await expect(page.getByTestId('dialog-count')).toHaveText('2');
    await expect(page.getByTestId('top-dialog')).toHaveText('dm-second');

    // Close second (topmost) modal from inside it
    await page.getByRole('button', { name: 'Close Second' }).click();
    await expect(page.getByTestId('dialog-count')).toHaveText('1');
    await expect(page.getByTestId('top-dialog')).toHaveText('dm-first');

    // Close first modal — now accessible since second is gone
    await page.getByRole('button', { name: 'Close First' }).click();
    await expect(page.getByTestId('dialog-count')).toHaveText('0');
    await expect(page.getByTestId('top-dialog')).toHaveText('');
  });

  test('stackOrder reflects open order', async ({ mount, page }) => {
    await mount(<MultiModalHarness />);

    await page.getByRole('button', { name: 'Open First' }).click();
    await expect(page.getByTestId('stack-order')).toHaveText('dm-first');

    await page.getByRole('button', { name: 'Open Second' }).click();
    await expect(page.getByTestId('stack-order')).toHaveText('dm-first,dm-second');

    await page.getByRole('button', { name: 'Close Second' }).click();
    await expect(page.getByTestId('stack-order')).toHaveText('dm-first');

    await page.getByRole('button', { name: 'Close First' }).click();
    await expect(page.getByTestId('stack-order')).toHaveText('');
  });

  test('modal:open fires at start of opening sequence with correct modalType', async ({
    mount,
    page,
  }) => {
    await mount(<DomEventHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('open:dom-ev-modal:modal');
  });

  test('modal:close fires after closing sequence with correct modalType and reason', async ({
    mount,
    page,
  }) => {
    await mount(<DomEventHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await page.getByRole('button', { name: 'Close Modal' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('close:dom-ev-modal:modal:ok');
  });

  test('slide modal dispatches modal:open and modal:close with modalType slide', async ({
    mount,
    page,
  }) => {
    await mount(<DomEventHarness />);
    await page.getByRole('button', { name: 'Open Slide' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('open:dom-ev-slide:slide');
    await page.getByRole('button', { name: 'Close Slide' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('close:dom-ev-slide:slide:ok');
  });

  test('message modal dispatches modal:open and modal:close with modalType message', async ({
    mount,
    page,
  }) => {
    await mount(<DomEventHarness />);
    await page.getByRole('button', { name: 'Open Message' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('open:dom-ev-message:message');
    await page.getByRole('button', { name: 'Close Message' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('close:dom-ev-message:message:ok');
  });

  test('open and close on an unregistered id are silent no-ops', async ({ mount, page }) => {
    await mount(<UnregisteredNoOpHarness />);
    await page.getByRole('button', { name: 'Try Unregistered' }).click();
    await expect(page.getByTestId('error')).toHaveText('');
    await expect(page.locator('dialog')).toHaveCount(0);
  });
});

test.describe('DialogManagerProvider', () => {
  test('modals in separate providers are isolated from each other', async ({ mount, page }) => {
    await mount(<ProviderIsolationHarness />);

    // Both scopes start with zero open dialogs
    await expect(page.getByTestId('count-A')).toHaveText('0');
    await expect(page.getByTestId('count-B')).toHaveText('0');

    // Open modal in scope A — only A sees it
    await page.getByRole('button', { name: 'Open A' }).click();
    await expect(page.getByTestId('count-A')).toHaveText('1');
    await expect(page.getByTestId('has-open-A')).toHaveText('yes');
    await expect(page.getByTestId('count-B')).toHaveText('0');
    await expect(page.getByTestId('has-open-B')).toHaveText('no');

    // Close modal in scope A
    await page.getByRole('button', { name: 'Close A' }).click();
    await expect(page.getByTestId('count-A')).toHaveText('0');
    await expect(page.getByTestId('has-open-A')).toHaveText('no');
    await expect(page.getByTestId('last-reason-A')).toHaveText('confirm');
  });

  test('opening in scope B does not affect scope A', async ({ mount, page }) => {
    await mount(<ProviderIsolationHarness />);

    await page.getByRole('button', { name: 'Open B' }).click();
    await expect(page.getByTestId('count-B')).toHaveText('1');
    await expect(page.getByTestId('has-open-B')).toHaveText('yes');
    await expect(page.getByTestId('count-A')).toHaveText('0');
    await expect(page.getByTestId('has-open-A')).toHaveText('no');
  });

  test('works without a provider (static singleton fallback)', async ({ mount, page }) => {
    await mount(<NoProviderHarness />);
    await expect(page.getByTestId('has-open')).toHaveText('no');

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('has-open')).toHaveText('yes');
    await expect(page.getByTestId('modal-no-provider-modal')).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('has-open')).toHaveText('no');
    await expect(page.getByTestId('last-reason')).toHaveText('done');
  });
});

test.describe('lookup', () => {
  test('lookup(id) returns ModalInfo for closed registered modals', async ({ mount, page }) => {
    await mount(<LookupFindHarness />);

    // Query before opening — both registered, both closed
    await page.getByRole('button', { name: 'Query Closed' }).click();
    await expect(page.getByTestId('result')).toContainText('a-exists:true');
    await expect(page.getByTestId('result')).toContainText('a-open:false');
    await expect(page.getByTestId('result')).toContainText('a-phase:closed');
    await expect(page.getByTestId('result')).toContainText('b-exists:true');
    await expect(page.getByTestId('result')).toContainText('b-open:false');
  });

  test('lookup(id) returns correct state for open modals including unregistered', async ({
    mount,
    page,
  }) => {
    await mount(<LookupFindHarness />);

    // Open A, then query from inside it
    await page.getByRole('button', { name: 'Open A' }).click();
    await page.getByRole('button', { name: 'Query', exact: true }).click();
    await expect(page.getByTestId('result')).toContainText('a-exists:true');
    await expect(page.getByTestId('result')).toContainText('a-open:true');
    await expect(page.getByTestId('result')).toContainText('a-fg:true');
    await expect(page.getByTestId('result')).toContainText('a-type:modal');
    await expect(page.getByTestId('result')).toContainText('b-exists:true');
    await expect(page.getByTestId('result')).toContainText('b-open:false');
    await expect(page.getByTestId('result')).toContainText('unknown-exists:false');
    await expect(page.getByTestId('result')).toContainText('unknown-open:false');
    await expect(page.getByTestId('result')).toContainText('unknown-phase:closed');
    await expect(page.getByTestId('result')).toContainText('unknown-fg:false');
  });

  test('lookup(id) returns null-object default for unregistered ids', async ({ mount, page }) => {
    await mount(<LookupUnregisteredHarness />);

    await page.getByRole('button', { name: 'Query Unknown' }).click();
    await expect(page.getByTestId('result')).toContainText('exists:false');
    await expect(page.getByTestId('result')).toContainText('open:false');
    await expect(page.getByTestId('result')).toContainText('fg:false');
    await expect(page.getByTestId('result')).toContainText('phase:closed');
    await expect(page.getByTestId('result')).toContainText('id:does-not-exist');
    await expect(page.getByTestId('result')).toContainText('at:0');
  });

  test('lookup().getOpen/getClosed/counts reflect registry state', async ({ mount, page }) => {
    await mount(<LookupCollectionHarness />);

    // Open A, then open B from inside A
    await page.getByRole('button', { name: 'Open A' }).click();
    await page.getByRole('button', { name: 'Open B' }).click();

    // B is topmost — close B to access A's Query button
    await page.getByRole('button', { name: 'Close B' }).click();

    // Now only A is open. Query stats: 3 registered, 1 open (A), 2 closed (B, C)
    await page.getByRole('button', { name: 'Query' }).click();
    await expect(page.getByTestId('stats')).toHaveText('count:3|open:1:col-a|closed:2:col-b,col-c');
  });

  test('lookup().getForeground and isForeground track the topmost modal', async ({
    mount,
    page,
  }) => {
    await mount(<LookupForegroundHarness />);

    // Open A
    await page.getByRole('button', { name: 'Open A' }).click();

    // Check from A — A is foreground
    await page.getByRole('button', { name: 'Check FG from A' }).click();
    await expect(page.getByTestId('foreground-id')).toHaveText('fg-a');
    await expect(page.getByTestId('is-fg-a')).toHaveText('true');
    await expect(page.getByTestId('is-fg-b')).toHaveText('false');

    // Open B from inside A
    await page.getByRole('button', { name: 'Open B' }).click();

    // Check from B — B is now foreground
    await page.getByRole('button', { name: 'Check FG from B' }).click();
    await expect(page.getByTestId('foreground-id')).toHaveText('fg-b');
    await expect(page.getByTestId('is-fg-a')).toHaveText('false');
    await expect(page.getByTestId('is-fg-b')).toHaveText('true');

    // Close B — A becomes foreground again
    await page.getByRole('button', { name: 'Close B' }).click();
    await page.getByRole('button', { name: 'Check FG from A' }).click();
    await expect(page.getByTestId('foreground-id')).toHaveText('fg-a');
    await expect(page.getByTestId('is-fg-a')).toHaveText('true');
  });
});

test.describe('blocking / nonBlocking', () => {
  test('blocking snapshot fields update when a blocking modal opens and closes', async ({
    mount,
    page,
  }) => {
    await mount(<BlockingHarness />);
    await expect(page.getByTestId('has-blocking')).toHaveText('no');
    await expect(page.getByTestId('blocking-count')).toHaveText('0');

    await page.getByRole('button', { name: 'Open Blocking' }).click();
    await expect(page.getByTestId('has-blocking')).toHaveText('yes');
    await expect(page.getByTestId('blocking-count')).toHaveText('1');
    await expect(page.getByTestId('has-non-blocking')).toHaveText('no');
    await expect(page.getByTestId('non-blocking-count')).toHaveText('0');

    await page.getByRole('button', { name: 'Close Blocking' }).click();
    await expect(page.getByTestId('has-blocking')).toHaveText('no');
    await expect(page.getByTestId('blocking-count')).toHaveText('0');
  });

  test('nonBlocking snapshot fields update when a nonModal opens and closes', async ({
    mount,
    page,
  }) => {
    await mount(<BlockingHarness />);
    await expect(page.getByTestId('has-non-blocking')).toHaveText('no');

    await page.getByRole('button', { name: 'Open Non-Blocking' }).click();
    await expect(page.getByTestId('has-non-blocking')).toHaveText('yes');
    await expect(page.getByTestId('non-blocking-count')).toHaveText('1');
    await expect(page.getByTestId('has-blocking')).toHaveText('no');
    await expect(page.getByTestId('blocking-count')).toHaveText('0');
    await expect(page.getByTestId('has-any-open')).toHaveText('yes');
    await expect(page.getByTestId('open-count')).toHaveText('1');

    await page.getByRole('button', { name: 'Close Non-Blocking' }).click();
    await expect(page.getByTestId('has-non-blocking')).toHaveText('no');
    await expect(page.getByTestId('non-blocking-count')).toHaveText('0');
  });

  test('mixed blocking + nonBlocking modals track independently', async ({ mount, page }) => {
    await mount(<BlockingHarness />);

    // Open non-blocking first (it's clickable behind blocking modal)
    await page.getByRole('button', { name: 'Open Non-Blocking' }).click();
    await expect(page.getByTestId('open-count')).toHaveText('1');
    await expect(page.getByTestId('has-blocking')).toHaveText('no');
    await expect(page.getByTestId('has-non-blocking')).toHaveText('yes');

    // Open blocking modal
    await page.getByRole('button', { name: 'Open Blocking' }).click();
    await expect(page.getByTestId('open-count')).toHaveText('2');
    await expect(page.getByTestId('has-blocking')).toHaveText('yes');
    await expect(page.getByTestId('blocking-count')).toHaveText('1');
    await expect(page.getByTestId('has-non-blocking')).toHaveText('yes');
    await expect(page.getByTestId('non-blocking-count')).toHaveText('1');

    // Close blocking modal — non-blocking still open
    await page.getByRole('button', { name: 'Close Blocking' }).click();
    await expect(page.getByTestId('open-count')).toHaveText('1');
    await expect(page.getByTestId('has-blocking')).toHaveText('no');
    await expect(page.getByTestId('has-non-blocking')).toHaveText('yes');

    // Close non-blocking
    await page.getByRole('button', { name: 'Close Non-Blocking' }).click();
    await expect(page.getByTestId('open-count')).toHaveText('0');
    await expect(page.getByTestId('has-any-open')).toHaveText('no');
  });

  test('lookup blocking/nonBlocking methods return correct results', async ({ mount, page }) => {
    await mount(<BlockingLookupHarness />);

    // Open both
    await page.getByRole('button', { name: 'Open Non-Blocking' }).click();
    await page.getByRole('button', { name: 'Open Blocking' }).click();

    // Query from outside (non-blocking doesn't block clicks)
    await page.getByRole('button', { name: 'Query' }).click();
    await expect(page.getByTestId('lookup-result')).toContainText('blocking:true');
    await expect(page.getByTestId('lookup-result')).toContainText('blockingCount:1');
    await expect(page.getByTestId('lookup-result')).toContainText('blockingIds:bl-modal');
    await expect(page.getByTestId('lookup-result')).toContainText('nonBlocking:true');
    await expect(page.getByTestId('lookup-result')).toContainText('nonBlockingCount:1');
    await expect(page.getByTestId('lookup-result')).toContainText('nonBlockingIds:bl-non-modal');
  });
});

// ── Scroll lock ─────────────────────────────────────────────────────────────
// Regression: the lock was a bare `overflow: hidden`, so removing a classic scrollbar
// widened the viewport and shifted the page (~15px "jump") when a modal opened.
test.describe('dialogManager — scroll lock', () => {
  test('opening a modal locks scrolling without shifting the layout', async ({ mount, page }) => {
    await mount(<ScrollLockHarness />);

    const marker = page.getByTestId('right-marker');
    const before = await marker.boundingBox();
    expect(before).not.toBeNull();

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-scroll-lock-modal')).toBeVisible();

    // Scrolling is locked...
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    // ...and the right-aligned marker has not moved horizontally.
    const during = await marker.boundingBox();
    expect(during).not.toBeNull();
    if (before && during) {
      expect(Math.abs(during.x - before.x)).toBeLessThanOrEqual(1);
    }

    // The compensation equals the scrollbar width that was actually reclaimed.
    const measured = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(
        '--dialog-scrollbar-width'
      );
      return {
        published: Number.parseFloat(raw) || 0,
        bodyPaddingRight: Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0,
      };
    });
    expect(measured.published).toBeGreaterThanOrEqual(0);
    // Headless Chromium may use overlay scrollbars (width 0) — then there is nothing to pad.
    if (measured.published > 0) {
      expect(measured.bodyPaddingRight).toBeGreaterThanOrEqual(measured.published);
    }

    // Closing restores everything, including the body's inline padding.
    await page.getByRole('button', { name: 'Close Modal' }).click();
    await expect(page.locator('body')).not.toHaveAttribute('data-dialog-open', 'true');
    const after = await page.evaluate(() => {
      return {
        inlinePaddingRight: document.body.style.paddingRight,
        varStillSet: document.documentElement.style.getPropertyValue('--dialog-scrollbar-width'),
      };
    });
    expect(after.inlinePaddingRight).toBe('');
    expect(after.varStillSet).toBe('');

    const restored = await marker.boundingBox();
    if (before && restored) {
      expect(Math.abs(restored.x - before.x)).toBeLessThanOrEqual(1);
    }
  });

  test('--dialog-scrollbar-width is consumable by user-land fixed elements', async ({
    mount,
    page,
  }) => {
    await mount(<ScrollLockHarness />);
    const fixedMarker = page.getByTestId('fixed-marker');
    const before = await fixedMarker.boundingBox();

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-scroll-lock-modal')).toBeVisible();

    // The fixed bar pads itself from the published variable, so its content stays put even
    // though the viewport got wider — the library never touched the element itself.
    const during = await fixedMarker.boundingBox();
    if (before && during) {
      expect(Math.abs(during.x - before.x)).toBeLessThanOrEqual(1);
    }
  });

  test('a non-modal dialog never locks scrolling', async ({ mount, page }) => {
    await mount(<ScrollLockHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('modal-scroll-lock-non-modal')).toBeVisible();

    await expect(page.locator('body')).not.toHaveAttribute('data-dialog-open', 'true');
    expect(
      await page.evaluate(() => {
        return document.body.style.paddingRight;
      })
    ).toBe('');
  });

  test('stacked modals do not double-compensate, and the lock survives until the last closes', async ({
    mount,
    page,
  }) => {
    await mount(<ScrollLockHarness />);

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('modal-scroll-lock-modal')).toBeVisible();
    const single = await page.evaluate(() => {
      return document.body.style.paddingRight;
    });

    // A second blocking modal on top must not add padding again. Opened from *inside* the
    // first modal — the top-layer backdrop blocks controls outside the dialog.
    await page.getByRole('button', { name: 'Stack Second Modal' }).click();
    await expect(page.getByTestId('modal-scroll-lock-modal-2')).toBeVisible();
    expect(
      await page.evaluate(() => {
        return document.body.style.paddingRight;
      })
    ).toBe(single);
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    // Closing the top modal leaves the first one open — still locked.
    await page.getByRole('button', { name: 'Close Second' }).click();
    await expect(page.getByTestId('modal-scroll-lock-modal-2')).not.toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    await page.getByRole('button', { name: 'Close Modal' }).click();
    await expect(page.locator('body')).not.toHaveAttribute('data-dialog-open', 'true');
  });

  test('a second manager does not release a lock it never took', async ({ mount, page }) => {
    await mount(<ScrollLockTwoManagersHarness />);

    await page.getByRole('button', { name: 'Open Blocking' }).click();
    await expect(page.getByTestId('modal-two-managers-blocking')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    // Registry churn in the *nested* manager — which has nothing open and so never locked.
    await page.getByRole('button', { name: 'Unmount Bystander' }).click();

    // The blocking modal is still open, so the lock must still be held.
    await expect(page.getByTestId('modal-two-managers-blocking')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');
  });
});
