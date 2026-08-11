/**
 * What goes on the `<dialog>` element, as data — the attributes, and the one question a backdrop
 * click asks.
 *
 * A binding builds the element; it should not also be deciding what `data-modal-type` is called
 * or re-deriving when a click counts as a backdrop click. Both are answers, and a second binding
 * that answered them slightly differently would break the styling contract for one of them.
 */

/** What a binding knows about the dialog it is about to render. */
export type DialogAttributeOptions = {
  readonly modalId: string;
  readonly nonModal: boolean;
  /**
   * Whether `prepare` is still running. Required rather than optional: a binding that forgot it
   * would ship a dialog permanently announcing itself as loaded, and the omission would be
   * invisible — so it is a compile error instead.
   */
  readonly isPreparing: boolean;
  readonly ariaLabel?: string | undefined;
  readonly ariaLabelledBy?: string | undefined;
  readonly ariaDescribedBy?: string | undefined;
  readonly role?: 'dialog' | 'alertdialog' | undefined;
};

/**
 * The attribute set for a `<dialog>`, spreadable onto it in any binding.
 *
 * `data-modal-id` and `data-modal-type` are the styling contract — how user-land CSS reaches one
 * dialog, or every non-modal one, without knowing anything about the tree it renders in.
 * `data-testid` is for tests and is deliberately *not* documented as a styling hook.
 */
export type DialogAttributes = {
  readonly 'data-modal-id': string;
  readonly 'data-testid': string;
  readonly 'data-modal-type': 'modal' | 'non-modal';
  readonly 'aria-busy': 'true' | 'false';
  readonly 'aria-label': string | undefined;
  readonly 'aria-labelledby': string | undefined;
  readonly 'aria-describedby': string | undefined;
  readonly role: 'dialog' | 'alertdialog' | undefined;
};

/**
 * Build the `<dialog>`'s attributes.
 *
 * The accessible name and the role are the caller's: nothing here knows what this dialog is for.
 * Each is left `undefined` when absent rather than defaulted — both React and Solid omit an
 * attribute whose value is `undefined`, so an unnamed dialog stays visibly unnamed to an audit
 * instead of quietly carrying `aria-label=""`.
 *
 * `aria-busy` is the opposite case and is always given a value, `'false'` included. It is the one
 * attribute here the library owns outright rather than relays, and it *toggles* — a dialog on
 * screen while `prepare` runs is the documented normal state of a loading modal, and the state it
 * leaves. Absence cannot express the off half, since {@link setDialogAttributes} skips `undefined`
 * rather than removing, so the value that means "done" has to be written.
 */
export function dialogAttributes(options: DialogAttributeOptions): DialogAttributes {
  const { modalId, nonModal, isPreparing, ariaLabel, ariaLabelledBy, ariaDescribedBy, role } =
    options;

  return {
    'data-modal-id': modalId,
    'data-testid': `modal-${modalId}`,
    'data-modal-type': nonModal ? 'non-modal' : 'modal',
    'aria-busy': isPreparing ? 'true' : 'false',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    role,
  };
}

/**
 * The part of an element writing attributes needs.
 *
 * Narrowed for the reason `StyleTarget` is: this writes through `setAttribute` and nothing else,
 * so asking for an `HTMLDialogElement` would make a DOM *type* into a DOM *dependency* and put the
 * whole attribute table out of the unit project's reach for no benefit.
 */
export type AttributeTarget = Pick<Element, 'setAttribute'>;

/**
 * Write the table onto a `<dialog>` — what a binding that owns its element does instead of the
 * spread a renderer does.
 *
 * **`undefined` is skipped, never removed**, and that is a contract rather than an optimisation:
 * `undefined` here means *the caller named nothing*, and in `umbra/vanilla` the element is the
 * caller's own markup — an `aria-labelledby` they wrote must survive an option they never passed.
 */
export function setDialogAttributes(element: AttributeTarget, attributes: DialogAttributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      element.setAttribute(name, value);
    }
  }
}

/**
 * The wrapper every dialog's content sits in.
 *
 * It deliberately does **not** stop click propagation: the backdrop test below identifies a real
 * backdrop click by its target, so swallowing content clicks here would only rob user-land
 * ancestors of events they should see.
 */
export const DIALOG_CONTENT_STYLE = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
} as const;

/**
 * The part of a click a backdrop test needs.
 *
 * Structural rather than a `MouseEvent`, for the reason {@link ActionClickEvent} is: React hands
 * its synthetic event, Solid hands the native one, and both satisfy this.
 */
export type BackdropClickEvent = {
  readonly target: EventTarget | null;
  readonly currentTarget: EventTarget | null;
  readonly clientX: number;
  readonly clientY: number;
};

/**
 * The part of a dialog a backdrop test needs.
 *
 * Structural for the reason {@link BackdropClickEvent} is, and it buys the same two things: a
 * binding that hands something else rect-shaped is served, and the test for this can be written
 * in Node — the geometry is arithmetic, and requiring a real `<dialog>` to assert it was the only
 * thing making it a browser question.
 */
export type BackdropDialog = {
  readonly getBoundingClientRect: () => {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
};

/**
 * Whether this click landed on the backdrop rather than in the dialog.
 *
 * Two questions, and the order matters. A real backdrop click targets the `<dialog>` itself;
 * anything originating in the content bubbles up with a descendant as its target. Checking that
 * first is what makes the coordinate test safe — a keyboard-activated button dispatches a click
 * with `clientX`/`clientY` of 0, which lies outside a centred dialog's rect and would otherwise
 * read as a backdrop click and dismiss the modal.
 *
 * The coordinate test is still needed after it: the dialog's own box can extend past its content
 * (padding, a template's sizing), so a click on the element is not necessarily a click outside
 * the panel the user sees.
 */
export function isBackdropClick(event: BackdropClickEvent, dialog: BackdropDialog): boolean {
  if (event.target !== event.currentTarget) {
    return false;
  }

  const rect = dialog.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}
