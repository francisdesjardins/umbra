import { expect, test } from '../../__tests__/ct-coverage.js';
import {
  DialogVariantHarness,
  DialogVariantLookupHarness,
  DomEventHarness,
  EventSubscribeHarness,
  ImperativeHarness,
  LookupCollectionHarness,
  LookupFindHarness,
  LookupForegroundHarness,
  LookupUnregisteredHarness,
  MultiDialogHarness,
  NoProviderHarness,
  ProviderIsolationHarness,
  ScrollLockHarness,
  ScrollLockBothOpenHarness,
  ScrollLockTwoManagersHarness,
  UnregisteredNoOpHarness,
} from './dialog-manager.story';

test.describe('dialogManager', () => {
  test('open() opens a registered modal', async ({ mount, page }) => {
    await mount(<ImperativeHarness />);
    await expect(page.getByTestId('has-open')).toHaveText('no');
    await page.getByRole('button', { name: 'Open via Manager' }).click();
    await expect(page.getByTestId('dialog-dm-imperative')).toBeVisible();
    await expect(page.getByTestId('has-open')).toHaveText('yes');
  });

  test('close() closes an open modal with controller reason', async ({ mount, page }) => {
    await mount(<ImperativeHarness />);
    await page.getByRole('button', { name: 'Open via Manager' }).click();
    await expect(page.getByTestId('dialog-dm-imperative')).toBeVisible();
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
    await mount(<MultiDialogHarness />);
    await expect(page.getByTestId('dialog-count')).toHaveText('0');
    await expect(page.getByTestId('top-dialog')).toHaveText('');

    await page.getByRole('button', { name: 'Open First' }).click();
    await expect(page.getByTestId('dialog-count')).toHaveText('1');
    await expect(page.getByTestId('top-dialog')).toHaveText('dm-first');

    // Open second modal from inside first modal
    await page.getByRole('button', { name: 'Open Second' }).click();
    await expect(page.getByTestId('dialog-count')).toHaveText('2');
    await expect(page.getByTestId('top-dialog')).toHaveText('dm-second');

    await page.getByRole('button', { name: 'Close Second' }).click();
    await expect(page.getByTestId('dialog-count')).toHaveText('1');
    await expect(page.getByTestId('top-dialog')).toHaveText('dm-first');

    await page.getByRole('button', { name: 'Close First' }).click();
    await expect(page.getByTestId('dialog-count')).toHaveText('0');
    await expect(page.getByTestId('top-dialog')).toHaveText('');
  });

  test('stackOrder reflects open order', async ({ mount, page }) => {
    await mount(<MultiDialogHarness />);

    await page.getByRole('button', { name: 'Open First' }).click();
    await expect(page.getByTestId('stack-order')).toHaveText('dm-first');

    await page.getByRole('button', { name: 'Open Second' }).click();
    await expect(page.getByTestId('stack-order')).toHaveText('dm-first,dm-second');

    await page.getByRole('button', { name: 'Close Second' }).click();
    await expect(page.getByTestId('stack-order')).toHaveText('dm-first');

    await page.getByRole('button', { name: 'Close First' }).click();
    await expect(page.getByTestId('stack-order')).toHaveText('');
  });

  test('dialog:open fires at start of opening sequence with correct template', async ({
    mount,
    page,
  }) => {
    await mount(<DomEventHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('open:dom-ev-modal:modal');
  });

  test('dialog:close fires after closing sequence with correct template and reason', async ({
    mount,
    page,
  }) => {
    await mount(<DomEventHarness />);
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await page.getByRole('button', { name: 'Close Modal' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('close:dom-ev-modal:modal:ok');
  });

  test('slide modal dispatches dialog:open and dialog:close with template slide', async ({
    mount,
    page,
  }) => {
    await mount(<DomEventHarness />);
    await page.getByRole('button', { name: 'Open Slide' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('open:dom-ev-slide:slide');
    await page.getByRole('button', { name: 'Close Slide' }).click();
    await expect(page.getByTestId('dom-events')).toContainText('close:dom-ev-slide:slide:ok');
  });

  test('message modal dispatches dialog:open and dialog:close with template message', async ({
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

    await expect(page.getByTestId('count-A')).toHaveText('0');
    await expect(page.getByTestId('count-B')).toHaveText('0');

    await page.getByRole('button', { name: 'Open A' }).click();
    await expect(page.getByTestId('count-A')).toHaveText('1');
    await expect(page.getByTestId('has-open-A')).toHaveText('yes');
    await expect(page.getByTestId('count-B')).toHaveText('0');
    await expect(page.getByTestId('has-open-B')).toHaveText('no');

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
    await expect(page.getByTestId('dialog-no-provider-modal')).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('has-open')).toHaveText('no');
    await expect(page.getByTestId('last-reason')).toHaveText('done');
  });
});

test.describe('lookup', () => {
  test('lookup(id) returns DialogInfo for closed registered modals', async ({ mount, page }) => {
    await mount(<LookupFindHarness />);

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
    await expect(page.getByTestId('result')).toContainText('a-template:modal');
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

    await page.getByRole('button', { name: 'Query' }).click();
    await expect(page.getByTestId('stats')).toHaveText('count:3|open:1:col-a|closed:2:col-b,col-c');
  });

  test('lookup().getForeground and isForeground track the topmost modal', async ({
    mount,
    page,
  }) => {
    await mount(<LookupForegroundHarness />);

    await page.getByRole('button', { name: 'Open A' }).click();

    await page.getByRole('button', { name: 'Check FG from A' }).click();
    await expect(page.getByTestId('foreground-id')).toHaveText('fg-a');
    await expect(page.getByTestId('is-fg-a')).toHaveText('true');
    await expect(page.getByTestId('is-fg-b')).toHaveText('false');

    // Open B from inside A
    await page.getByRole('button', { name: 'Open B' }).click();

    await page.getByRole('button', { name: 'Check FG from B' }).click();
    await expect(page.getByTestId('foreground-id')).toHaveText('fg-b');
    await expect(page.getByTestId('is-fg-a')).toHaveText('false');
    await expect(page.getByTestId('is-fg-b')).toHaveText('true');

    await page.getByRole('button', { name: 'Close B' }).click();
    await page.getByRole('button', { name: 'Check FG from A' }).click();
    await expect(page.getByTestId('foreground-id')).toHaveText('fg-a');
    await expect(page.getByTestId('is-fg-a')).toHaveText('true');
  });
});

test.describe('modal / non-modal', () => {
  test('the modal fields update when a modal dialog opens and closes', async ({ mount, page }) => {
    await mount(<DialogVariantHarness />);
    await expect(page.getByTestId('has-modal')).toHaveText('no');
    await expect(page.getByTestId('dialog-count')).toHaveText('0');

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('has-modal')).toHaveText('yes');
    await expect(page.getByTestId('dialog-count')).toHaveText('1');
    await expect(page.getByTestId('has-non-modal')).toHaveText('no');
    await expect(page.getByTestId('non-modal-count')).toHaveText('0');

    await page.getByRole('button', { name: 'Close Modal' }).click();
    await expect(page.getByTestId('has-modal')).toHaveText('no');
    await expect(page.getByTestId('dialog-count')).toHaveText('0');
  });

  test('the non-modal fields update when a non-modal dialog opens and closes', async ({
    mount,
    page,
  }) => {
    await mount(<DialogVariantHarness />);
    await expect(page.getByTestId('has-non-modal')).toHaveText('no');

    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('has-non-modal')).toHaveText('yes');
    await expect(page.getByTestId('non-modal-count')).toHaveText('1');
    await expect(page.getByTestId('has-modal')).toHaveText('no');
    await expect(page.getByTestId('dialog-count')).toHaveText('0');
    await expect(page.getByTestId('has-any-open')).toHaveText('yes');
    await expect(page.getByTestId('open-count')).toHaveText('1');

    await page.getByRole('button', { name: 'Close Non-Modal' }).click();
    await expect(page.getByTestId('has-non-modal')).toHaveText('no');
    await expect(page.getByTestId('non-modal-count')).toHaveText('0');
  });

  test('a modal and a non-modal dialog track independently', async ({ mount, page }) => {
    await mount(<DialogVariantHarness />);

    // Open the non-modal first — it is clickable behind the modal one
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('open-count')).toHaveText('1');
    await expect(page.getByTestId('has-modal')).toHaveText('no');
    await expect(page.getByTestId('has-non-modal')).toHaveText('yes');

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('open-count')).toHaveText('2');
    await expect(page.getByTestId('has-modal')).toHaveText('yes');
    await expect(page.getByTestId('dialog-count')).toHaveText('1');
    await expect(page.getByTestId('has-non-modal')).toHaveText('yes');
    await expect(page.getByTestId('non-modal-count')).toHaveText('1');

    await page.getByRole('button', { name: 'Close Modal' }).click();
    await expect(page.getByTestId('open-count')).toHaveText('1');
    await expect(page.getByTestId('has-modal')).toHaveText('no');
    await expect(page.getByTestId('has-non-modal')).toHaveText('yes');

    await page.getByRole('button', { name: 'Close Non-Modal' }).click();
    await expect(page.getByTestId('open-count')).toHaveText('0');
    await expect(page.getByTestId('has-any-open')).toHaveText('no');
  });

  test('getOpen() filters by variant', async ({ mount, page }) => {
    await mount(<DialogVariantLookupHarness />);

    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await page.getByRole('button', { name: 'Open Modal' }).click();

    // Query from outside — a non-modal dialog does not block clicks
    await page.getByRole('button', { name: 'Query' }).click();
    await expect(page.getByTestId('lookup-result')).toContainText('modal:true');
    await expect(page.getByTestId('lookup-result')).toContainText('dialogCount:1');
    await expect(page.getByTestId('lookup-result')).toContainText('dialogIds:lookup-modal');
    await expect(page.getByTestId('lookup-result')).toContainText('nonModal:true');
    await expect(page.getByTestId('lookup-result')).toContainText('nonModalCount:1');
    await expect(page.getByTestId('lookup-result')).toContainText('nonModalIds:lookup-non-modal');
  });
});

// ── Scroll lock ─────────────────────────────────────────────────────────────
// A bare `overflow: hidden` removes a classic scrollbar, widening the viewport by ~15px.
test.describe('dialogManager — scroll lock', () => {
  test('opening a modal locks scrolling without shifting the layout', async ({ mount, page }) => {
    await mount(<ScrollLockHarness />);

    const marker = page.getByTestId('right-marker');
    const before = await marker.boundingBox();
    expect(before).not.toBeNull();

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dialog-scroll-lock-modal')).toBeVisible();

    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    // The right-aligned marker must not have moved horizontally.
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
    await expect(page.getByTestId('dialog-scroll-lock-modal')).toBeVisible();

    // The bar pads itself from the published variable; the library never touched the element.
    const during = await fixedMarker.boundingBox();
    if (before && during) {
      expect(Math.abs(during.x - before.x)).toBeLessThanOrEqual(1);
    }
  });

  test('a non-modal dialog never locks scrolling', async ({ mount, page }) => {
    await mount(<ScrollLockHarness />);
    await page.getByRole('button', { name: 'Open Non-Modal' }).click();
    await expect(page.getByTestId('dialog-scroll-lock-non-modal')).toBeVisible();

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
    await expect(page.getByTestId('dialog-scroll-lock-modal')).toBeVisible();
    const single = await page.evaluate(() => {
      return document.body.style.paddingRight;
    });

    // A second modal must not pad again. Opened from inside the first: the backdrop blocks outside.
    await page.getByRole('button', { name: 'Stack Second Modal' }).click();
    await expect(page.getByTestId('dialog-scroll-lock-modal-2')).toBeVisible();
    expect(
      await page.evaluate(() => {
        return document.body.style.paddingRight;
      })
    ).toBe(single);
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    await page.getByRole('button', { name: 'Close Second' }).click();
    await expect(page.getByTestId('dialog-scroll-lock-modal-2')).not.toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    await page.getByRole('button', { name: 'Close Modal' }).click();
    await expect(page.locator('body')).not.toHaveAttribute('data-dialog-open', 'true');
  });

  test('a second manager does not release a lock it never took', async ({ mount, page }) => {
    await mount(<ScrollLockTwoManagersHarness />);

    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.getByTestId('dialog-two-managers-modal')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    // Registry churn in the *nested* manager — which has nothing open and so never locked.
    await page.getByRole('button', { name: 'Unmount Bystander' }).click();

    await expect(page.getByTestId('dialog-two-managers-modal')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');
  });

  test('two managers both holding the lock release it only when the last one lets go', async ({
    mount,
    page,
  }) => {
    // Why the owners are a `Set`: with both managers holding the lock, a shared boolean would let
    // the first to close release it, scrolling the body behind a modal still on screen.
    await mount(<ScrollLockBothOpenHarness />);

    await page.getByTestId('open-outer').click();
    await expect(page.getByTestId('dialog-both-open-outer')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    // The nested manager's own modal, opened from inside the outer one: a second claim on the body.
    await page.getByTestId('open-inner').click();
    await expect(page.getByTestId('dialog-both-open-inner')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    // Manager B lets go while manager A is still open. This is the assertion.
    await page.getByTestId('close-inner').click();
    await expect(page.getByTestId('inner-visible')).toHaveText('closed');
    await expect(page.getByTestId('dialog-both-open-outer')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-dialog-open', 'true');

    await page.getByTestId('close-outer').click();
    await expect(page.locator('body')).not.toHaveAttribute('data-dialog-open', 'true');
  });
});
