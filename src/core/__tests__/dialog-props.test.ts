import { expect, test } from '@playwright/test';
import { dialogAttributes, isBackdropClick, setDialogAttributes } from '../dialog-props.js';

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
    expect(
      dialogAttributes({ modalId: 'settings', nonModal: false, isPreparing: false })
    ).toMatchObject({
      'data-modal-id': 'settings',
      'data-testid': 'modal-settings',
      'data-modal-type': 'modal',
    });
  });

  test('reports the variant, which is what non-modal CSS keys off', () => {
    expect(
      dialogAttributes({ modalId: 'toast', nonModal: true, isPreparing: false })['data-modal-type']
    ).toBe('non-modal');
  });

  test('says whether the dialog is still loading, in both directions', () => {
    // The one attribute here the library owns outright, and the one that toggles: a dialog on
    // screen while `prepare` runs is the normal state of a loading modal, and so is the state it
    // leaves. `'false'` is written rather than omitted because `setDialogAttributes` skips
    // `undefined` — the off half has to be a value or it could never be reached.
    expect(
      dialogAttributes({ modalId: 'slow', nonModal: false, isPreparing: true })['aria-busy']
    ).toBe('true');
    expect(
      dialogAttributes({ modalId: 'slow', nonModal: false, isPreparing: false })['aria-busy']
    ).toBe('false');
  });

  test('leaves every aria field undefined when the caller named none', () => {
    const attributes = dialogAttributes({
      modalId: 'unnamed',
      nonModal: false,
      isPreparing: false,
    });

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
        isPreparing: false,
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

test.describe('setDialogAttributes', () => {
  /**
   * An element is a `setAttribute` here, which is all the function asks for — the reason its
   * parameter is narrowed, and the reason this is a unit test and not a browser one.
   */
  const recorder = () => {
    const written = new Map<string, string>();
    return {
      written,
      setAttribute(name: string, value: string) {
        written.set(name, value);
      },
    };
  };

  test('writes the table onto the element', () => {
    const element = recorder();
    setDialogAttributes(
      element,
      dialogAttributes({ modalId: 'settings', nonModal: true, isPreparing: true })
    );

    expect(element.written.get('data-modal-id')).toBe('settings');
    expect(element.written.get('data-testid')).toBe('modal-settings');
    expect(element.written.get('data-modal-type')).toBe('non-modal');
    expect(element.written.get('aria-busy')).toBe('true');
  });

  test('skips what the caller named nothing for, rather than emptying it', () => {
    // The reason this is a contract and not an optimisation: in `umbra/vanilla` the element is the
    // caller's own markup, so an `aria-labelledby` they wrote must survive an option they never
    // passed. Writing `''` — or removing — would erase it.
    const element = recorder();
    setDialogAttributes(
      element,
      dialogAttributes({ modalId: 'unnamed', nonModal: false, isPreparing: false })
    );

    expect(element.written.has('aria-label')).toBe(false);
    expect(element.written.has('aria-labelledby')).toBe(false);
    expect(element.written.has('aria-describedby')).toBe(false);
    expect(element.written.has('role')).toBe(false);
  });

  test('writes aria-busy even when it is false', () => {
    // Which is the half the skip above would otherwise swallow: a dialog that finished loading
    // would keep `aria-busy="true"` welded to it.
    const element = recorder();
    setDialogAttributes(
      element,
      dialogAttributes({ modalId: 'done', nonModal: false, isPreparing: false })
    );

    expect(element.written.get('aria-busy')).toBe('false');
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
