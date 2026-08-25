import { expect, test } from '@playwright/test';
import { dialogAttributes, isBackdropClick, setDialogAttributes } from '../dialog-props.js';

// The attribute table both bindings spread onto their `<dialog>`. `data-dialog-id` and
// `data-dialog-type` are a *contract* — user-land CSS reaches dialogs through them. The aria fields
// stay `undefined` rather than empty, or a binding would hide a missing name from an audit.

test.describe('dialogAttributes', () => {
  test('carries the styling contract and the test id', () => {
    expect(
      dialogAttributes({ dialogId: 'settings', nonModal: false, isPreparing: false })
    ).toMatchObject({
      'data-dialog-id': 'settings',
      'data-testid': 'dialog-settings',
      'data-dialog-type': 'dialog',
    });
  });

  test('reports the variant, which is what non-modal CSS keys off', () => {
    expect(
      dialogAttributes({ dialogId: 'toast', nonModal: true, isPreparing: false })[
        'data-dialog-type'
      ]
    ).toBe('non-modal');
  });

  test('says whether the dialog is still loading, and says it both ways', () => {
    // The one attribute the library owns outright, and the one that toggles. `'false'` is written
    // rather than omitted because `setDialogAttributes` skips `undefined`.
    expect(
      dialogAttributes({ dialogId: 'slow', nonModal: false, isPreparing: true })['aria-busy']
    ).toBe('true');
    expect(
      dialogAttributes({ dialogId: 'slow', nonModal: false, isPreparing: false })['aria-busy']
    ).toBe('false');
  });

  test('leaves every aria field undefined when the caller named none', () => {
    const attributes = dialogAttributes({
      dialogId: 'unnamed',
      nonModal: false,
      isPreparing: false,
    });

    // Not `''`: both bindings omit an `undefined` attribute, so an unnamed dialog stays visibly
    // unnamed. `aria-label=""` satisfies an automated check and tells a screen reader nothing.
    expect(attributes['aria-label']).toBeUndefined();
    expect(attributes['aria-labelledby']).toBeUndefined();
    expect(attributes['aria-describedby']).toBeUndefined();
    expect(attributes.role).toBeUndefined();
  });

  test('passes the caller’s name and role through untouched', () => {
    expect(
      dialogAttributes({
        dialogId: 'confirm-delete',
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
  // A `setAttribute` is all the function asks for — why the parameter is narrowed, and a unit test.
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
      dialogAttributes({ dialogId: 'settings', nonModal: true, isPreparing: true })
    );

    expect(element.written.get('data-dialog-id')).toBe('settings');
    expect(element.written.get('data-testid')).toBe('dialog-settings');
    expect(element.written.get('data-dialog-type')).toBe('non-modal');
    expect(element.written.get('aria-busy')).toBe('true');
  });

  test('skips what the caller named nothing for, rather than emptying it', () => {
    // A contract, not an optimisation: in `umbra/vanilla` the element is the caller's own markup,
    // so an `aria-labelledby` they wrote must survive an option they never passed.
    const element = recorder();
    setDialogAttributes(
      element,
      dialogAttributes({ dialogId: 'unnamed', nonModal: false, isPreparing: false })
    );

    expect(element.written.has('aria-label')).toBe(false);
    expect(element.written.has('aria-labelledby')).toBe(false);
    expect(element.written.has('aria-describedby')).toBe(false);
    expect(element.written.has('role')).toBe(false);
  });

  test('writes aria-busy even when it is false', () => {
    // The half the skip above would swallow: a loaded dialog keeping `aria-busy="true"` welded on.
    const element = recorder();
    setDialogAttributes(
      element,
      dialogAttributes({ dialogId: 'done', nonModal: false, isPreparing: false })
    );

    expect(element.written.get('aria-busy')).toBe('false');
  });
});

test.describe('isBackdropClick', () => {
  const dialogAt = (box: { left: number; right: number; top: number; bottom: number }) => {
    return {
      getBoundingClientRect: () => {
        return box;
      },
    };
  };

  const rect = dialogAt({ left: 100, right: 300, top: 100, bottom: 200 });
  // Real ones: Node ships `EventTarget`, and identity is all the target test compares.
  const surface = new EventTarget();
  const inside = new EventTarget();

  test('a click that started inside the content is never a backdrop click', () => {
    // Checked before the geometry: anything from the content bubbles up with a descendant target.
    expect(
      isBackdropClick({ target: inside, currentTarget: surface, clientX: 0, clientY: 0 }, rect)
    ).toBe(false);
  });

  test('a keyboard-activated button reports 0,0 and must not dismiss', () => {
    // Why the target test comes first: 0,0 lies outside a centred dialog's rect, so on geometry
    // alone Enter on a button would read as a backdrop click.
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
    // The box can extend past the panel a user sees, so targeting the element is not enough.
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
