/**
 * What a dialog's self-description is missing, as data.
 *
 * Every finding here is unambiguously broken — that is the bar for being one. A reference that
 * resolves to nothing is the failure mode of writing `aria-labelledby` by hand: the attribute is
 * there, the element is not, and the dialog stays anonymous *while looking named* — invisible to
 * a type, to a linter, and to a reading of the source. A dialog with no name at all is the defect
 * the option docs already call the commonest in a dialog implementation. And `role="alertdialog"`
 * on a **non-modal** dialog contradicts itself for assistive technology: an alertdialog is modal
 * by definition (the APG requires `aria-modal`), and the hook bindings' option type refuses the
 * pair — this is the same refusal for the markup `umbra/vanilla` cannot type-check.
 *
 * **There is deliberately nothing about `alertdialog` and its description.** That pairing is a
 * strong recommendation with a documented exception — WAI-ARIA Practices: *"It is advisable to
 * omit specifying `aria-describedby` if the dialog content includes semantic structures, such as
 * lists, tables, or multiple paragraphs, that need to be perceived in order to easily understand
 * the content."* Warning on the omission would push people toward the pattern the spec tells them
 * to avoid, which is worse than saying nothing — where the modality contradiction above is
 * unconditional, which is what lets it be a finding.
 */

/**
 * The attributes as they are **on the element**, not as they were passed as options.
 *
 * That distinction is the whole reason this takes strings rather than `UseModalOptions`: in
 * `umbra/vanilla` the `<dialog>` is the caller's own markup, and `setDialogAttributes` skips
 * `undefined` precisely so an `aria-labelledby` they wrote by hand survives an option they never
 * passed. Reading the options there would report a perfectly named dialog as anonymous, and miss
 * the ones that really are.
 */
export type LabellingAttributes = {
  readonly label: string | null;
  readonly labelledBy: string | null;
  readonly describedBy: string | null;
  /** The `role` attribute as written on the element, `null` when absent. */
  readonly role: string | null;
  /** Read off `data-modal-type`, so the caller's markup answers rather than the options. */
  readonly nonModal: boolean;
};

/**
 * Split an IDREFS attribute the way the platform does.
 *
 * `aria-labelledby` takes a **space-delimited list**, and the option's `string` type permits one.
 * Checking the raw value as a single id would call every multi-target reference broken.
 */
function idsOf(value: string | null): readonly string[] {
  if (value === null) {
    return [];
  }
  return value.split(/\s+/).filter((id) => {
    return id.length > 0;
  });
}

/**
 * What is wrong with this dialog's labelling, if anything.
 *
 * `resolves` is a callback rather than a `Document` for the reason `BackdropDialog` and
 * `StyleTarget` are narrowed: a DOM type in a signature is not a DOM dependency, and injecting the
 * lookup is what keeps the rule — the IDREFS splitting included — testable without a browser.
 *
 * @returns One message per problem, empty when there is nothing to say.
 *
 * @example
 * findLabellingProblems(
 *   { label: null, labelledBy: 'confirm-title', describedBy: null, role: null, nonModal: false },
 *   (id) => document.getElementById(id) !== null
 * );
 */
export function findLabellingProblems(
  attributes: LabellingAttributes,
  resolves: (id: string) => boolean
): readonly string[] {
  const { label, labelledBy, describedBy } = attributes;
  const problems: string[] = [];
  let nameIsBroken = false;

  for (const [attribute, value] of [
    ['aria-labelledby', labelledBy],
    ['aria-describedby', describedBy],
  ] as const) {
    const dangling = idsOf(value).filter((id) => {
      return !resolves(id);
    });
    if (dangling.length > 0) {
      problems.push(`${attribute} points at no element: ${dangling.join(', ')}`);
      nameIsBroken ||= attribute === 'aria-labelledby';
    }
  }

  // Whether the element *ends up* named, not whether an attribute is present: an empty
  // `aria-label`, or an `aria-labelledby` whose ids resolve to nothing, leaves the dialog exactly
  // as anonymous as writing neither — and `aria-label=""` is the spelling that hides the omission
  // from an audit, which is why the option surface refuses to emit it in the first place.
  const named =
    (label !== null && label.trim() !== '') ||
    idsOf(labelledBy).some((id) => {
      return resolves(id);
    });

  // Not said on top of a dangling `aria-labelledby`: that message is already the reason the name
  // is missing, and it is the one that says what to fix.
  if (!named && !nameIsBroken) {
    problems.push('no accessible name — screen readers announce it as just "dialog"');
  }

  if (attributes.role === 'alertdialog' && attributes.nonModal) {
    problems.push(
      'role="alertdialog" on a non-modal dialog — an alertdialog is modal by definition; a non-modal surface with something urgent to say wants a live region inside its content'
    );
  }

  return problems;
}
