import type { Page } from '@playwright/test';

/**
 * Asking the page which dialog is really in front — shared, because three suites ask the same two
 * questions (React stack, vanilla shadow-root, Solid). Both ask the **DOM**: `openDialogs` would
 * answer about the manager's bookkeeping, these about paint. The mechanism is `close()` +
 * `showModal()`; the top layer paints in insertion order with `z-index` inert between its members,
 * so a suite reading the snapshot would pass a library that stamped a number and moved nothing.
 */

/**
 * The dialog under the centre of the viewport, hit-tested with `elementFromPoint` so the top layer
 * counts the way it does for a click. Harnesses must size their dialogs to overlap at the centre.
 * @returns the `data-modal-id` of the front dialog, or `null` when the centre is not over one.
 */
export async function frontDialogId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return hit?.closest('dialog')?.dataset['modalId'] ?? null;
  });
}

/**
 * Every open dialog, bottom first, by the `data-modal-z` stamp — the only durable DOM trace of
 * stack position, so asserting on it also checks the stamp is *rewritten* on reorder. Light DOM
 * only: `querySelectorAll` does not cross a shadow boundary (`vanilla/__tests__/bind-dialog.ct.tsx`).
 */
export async function paintedStackOrder(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return [...document.querySelectorAll<HTMLElement>('dialog[open]')]
      .map((dialog) => {
        return {
          id: dialog.dataset['modalId'] ?? '',
          z: Number(dialog.dataset['modalZ'] ?? '0'),
        };
      })
      .sort((a, b) => {
        return a.z - b.z;
      })
      .map((entry) => {
        return entry.id;
      });
  });
}

/**
 * Which dialog holds the focus, by id — `closest('dialog')`, not element identity, because a
 * dialog with no focus inside hears no keydown and every hotkey it declares but Escape is dead.
 */
export async function focusedDialogId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return document.activeElement?.closest('dialog')?.dataset['modalId'] ?? null;
  });
}
