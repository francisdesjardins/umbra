import type { Page } from '@playwright/test';

/**
 * Asking the page which dialog is really in front.
 *
 * Shared because three suites need the same two questions — the React stack tests, the vanilla
 * shadow-root ones, and the Solid one — and a probe copied three times is a probe that drifts three
 * ways. It lives here for the reason `story-styles.ts` does: a helper several folders' tests use
 * belongs to none of them.
 *
 * Both functions ask the **DOM**, deliberately, and that is the whole point of having them. The
 * manager's own `openDialogs` would answer faster and would answer about its own bookkeeping; these
 * two answer about what was painted. The mechanism under test is `close()` + `showModal()` — the top
 * layer paints in the order elements were added and `z-index` does not apply between its members —
 * so a suite that read the snapshot would pass over a library that stamped a number and moved
 * nothing on screen.
 */

/**
 * The dialog under the centre of the viewport — the same question a mouse asks.
 *
 * `elementFromPoint` rather than a computed style or a stacking calculation: it is hit testing, so it
 * accounts for the top layer the way a click does. Harnesses that use this size their dialogs so they
 * overlap at the centre; two dialogs that do not overlap make this answer nothing useful.
 *
 * @returns the `data-modal-id` of the front dialog, or `null` when the centre is not over one.
 */
export async function frontDialogId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return hit?.closest('dialog')?.dataset['modalId'] ?? null;
  });
}

/**
 * Every open dialog, bottom of the stack first, as the DOM records it.
 *
 * Ordered by the `data-modal-z` the library stamps, which is the only durable trace of a dialog's
 * stack position in the DOM — and asserting on it is also what checks that the stamp is *rewritten*
 * when the order changes, rather than left at whatever it was when that dialog opened.
 *
 * Light DOM only: `querySelectorAll` does not cross a shadow boundary, so a suite with a dialog in
 * one asks about that dialog through its own root — see the shadow-root tests in
 * `vanilla/__tests__/bind-dialog.ct.tsx`.
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
 * Which dialog holds the focus, by id.
 *
 * `closest('dialog')` rather than an element identity, because the useful question across a stack is
 * *whose* keyboard it is: a modal dialog with no focus inside it hears no keydown, so every hotkey it
 * declares except Escape is dead.
 */
export async function focusedDialogId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return document.activeElement?.closest('dialog')?.dataset['modalId'] ?? null;
  });
}
