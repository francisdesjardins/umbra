import { expect, test } from '../../__tests__/ct-coverage.js';
import type { ConsoleMessage, Page } from '@playwright/test';
import {
  ActionLoggingHarness,
  ReasonSourceHarness,
  SpreadContractHarness,
  DomSafeSpreadHarness,
  HotkeyWhilePreparingHarness,
  BasicActionsHarness,
  DefinitionActionsHarness,
  DismissKeyActionCollisionHarness,
  ErrorActionsHarness,
  FocusRestorationHarness,
  HotkeyActionsHarness,
  DialogActionBasicHarness,
  DialogActionCustomHandlerHarness,
  DialogActionHotkeyHarness,
  DialogActionMultipleHarness,
  VanillaAriaKeyshortcutsHarness,
  BrokenAriaKeyshortcutsHarness,
  FocusOnOpenHarness,
  ActionIsRunningHarness,
} from './use-dialog-actions.story';

/** Distinctive close payload — must never appear in a captured log line. */
const SENTINEL_PAYLOAD = 'SENTINEL_PAYLOAD_9271';

test.describe('actions declared by use', () => {
  test('dialog is initially closed', async ({ mount, page }) => {
    await mount(<BasicActionsHarness />);
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('dialog-ctrl-basic')).not.toBeVisible();
  });

  test('opens dialog with action buttons', async ({ mount, page }) => {
    await mount(<BasicActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('dialog-ctrl-basic')).toBeVisible();
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
    await expect(page.getByTestId('dialog-ctrl-hotkey')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('Escape hotkey triggers cancel action instead of dismiss', async ({ mount, page }) => {
    await mount(<HotkeyActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('dialog-ctrl-hotkey')).toBeVisible();
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
    await expect(page.getByTestId('dialog-ctrl-hotkey')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Enter'
    );
    await expect(page.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Escape'
    );
  });

  test('a modified hotkey carries the ARIA spelling, and still dispatches by it', async ({
    mount,
    page,
  }) => {
    // Both halves in one test: `Enter`/`Escape` serialise identically either way, so only a
    // modified hotkey catches a stale spelling in the attribute or in the dispatch selector.
    await mount(<HotkeyActionsHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('dialog-ctrl-hotkey')).toBeVisible();

    await expect(page.getByTestId('modified-hotkey')).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+S'
    );

    await page.keyboard.press('Control+s');
    await expect(page.getByTestId('last-reason')).toHaveText('save');
  });

  test('focus returns inside the dialog after a failed action', async ({ mount, page }) => {
    await mount(<FocusRestorationHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('dialog-ctrl-focus')).toBeVisible();
    await expect(page.getByTestId('ok-btn')).toBeFocused();
    // The failing action disables its own button, so focus falls to the body first.
    await page.getByTestId('bad-btn').click();
    // Must land back inside the dialog — otherwise no keyboard. Which button is pinned separately.
    expect(
      await page.evaluate(() => {
        const dialog = document.querySelector('[data-testid="dialog-ctrl-focus"]');
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
    await expect(page.getByTestId('dialog-ctrl-dismiss-collision')).toBeVisible();

    // Delete is both the dismissKey and the action hotkey — action should win
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('remove');
  });
});

test.describe('callable actions', () => {
  test('no-handler callable closes dialog with action reason', async ({ mount, page }) => {
    await mount(<DialogActionBasicHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('dialog-action-basic')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('cancel action closes with reason "cancel"', async ({ mount, page }) => {
    await mount(<DialogActionBasicHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('cancel');
  });

  test('loading state propagates through render prop during async action', async ({
    mount,
    page,
  }) => {
    await mount(<DialogActionCustomHandlerHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByTestId('confirm-btn').click();
    await expect(page.getByTestId('confirm-btn')).toHaveAttribute('data-loading', 'true');
    await expect(page.getByTestId('cancel-btn')).toHaveAttribute('data-disabled', 'true');
    await expect(page.getByTestId('is-visible')).toHaveText('closed');
    await expect(page.getByTestId('last-reason')).toHaveText('confirm');
  });

  test('sibling action is disabled while another runs', async ({ mount, page }) => {
    await mount(<DialogActionMultipleHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByTestId('confirm-btn').click();
    await expect(page.getByTestId('is-running')).toHaveText('true');
    await expect(page.getByTestId('cancel-btn')).toBeDisabled();
  });

  test('aria-keyshortcuts forwarded through render prop', async ({ mount, page }) => {
    await mount(<DialogActionHotkeyHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('dialog-action-hotkey')).toBeVisible();
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
    await mount(<DialogActionHotkeyHarness />);
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
    await expect(page.getByTestId('dialog-vanilla-aria')).toBeVisible();
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
    await expect(page.getByTestId('dialog-broken-aria')).toBeVisible();
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
    // Without aria-keyshortcuts neither hotkey dispatches, and Escape still routes to the action
    // path rather than native dismiss — so the dialog stays open on both.
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('is-visible')).toHaveText('open');
    await expect(page.getByTestId('dialog-broken-aria')).toBeVisible();
  });
});

test.describe('action lifecycle logging', () => {
  /** Real JS values, not `msg.text()`, so the payload check ignores Playwright's arg rendering. */
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

  test('logs started → close → completed with the dialog id, never the payload', async ({
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

    await expect(page.getByTestId('is-visible')).toHaveText('open');

    const values = await loggedValues(messages);
    expect(logged(values, 'Action started')).toBe(true);
    expect(logged(values, 'Action failed')).toBe(true);
    expect(logged(values, 'Action completed')).toBe(false);
  });
});

test.describe('action identity and payload', () => {
  test('the reason an action is declared with is the reason it closes with', async ({
    mount,
    page,
  }) => {
    await mount(<ReasonSourceHarness />);
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('reason-source-last')).toHaveText('close');
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
    await page.getByRole('button', { name: 'Close' }).click();
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
      if (m.type() === 'error' || m.type() === 'warning') {
        warnings.push(m.text());
      }
    });
    await mount(<SpreadContractHarness />);
    await page.getByRole('button', { name: 'Open Spread' }).click();
    // Sample mid-action: `loading` is false at rest and React omits it, so rest proves nothing.
    await page.getByTestId('slow-btn').click();
    await expect(page.getByTestId('entries')).toHaveText('1');

    const attrs = await page.getByTestId('slow-btn').evaluate((node) => {
      return [...node.attributes].map((a) => {
        return `${a.name}=${a.value}`;
      });
    });
    // `loading` is a component prop React never writes to DOM; `data-loading` carries it instead.
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

  test('the whole set spreads onto a bare button — DOM-safe, and nothing missing', async ({
    mount,
    page,
  }) => {
    const warnings: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') {
        warnings.push(m.text());
      }
    });
    await mount(<DomSafeSpreadHarness />);
    await page.getByRole('button', { name: 'Open Dom Spread' }).click();

    const dom = page.getByTestId('dom-btn');
    const attrs = await dom.evaluate((node) => {
      return [...node.attributes].map((a) => {
        return a.name;
      });
    });
    expect(attrs, 'a non-DOM prop reached the element').not.toContain('loading');
    expect(warnings.join(' '), 'React complained about the spread').not.toMatch(/loading/i);

    // DOM-safe must not mean trimmed: these are what make hotkey and opening focus work bare.
    await expect(dom).toHaveAttribute('aria-keyshortcuts', 'Enter');
    await expect(dom).toHaveAttribute('data-focus-on-open', 'true');
    await expect(dom).toHaveAttribute('type', 'button');
    await expect(dom).toBeFocused();
    await expect(dom).toHaveAttribute('data-loading', 'false');

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('dialog-dom-safe-spread')).not.toBeVisible();
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

    // Disabled mid-action is what makes the second click impossible; `aria-busy` says so to AT.
    await expect(page.getByTestId('slow-btn')).toBeDisabled();
    await expect(page.getByTestId('slow-btn')).toHaveAttribute('aria-busy', 'true');

    // Even dispatched directly, a disabled button fires no click.
    await page.getByTestId('slow-btn').dispatchEvent('click');
    await page.waitForTimeout(200);
    await expect(page.getByTestId('entries')).toHaveText('1');

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
    // The input is first in the DOM and what showModal() picks unaided, so Cancel is not luck.
    await mount(<FocusOnOpenHarness />);
    await page.getByRole('button', { name: 'Open Focus Dialog' }).click();
    await expect(page.getByTestId('foo-is-visible')).toHaveText('open');

    await expect
      .poll(() => {
        return activeTestId(page);
      })
      .toBe('foo-cancel');
  });

  test('the opening focus is visibly focused, claimed or not', async ({ mount, page }) => {
    // The opening click is pointer input, so modality alone draws no ring. `focusVisible` is what
    // draws it; the blur only makes the re-focus take. Green here because CI's engines read the
    // flag — below Chrome 145 / Safari 18.4 they do not, which the matrix carries as `enhancing`.
    await mount(<FocusOnOpenHarness />);
    await page.getByRole('button', { name: 'Open Focus Dialog' }).click();
    await expect(page.getByTestId('foo-is-visible')).toHaveText('open');

    await expect
      .poll(() => {
        return page.evaluate(() => {
          const active = document.activeElement;
          return active instanceof HTMLElement && active.matches(':focus-visible');
        });
      })
      .toBe(true);
  });

  /**
   * What the ring does on an engine that ignores `focusVisible` — Chrome below 145, Safari below
   * 18.4, neither of which CI runs. Simulated by dropping the option on the way through, which is
   * what those engines do with it, so what is left is the engine's own habit.
   *
   * **And the three do not agree, which is the argument for the flag.** WebKit rings a scripted
   * focus either way. Chromium rings it only when the dialog was opened from the keyboard, the
   * modality surviving `showModal()`'s own focus move. Firefox rings neither. The flag is what
   * makes them agree, and the matrix carries it as `enhancing` because none of this throws.
   */
  test("without the flag the ring is the engine's habit, not the library's", async ({
    mount,
    page,
    browserName,
  }) => {
    await mount(<FocusOnOpenHarness />);
    await page.evaluate(() => {
      const real = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function focusWithoutOptions(this: HTMLElement) {
        real.call(this);
      };
    });

    const expected = {
      chromium: { pointer: false, keyboard: true },
      firefox: { pointer: false, keyboard: false },
      webkit: { pointer: true, keyboard: true },
    }[browserName];

    const trigger = page.getByRole('button', { name: 'Open Focus Dialog' });
    const ringed = () => {
      return page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLElement && active.matches(':focus-visible');
      });
    };
    const settled = async () => {
      await expect(page.getByTestId('foo-is-visible')).toHaveText('open');
      await expect
        .poll(() => {
          return activeTestId(page);
        })
        .toBe('foo-cancel');
    };

    await trigger.click();
    await settled();
    expect(await ringed(), 'opened by pointer').toBe(expected.pointer);

    await page.getByTestId('foo-cancel').click();
    await expect(page.getByTestId('foo-is-visible')).toHaveText('closed');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await settled();
    expect(await ringed(), 'opened from the keyboard').toBe(expected.keyboard);
  });

  test('a failed action leaves focus on the button that ran it', async ({ mount, page }) => {
    // The claimed button decides where the dialog opens; after a failure, whoever ran the action.
    await mount(<FocusOnOpenHarness />);
    await page.getByRole('button', { name: 'Open Focus Dialog' }).click();
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
    // Focus starts on Cancel; failing from Confirm must leave focus there, not argue it back.
    await mount(<FocusOnOpenHarness />);
    await page.getByRole('button', { name: 'Open Focus Dialog' }).click();
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

test.describe('the restore after a failed action announces itself', () => {
  test('the button it returns to is visibly focused, not silently', async ({ mount, page }) => {
    // Mouse-driven on purpose: the button is `disabled` while its action runs, so focus is on
    // `<body>` when it settles and the library puts it back from nowhere. A keyboard failure would
    // carry the ring through input modality and pass whatever the library does.
    await mount(<FocusOnOpenHarness />);
    await page.getByRole('button', { name: 'Open Focus Dialog' }).click();

    await page.getByTestId('foo-confirm').click();
    await expect(page.getByTestId('foo-error')).toHaveText('Deletion failed');

    await expect
      .poll(() => {
        return page.evaluate(() => {
          const active = document.activeElement;
          return {
            id: active?.getAttribute('data-testid') ?? null,
            ring: active instanceof HTMLElement && active.matches(':focus-visible'),
          };
        });
      })
      .toEqual({ id: 'foo-confirm', ring: true });
  });
});

test.describe('action.isRunning — the per-action question, away from the button', () => {
  test('names which action is running, where the aggregate only says that one is', async ({
    mount,
    page,
  }) => {
    // Header, field and cancel readout all sit outside the props of the action that is running.
    await mount(<ActionIsRunningHarness />);
    await page.getByRole('button', { name: 'Open' }).click();

    await expect(page.getByTestId('status')).toHaveText('idle');
    await expect(page.getByTestId('field')).toBeEnabled();

    await page.getByTestId('save-btn').click();

    await expect(page.getByTestId('status')).toHaveText('saving');
    await expect(page.getByTestId('aggregate')).toHaveText('true');
    // The discrimination the aggregate cannot make: cancel is not the one running.
    await expect(page.getByTestId('cancel-running')).toHaveText('false');
    await expect(page.getByTestId('field')).toBeDisabled();

    // Inside the dialog: the top layer swallows a click on anything outside it.
    await page.getByTestId('release-btn').click();

    // Released, the handler closes on its own reason and takes the readouts with it.
    await expect(page.getByTestId('dialog-action-is-running')).not.toBeVisible();
  });
});
