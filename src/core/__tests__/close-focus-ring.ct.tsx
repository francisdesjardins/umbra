import { expect, test } from '../../__tests__/ct-coverage.js';
import type { Page } from '@playwright/test';
import { CloseRestoreRingHarness } from './close-focus-ring.story.js';

// A close destroys the element holding the keyboard, so where it lands is the library's to announce
// — and the platform's own restore rings by input modality, which would let the way in decide
// whether the way out is visible.

const DIALOG = 'dialog[data-dialog-id="close-restore-ring"]';

/** Every gesture that opens or activates a control, since each leaves a different modality behind. */
type Gesture = 'Enter' | 'Space' | 'click';

async function press(page: Page, on: { gesture: Gesture; testId: string }): Promise<void> {
  const { gesture, testId } = on;
  const control = page.getByTestId(testId);
  if (gesture === 'click') {
    await control.click();
    return;
  }
  await control.focus();
  await page.keyboard.press(gesture === 'Space' ? ' ' : 'Enter');
}

async function ringOnTrigger(page: Page): Promise<boolean> {
  return page.getByTestId('trigger').evaluate((node) => {
    return node === document.activeElement && node.matches(':focus-visible');
  });
}

/**
 * Every way in crossed with every way out, because the claim is that the two are independent. Each
 * title is written out rather than built, so a matrix row naming one resolves to it.
 */
const CASES = [
  {
    closeVia: 'handle',
    closeWith: 'click',
    nonModal: false,
    openWith: 'click',
    title:
      'a modal dialog opened by click, closed by click on the handle button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'Space',
    nonModal: false,
    openWith: 'click',
    title:
      'a modal dialog opened by click, closed by Space on the handle button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'Enter',
    nonModal: false,
    openWith: 'click',
    title:
      'a modal dialog opened by click, closed by Enter on the handle button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'click',
    nonModal: false,
    openWith: 'click',
    title:
      'a modal dialog opened by click, closed by click on the action button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'Space',
    nonModal: false,
    openWith: 'click',
    title:
      'a modal dialog opened by click, closed by Space on the action button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'Enter',
    nonModal: false,
    openWith: 'click',
    title:
      'a modal dialog opened by click, closed by Enter on the action button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'click',
    nonModal: true,
    openWith: 'click',
    title:
      'a non-modal panel opened by click, closed by click on the handle button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'Space',
    nonModal: true,
    openWith: 'click',
    title:
      'a non-modal panel opened by click, closed by Space on the handle button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'Enter',
    nonModal: true,
    openWith: 'click',
    title:
      'a non-modal panel opened by click, closed by Enter on the handle button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'click',
    nonModal: true,
    openWith: 'click',
    title:
      'a non-modal panel opened by click, closed by click on the action button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'Space',
    nonModal: true,
    openWith: 'click',
    title:
      'a non-modal panel opened by click, closed by Space on the action button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'Enter',
    nonModal: true,
    openWith: 'click',
    title:
      'a non-modal panel opened by click, closed by Enter on the action button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'click',
    nonModal: false,
    openWith: 'Enter',
    title:
      'a modal dialog opened by Enter, closed by click on the handle button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'Space',
    nonModal: false,
    openWith: 'Enter',
    title:
      'a modal dialog opened by Enter, closed by Space on the handle button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'Enter',
    nonModal: false,
    openWith: 'Enter',
    title:
      'a modal dialog opened by Enter, closed by Enter on the handle button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'click',
    nonModal: false,
    openWith: 'Enter',
    title:
      'a modal dialog opened by Enter, closed by click on the action button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'Space',
    nonModal: false,
    openWith: 'Enter',
    title:
      'a modal dialog opened by Enter, closed by Space on the action button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'Enter',
    nonModal: false,
    openWith: 'Enter',
    title:
      'a modal dialog opened by Enter, closed by Enter on the action button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'click',
    nonModal: true,
    openWith: 'Enter',
    title:
      'a non-modal panel opened by Enter, closed by click on the handle button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'Space',
    nonModal: true,
    openWith: 'Enter',
    title:
      'a non-modal panel opened by Enter, closed by Space on the handle button, rings the trigger',
  },
  {
    closeVia: 'handle',
    closeWith: 'Enter',
    nonModal: true,
    openWith: 'Enter',
    title:
      'a non-modal panel opened by Enter, closed by Enter on the handle button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'click',
    nonModal: true,
    openWith: 'Enter',
    title:
      'a non-modal panel opened by Enter, closed by click on the action button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'Space',
    nonModal: true,
    openWith: 'Enter',
    title:
      'a non-modal panel opened by Enter, closed by Space on the action button, rings the trigger',
  },
  {
    closeVia: 'action',
    closeWith: 'Enter',
    nonModal: true,
    openWith: 'Enter',
    title:
      'a non-modal panel opened by Enter, closed by Enter on the action button, rings the trigger',
  },
] as const;

for (const { closeVia, closeWith, nonModal, openWith, title } of CASES) {
  test(title, async ({ mount, page }) => {
    await mount(<CloseRestoreRingHarness closeVia={closeVia} nonModal={nonModal} />);

    await press(page, { gesture: openWith, testId: 'trigger' });
    await expect(page.locator(DIALOG)).toBeVisible();

    await press(page, { gesture: closeWith, testId: 'dialog-close' });
    await expect(page.locator(DIALOG)).not.toBeVisible();

    expect(await ringOnTrigger(page)).toBe(true);
  });
}
