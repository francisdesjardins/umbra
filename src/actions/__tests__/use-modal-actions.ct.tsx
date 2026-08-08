import { expect, test } from '@playwright/experimental-ct-react';
import type { ConsoleMessage, Page } from '@playwright/test';
import {
  ActionLoggingHarness,
  ReasonSourceHarness,
  SpreadContractHarness,
  HotkeyWhilePreparingHarness,
  BasicActionsHarness,
  DefinitionActionsHarness,
  DismissKeyActionCollisionHarness,
  ErrorActionsHarness,
  FocusRestorationHarness,
  HotkeyActionsHarness,
  ModalActionBasicHarness,
  ModalActionCustomHandlerHarness,
  ModalActionHotkeyHarness,
  ModalActionMultipleHarness,
  VanillaAriaKeyshortcutsHarness,
  BrokenAriaKeyshortcutsHarness,
  FocusOnOpenHarness,
} from './use-modal-actions.story';

/** Distinctive close payload — must never appear in a captured log line. */
const SENTINEL_PAYLOAD = 'SENTINEL_PAYLOAD_9271';

test.describe('actions declared by use', () => {
  test('modal is initially closed', async ({ mount, page }) => {
    await mount(<BasicActionsHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('modal-ctrl-basic')).not.toBeVisible();
  });

  test('opens modal with action buttons', async ({ mount, page }) => {
    await mount(<BasicActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-ctrl-basic')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('closes with reason "confirm" via action', async ({ mount, page }) => {
    await mount(<BasicActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('closes with reason "cancel" via action', async ({ mount, page }) => {
    await mount(<BasicActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('standalone store state updates and snapshot is accessible after close', async ({
    mount,
    page,
  }) => {
    await mount(<BasicActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Increment' }).click();
    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.getByTestId('count')).toHaveText('2');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('last-count')).toHaveText('2');
  });

  test('error state is populated when action handler throws', async ({ mount, page }) => {
    await mount(<ErrorActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('error-msg')).toHaveText('');
    await page.getByRole('button', { name: 'Bad Action' }).click();
    await expect(page.getByTestId('error-msg')).toHaveText('boom');
  });

  test('Enter hotkey triggers confirm action', async ({ mount, page }) => {
    await mount(<HotkeyActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-ctrl-hotkey')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('Escape hotkey triggers cancel action instead of dismiss', async ({ mount, page }) => {
    await mount(<HotkeyActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-ctrl-hotkey')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('standalone store with inline controller works', async ({ mount, page }) => {
    await mount(<DefinitionActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('def-is-visible')).toHaveText('closed');
    await expect(page.getByTestId('def-last-reason')).toHaveText('confirm');
  });

  test('standalone store method updates state reactively', async ({ mount, page }) => {
    await mount(<DefinitionActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.getByTestId('def-count')).toHaveText('1');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('def-is-visible')).toHaveText('closed');
  });

  test('can be opened and closed multiple times', async ({ mount, page }) => {
    await mount(<BasicActionsHarness />);

    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');

    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('action buttons have aria-keyshortcuts when hotkey is declared', async ({ mount, page }) => {
    await mount(<HotkeyActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-ctrl-hotkey')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Enter'
    );
    await expect(page.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Escape'
    );
  });

  test('focus returns inside the dialog after a failed action', async ({ mount, page }) => {
    await mount(<FocusRestorationHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-ctrl-focus')).toBeVisible();
    // Ok is the first button — native autofocus lands here
    await expect(page.getByTestId('ok-btn')).toBeFocused();
    // The failing action disables its own button while it runs, so focus falls to the body.
    await page.getByTestId('bad-btn').click();
    // It must come back inside the dialog — otherwise the modal has no keyboard at all. Which
    // button it lands on is decided by who ran the action; that is pinned separately.
    expect(
      await page.evaluate(() => {
        const dialog = document.querySelector('[data-testid="modal-ctrl-focus"]');
        return dialog?.contains(document.activeElement) ?? false;
      })
    ).toBe(true);
  });

  test('controller action hotkey matching dismissKey suppresses dismiss', async ({
    mount,
    page,
  }) => {
    await mount(<DismissKeyActionCollisionHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-ctrl-dismiss-collision')).toBeVisible();

    // Delete is both the dismissKey and the action hotkey — action should win
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('remove');
  });
});

test.describe('callable actions', () => {
  test('no-handler callable closes modal with action reason', async ({ mount, page }) => {
    await mount(<ModalActionBasicHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-action-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('cancel action closes with reason "cancel"', async ({ mount, page }) => {
    await mount(<ModalActionBasicHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('loading state propagates through render prop during async action', async ({
    mount,
    page,
  }) => {
    await mount(<ModalActionCustomHandlerHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByTestId('confirm-btn').click();
    await expect(page.getByTestId('confirm-btn')).toHaveAttribute('data-loading', 'true');
    await expect(page.getByTestId('cancel-btn')).toHaveAttribute('data-disabled', 'true');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('sibling action is disabled while another runs', async ({ mount, page }) => {
    await mount(<ModalActionMultipleHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByTestId('confirm-btn').click();
    await expect(page.getByTestId('is-running')).toHaveText('true');
    // Cancel button should be disabled while confirm is running
    await expect(page.getByTestId('cancel-btn')).toBeDisabled();
  });

  test('aria-keyshortcuts forwarded through render prop', async ({ mount, page }) => {
    await mount(<ModalActionHotkeyHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-action-hotkey')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Enter'
    );
    await expect(page.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Escape'
    );
  });

  test('hotkey triggers action via callable', async ({ mount, page }) => {
    await mount(<ModalActionHotkeyHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });
});

test.describe('custom button wrapper aria-keyshortcuts', () => {
  test('wrapper that forwards aria-keyshortcuts has attribute on DOM button', async ({
    mount,
    page,
  }) => {
    await mount(<VanillaAriaKeyshortcutsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-vanilla-aria')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Enter'
    );
    await expect(page.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Escape'
    );
  });

  test('hotkey dispatch works through custom wrapper that forwards aria-keyshortcuts', async ({
    mount,
    page,
  }) => {
    await mount(<VanillaAriaKeyshortcutsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('wrapper that drops aria-keyshortcuts has no attribute on DOM button', async ({
    mount,
    page,
  }) => {
    await mount(<BrokenAriaKeyshortcutsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('modal-broken-aria')).toBeVisible();
    // BrokenButton intentionally does not forward aria-keyshortcuts
    await expect(page.getByRole('button', { name: 'Confirm' })).not.toHaveAttribute(
      'aria-keyshortcuts'
    );
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toHaveAttribute(
      'aria-keyshortcuts'
    );
  });

  test('hotkey dispatch fails silently when wrapper drops aria-keyshortcuts', async ({
    mount,
    page,
  }) => {
    await mount(<BrokenAriaKeyshortcutsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    // Enter hotkey should NOT trigger confirm because aria-keyshortcuts is missing
    await page.keyboard.press('Enter');
    // Modal should still be open — hotkey had no effect
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    // Escape is claimed by the cancel action but without aria-keyshortcuts
    // the action dispatch fails — dismiss-key collision detection still routes
    // to the action path (not native dismiss), so the modal stays open
    await expect(page.getByTestId('modal-broken-aria')).toBeVisible();
  });
});

test.describe('action lifecycle logging', () => {
  /**
   * Resolve every console argument across captured messages to real JS values —
   * message format strings and the structured data objects alike. Inspecting
   * actual values (not `msg.text()`) makes the payload-absence check robust
   * regardless of how Playwright renders object args.
   */
  async function loggedValues(messages: ConsoleMessage[]): Promise<unknown[]> {
    const values: unknown[] = [];
    for (const msg of messages) {
      for (const arg of msg.args()) {
        values.push(
          await arg.jsonValue().catch(() => {
            return undefined;
          })
        );
      }
    }
    return values;
  }

  /** True when some emitted log message (format string) contains `text`. */
  function logged(values: unknown[], text: string): boolean {
    return values.some((v) => {
      return typeof v === 'string' && v.includes(text);
    });
  }

  test('logs started → close → completed with the modal id, never the payload', async ({
    mount,
    page,
  }) => {
    const messages: ConsoleMessage[] = [];
    page.on('console', (msg) => {
      messages.push(msg);
    });

    await mount(<ActionLoggingHarness payload={SENTINEL_PAYLOAD} />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');

    const values = await loggedValues(messages);

    // Full happy-path trace is emitted at the runAction chokepoint.
    expect(logged(values, 'Action started')).toBe(true);
    expect(logged(values, 'Action close')).toBe(true);
    expect(logged(values, 'Action completed')).toBe(true);

    // Every action log carries the modal id, like the other namespaces do.
    expect(
      values.some((v) => {
        return typeof v === 'object' && v !== null && 'id' in v && v.id === 'ctrl-logging';
      })
    ).toBe(true);

    // PII safety: the payload handed to close() must never reach any log line.
    expect(JSON.stringify(values)).not.toContain(SENTINEL_PAYLOAD);
  });

  test('logs Action failed (not completed) when the handler throws', async ({ mount, page }) => {
    const messages: ConsoleMessage[] = [];
    page.on('console', (msg) => {
      messages.push(msg);
    });

    await mount(<ActionLoggingHarness payload={SENTINEL_PAYLOAD} />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Fail' }).click();

    // A thrown handler leaves the modal open and logs the failure.
    await expect(page.getByTestId('is-visible')).toHaveText('open');

    const values = await loggedValues(messages);
    expect(logged(values, 'Action started')).toBe(true);
    expect(logged(values, 'Action failed')).toBe(true);
    expect(logged(values, 'Action completed')).toBe(false);
  });
});

test.describe('action identity and payload', () => {
  test('the config key is the close reason', async ({ mount, page }) => {
    await mount(<ReasonSourceHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByTestId('reason-source-last')).toHaveText('dismiss');
  });

  test("an action's declared payload reaches onClose", async ({ mount, page }) => {
    await mount(<ReasonSourceHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('reason-source-last')).toHaveText('save');
    await expect(page.getByTestId('reason-source-id')).toHaveText('42');
  });

  test('an action that closes bare carries no payload', async ({ mount, page }) => {
    await mount(<ReasonSourceHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByTestId('reason-source-id')).toHaveText('none');
  });

  test('an action hotkey fires while prepare is still running, like a click does', async ({
    mount,
    page,
  }) => {
    await mount(<HotkeyWhilePreparingHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('preparing-flag')).toHaveText('opening');

    // The button is rendered and enabled, so clicking it runs the action. Pressing its
    // declared hotkey has to be the same trigger, not a second policy.
    await page.keyboard.press('F2');
    await expect(page.getByTestId('hwo-last-reason')).toHaveText('confirm');
  });

  test('clicking the same action while prepare is running works', async ({ mount, page }) => {
    await mount(<HotkeyWhilePreparingHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('preparing-flag')).toHaveText('opening');

    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('hwo-last-reason')).toHaveText('confirm');
  });
});

test.describe('the props an action spreads onto a button', () => {
  test('are all valid DOM attributes', async ({ mount, page }) => {
    const warnings: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') warnings.push(m.text());
    });
    await mount(<SpreadContractHarness />);
    await page.getByRole('button', { name: 'Open Spread' }).click();
    // Sample while the action runs: `loading` is `false` at rest, and React omits a false
    // boolean-ish attribute, so a resting button cannot answer the question.
    await page.getByTestId('slow-btn').click();
    await expect(page.getByTestId('entries')).toHaveText('1');

    const attrs = await page.getByTestId('slow-btn').evaluate((node) => {
      return [...node.attributes].map((a) => {
        return `${a.name}=${a.value}`;
      });
    });
    // `loading` is for a button *component*; React does not write it to a DOM element, so the
    // plain button gets the same state as `data-loading` and can be styled on it.
    expect(attrs, 'the running state did not reach the element').toContain('data-loading=true');
    expect(
      attrs.filter((attr) => {
        return attr.startsWith('loading=');
      }),
      'a non-DOM prop reached the element'
    ).toEqual([]);
    expect(warnings.join(' '), 'React complained about the spread').not.toMatch(/loading/i);
  });

  test('the running state is readable from CSS on a plain button', async ({ mount, page }) => {
    await mount(<SpreadContractHarness />);
    await page.getByRole('button', { name: 'Open Spread' }).click();

    const button = page.getByTestId('slow-btn');
    await expect(button).toHaveAttribute('data-loading', 'false');
    await button.click();
    await expect(button).toHaveAttribute('data-loading', 'true');

    // The whole point of the attribute: a selector can see it.
    const matches = await button.evaluate((node) => {
      return node.matches('[data-loading="true"]');
    });
    expect(matches).toBe(true);
  });

  test('do not submit a surrounding form', async ({ mount, page }) => {
    await mount(<SpreadContractHarness />);
    await page.getByRole('button', { name: 'Open Spread' }).click();
    await page.getByTestId('slow-btn').click();
    await expect(page.getByTestId('submits')).toHaveText('0');
  });

  test('prevent re-entering the action that is already running', async ({ mount, page }) => {
    await mount(<SpreadContractHarness />);
    await page.getByRole('button', { name: 'Open Spread' }).click();

    await page.getByTestId('slow-btn').click();
    await expect(page.getByTestId('entries')).toHaveText('1');

    // Mid-action the button is disabled, which is what makes the second click impossible
    // rather than merely discouraged, and `aria-busy` says so to assistive technology.
    await expect(page.getByTestId('slow-btn')).toBeDisabled();
    await expect(page.getByTestId('slow-btn')).toHaveAttribute('aria-busy', 'true');

    // Even dispatched directly, a disabled button fires no click.
    await page.getByTestId('slow-btn').dispatchEvent('click');
    await page.waitForTimeout(200);
    await expect(page.getByTestId('entries')).toHaveText('1');

    // It comes back once the handler settles.
    await page.getByRole('button', { name: 'Finish Slow' }).click();
    await expect(page.getByTestId('slow-btn')).toBeEnabled();
  });

  test('an override adds a disabled reason without removing the action’s own', async ({
    mount,
    page,
  }) => {
    await mount(<SpreadContractHarness />);
    await page.getByRole('button', { name: 'Open Spread' }).click();
    await expect(page.getByTestId('guarded-btn')).toBeDisabled();

    await page.getByRole('button', { name: 'Make Valid' }).click();
    await expect(page.getByTestId('guarded-btn')).toBeEnabled();
  });

  test('a composed onClick runs first and can veto the action', async ({ mount, page }) => {
    await mount(<SpreadContractHarness />);
    await page.getByRole('button', { name: 'Open Spread' }).click();

    await page.getByTestId('veto-btn').click();
    await expect(page.getByTestId('clicks')).toHaveText('1');
    await expect(page.getByTestId('vetoed-runs')).toHaveText('0');
  });
});

test.describe('focusOnOpen', () => {
  const activeTestId = async (page: Page) => {
    return page.evaluate(() => {
      return document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName;
    });
  };

  test('the marked action takes the opening focus from the first focusable', async ({
    mount,
    page,
  }) => {
    // The input is first in the DOM, so it is what showModal() picks unaided: focus landing on
    // Cancel is the option working, not the browser agreeing by accident.
    await mount(<FocusOnOpenHarness />);
    await page.getByRole('button', { name: 'Open Focus Modal' }).click();
    await expect(page.getByTestId('foo-is-visible')).toHaveText('open');

    await expect
      .poll(() => {
        return activeTestId(page);
      })
      .toBe('foo-cancel');
  });

  test('a failed action leaves focus on the button that ran it', async ({ mount, page }) => {
    // The claimed button decides where the modal *opens*. Where it returns after a failure is
    // a different question, answered by whoever ran the action — the retry is under their hand.
    await mount(<FocusOnOpenHarness />);
    await page.getByRole('button', { name: 'Open Focus Modal' }).click();
    await expect
      .poll(() => {
        return activeTestId(page);
      })
      .toBe('foo-cancel');

    await page.getByTestId('foo-confirm').click();
    await expect(page.getByTestId('foo-error')).toHaveText('Deletion failed');
    await expect(page.getByTestId('foo-attempts')).toHaveText('1');

    await expect
      .poll(() => {
        return activeTestId(page);
      })
      .toBe('foo-confirm');
  });
});

test.describe('focus after a failed action follows the button that ran it', () => {
  test('a different button than the opening one keeps the focus on itself', async ({
    mount,
    page,
  }) => {
    // Open (focus starts on Cancel because it claimed it), Tab to Delete, press Enter, and the
    // action fails. The retry is on Delete — the button the user is standing on — so sending
    // focus back to Cancel would be the modal arguing with them.
    await mount(<FocusOnOpenHarness />);
    await page.getByRole('button', { name: 'Open Focus Modal' }).click();
    await expect
      .poll(() => {
        return page.evaluate(() => {
          return document.activeElement?.getAttribute('data-testid');
        });
      })
      .toBe('foo-cancel');

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('foo-confirm')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('foo-error')).toHaveText('Deletion failed');
    await expect(page.getByTestId('foo-attempts')).toHaveText('1');

    await expect
      .poll(() => {
        return page.evaluate(() => {
          return document.activeElement?.getAttribute('data-testid');
        });
      })
      .toBe('foo-confirm');
  });
});
