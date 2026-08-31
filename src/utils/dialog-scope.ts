/**
 * Scoping a query to one dialog's *own* content. Nested `<dialog>` elements are the normal shape
 * here: a dialog in the top layer swallows every click outside itself, so the documented way to open
 * a second dialog puts it in the first's subtree — and a plain `querySelector` on the outer dialog
 * would reach into the inner one.
 *
 * **A DOM module among pure ones, deliberately.** The folder rule here is framework-free rather
 * than DOM-free, and `isOwnEventTarget` is a root export with a public example — the predicate a
 * caller writing their own keydown needs. `core/` would tidy the taxonomy and unblock nothing: all
 * three exports reach for `querySelectorAll`, so this file sits on `.c8rc.json`'s DOM-only list
 * wherever it lives.
 */

/**
 * The first element matching `selector` that belongs to `dialog` itself, not to a nested one.
 *
 * @internal
 */
export function queryOwn(dialog: HTMLElement, selector: string): HTMLElement | null {
  for (const element of dialog.querySelectorAll<HTMLElement>(selector)) {
    if (element.closest('dialog') === dialog) {
      return element;
    }
  }
  return null;
}

/**
 * {@link queryOwn}'s plural, in document order — for the focus scan, which walks candidates until
 * one takes focus. Here rather than a filter at that call site, since a second copy of the rule is
 * how the two drift.
 *
 * @internal
 */
export function queryAllOwn(dialog: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    return element.closest('dialog') === dialog;
  });
}

/**
 * Whether an event raised at `target` belongs to `dialog` rather than to a dialog nested inside it.
 * A keydown in a nested dialog bubbles through its ancestors, so without this the dialog underneath
 * answers keys pressed in the dialog above it. Public because a control a caller places inside a
 * `<dialog>` may bind a key there too, and needs the same rule rather than a second copy of it.
 *
 * @example
 * ```ts
 * dialog.addEventListener('keydown', (event) => {
 *   if (!isOwnEventTarget(dialog, event.target)) {
 *     return;
 *   }
 *   // …the press belongs to this dialog rather than to one stacked above it.
 * });
 * ```
 */
export function isOwnEventTarget(dialog: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    // Nothing to attribute it to (the document, a detached node): treat it as the dialog's own,
    // which is what a listener on the dialog would have assumed anyway.
    return true;
  }
  const owner = target.closest('dialog');
  return owner === null || owner === dialog;
}
