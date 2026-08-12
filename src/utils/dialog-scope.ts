/**
 * Scoping a query to one dialog's *own* content.
 *
 * Nested `<dialog>` elements are the normal shape here, not an exotic one: a modal in the top
 * layer swallows every click outside itself, so the documented way to open a second modal is to
 * do it from inside the first one's `render` — which puts the second dialog in the first one's
 * subtree. A plain `querySelector` on the outer dialog therefore reaches into the inner one, and
 * the outer modal starts acting on a button that belongs to the modal above it.
 */

/**
 * The first element matching `selector` that belongs to `dialog` itself rather than to a dialog
 * nested inside it.
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
 * Whether an event raised at `target` belongs to `dialog` rather than to a dialog nested inside
 * it. A keydown in a nested dialog bubbles through its ancestors, so without this the modal
 * underneath answers to keys pressed in the modal above it.
 *
 * Public because the library's own listeners are not the only ones on a `<dialog>`: a control
 * placed inside one by its caller may bind a key there too, and it needs the same rule rather
 * than a second copy of it.
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
    // No element to attribute it to (the document, a detached node): treat it as the dialog's
    // own, which is what a listener on the dialog would otherwise have assumed anyway.
    return true;
  }
  const owner = target.closest('dialog');
  return owner === null || owner === dialog;
}
