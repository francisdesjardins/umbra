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
  readonly ariaLabel?: string | undefined;
  readonly ariaLabelledBy?: string | undefined;
  readonly ariaDescribedBy?: string | undefined;
  readonly role?: 'dialog' | 'alertdialog' | undefined;
};

/**
 * The attribute set for a `<dialog>`, spreadable onto it in any binding.
 *
 * `data-modal-id` and `data-modal-type` are the styling contract — how user-land CSS reaches one
 * dialog, or every non-blocking one, without knowing anything about the tree it renders in.
 * `data-testid` is for tests and is deliberately *not* documented as a styling hook.
 */
export type DialogAttributes = {
  readonly 'data-modal-id': string;
  readonly 'data-testid': string;
  readonly 'data-modal-type': 'modal' | 'non-modal';
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
 */
export function dialogAttributes(options: DialogAttributeOptions): DialogAttributes {
  const { modalId, nonModal, ariaLabel, ariaLabelledBy, ariaDescribedBy, role } = options;

  return {
    'data-modal-id': modalId,
    'data-testid': `modal-${modalId}`,
    'data-modal-type': nonModal ? 'non-modal' : 'modal',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    role,
  };
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
export function isBackdropClick(event: BackdropClickEvent, dialog: HTMLDialogElement): boolean {
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
