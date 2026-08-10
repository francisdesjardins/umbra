import { expect, test } from '@playwright/test';
import { dialogAttributes, isBackdropClick } from '../dialog-props.js';

/**
 * The attribute table both bindings spread onto their `<dialog>`.
 *
 * Worth pinning because two of these are a *contract*: `data-modal-id` and `data-modal-type` are
 * how user-land CSS reaches one dialog or every non-modal one, so renaming either breaks
 * stylesheets that never imported anything. And the aria fields must stay `undefined` rather than
 * empty — a binding that defaulted them would hide a missing accessible name from an audit.
 */

test.describe('dialogAttributes', () => {
  test('carries the styling contract and the test id', () => {
    expect(dialogAttributes({ modalId: 'settings', nonModal: false })).toMatchObject({
      'data-modal-id': 'settings',
      'data-testid': 'modal-settings',
      'data-modal-type': 'modal',
    });
  });

  test('reports the variant, which is what non-modal CSS keys off', () => {
    expect(dialogAttributes({ modalId: 'toast', nonModal: true })['data-modal-type']).toBe(
      'non-modal'
    );
  });

  test('leaves every aria field undefined when the caller named none', () => {
    const attributes = dialogAttributes({ modalId: 'unnamed', nonModal: false });

    // Not `''`: both bindings omit an attribute whose value is `undefined`, so an unnamed dialog
    // stays visibly unnamed. `aria-label=""` would satisfy an automated check and tell a screen
    // reader nothing.
    expect(attributes['aria-label']).toBeUndefined();
    expect(attributes['aria-labelledby']).toBeUndefined();
    expect(attributes['aria-describedby']).toBeUndefined();
    expect(attributes.role).toBeUndefined();
  });

  test('passes the caller’s name and role through untouched', () => {
    expect(
      dialogAttributes({
        modalId: 'confirm-delete',
        nonModal: false,
        ariaLabel: 'Delete item',
        ariaLabelledBy: 'title',
        ariaDescribedBy: 'body',
        role: 'alertdialog',
      })
    ).toMatchObject({
      'aria-label': 'Delete item',
      'aria-labelledby': 'title',
      'aria-describedby': 'body',
      role: 'alertdialog',
    });
  });
});

test.describe('isBackdropClick', () => {
  /** A dialog is a rect here, which is all the test needs it to be. */
  const dialogAt = (box: { left: number; right: number; top: number; bottom: number }) => {
    return {
      getBoundingClientRect: () => {
        return box;
      },
    };
  };

  const rect = dialogAt({ left: 100, right: 300, top: 100, bottom: 200 });
  // Real ones: Node ships `EventTarget`, so the fixture satisfies the type instead of
  // approximating it — identity is all the target test compares.
  const surface = new EventTarget();
  const inside = new EventTarget();

  test('a click that started inside the content is never a backdrop click', () => {
    // Checked before the geometry, and the order is what makes the geometry safe: anything
    // originating in the content bubbles up with a descendant as its target.
    expect(
      isBackdropClick({ target: inside, currentTarget: surface, clientX: 0, clientY: 0 }, rect)
    ).toBe(false);
  });

  test('a keyboard-activated button reports 0,0 and must not dismiss', () => {
    // The reason the target test comes first. `clientX`/`clientY` of 0 lies outside a centred
    // dialog's rect, so on geometry alone Enter on a button would read as a backdrop click.
    expect(
      isBackdropClick({ target: inside, currentTarget: surface, clientX: 0, clientY: 0 }, rect)
    ).toBe(false);
  });

  test('a click on the dialog itself, outside its box, is the backdrop', () => {
    const outside = [
      { clientX: 99, clientY: 150 },
      { clientX: 301, clientY: 150 },
      { clientX: 200, clientY: 99 },
      { clientX: 200, clientY: 201 },
    ];

    for (const point of outside) {
      expect(
        isBackdropClick({ target: surface, currentTarget: surface, ...point }, rect),
        `${String(point.clientX)},${String(point.clientY)} is outside the box`
      ).toBe(true);
    }
  });

  test('a click on the dialog itself, inside its box, is not', () => {
    // The dialog's box can extend past the panel a user sees — padding, a template's sizing — so
    // targeting the element is not on its own enough.
    expect(
      isBackdropClick({ target: surface, currentTarget: surface, clientX: 200, clientY: 150 }, rect)
    ).toBe(false);
  });

  test('the edges belong to the dialog, not to the backdrop', () => {
    for (const point of [
      { clientX: 100, clientY: 150 },
      { clientX: 300, clientY: 150 },
      { clientX: 200, clientY: 100 },
      { clientX: 200, clientY: 200 },
    ]) {
      expect(
        isBackdropClick({ target: surface, currentTarget: surface, ...point }, rect),
        `${String(point.clientX)},${String(point.clientY)} is on the edge`
      ).toBe(false);
    }
  });
});
