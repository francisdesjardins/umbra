import { expect, test } from '@playwright/test';
import { dialogAttributes } from '../dialog-props.js';

/**
 * The attribute table both bindings spread onto their `<dialog>`.
 *
 * Worth pinning because two of these are a *contract*: `data-modal-id` and `data-modal-type` are
 * how user-land CSS reaches one dialog or every non-blocking one, so renaming either breaks
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
