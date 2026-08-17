import { expect, test } from '@playwright/test';
import { findLabellingProblems } from '../dialog-labelling.js';

/**
 * The rule behind the runtime diagnostic, asserted without a browser.
 *
 * Worth pinning here rather than only through a component test, because several of these are
 * *non*-findings — cases the check must stay quiet about — and a guard that only ever fires would
 * pass a suite made of positive cases while warning on every correct dialog in the world.
 */

/** Resolution as a set: whatever is in here exists, everything else does not. */
const resolver = (...present: string[]) => {
  const ids = new Set(present);
  return (id: string) => {
    return ids.has(id);
  };
};

/** The quiet parts of the input, so each test states only the fact it is about. */
const attributes = (
  overrides: Partial<Parameters<typeof findLabellingProblems>[0]>
): Parameters<typeof findLabellingProblems>[0] => {
  return {
    label: null,
    labelledBy: null,
    describedBy: null,
    role: null,
    nonModal: false,
    ...overrides,
  };
};

test.describe('findLabellingProblems', () => {
  test('says nothing about a dialog whose reference resolves', () => {
    expect(
      findLabellingProblems(attributes({ labelledBy: 'confirm-title' }), resolver('confirm-title'))
    ).toEqual([]);
  });

  test('says nothing about a dialog named by a string', () => {
    // `aria-label` has no id to resolve, so there is nothing here that can be broken.
    expect(findLabellingProblems(attributes({ label: 'Delete item' }), resolver())).toEqual([]);
  });

  test('reports a reference that points at no element', () => {
    // The failure mode this whole diagnostic exists for: the attribute is written, the element is
    // not, and the dialog is anonymous while looking named.
    const problems = findLabellingProblems(attributes({ labelledBy: 'confirm-title' }), resolver());

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('aria-labelledby');
    expect(problems[0]).toContain('confirm-title');
  });

  test('reports a dangling description separately from the name', () => {
    const problems = findLabellingProblems(
      attributes({ label: 'Delete item', describedBy: 'confirm-body' }),
      resolver()
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('aria-describedby');
  });

  test('checks a space-delimited list element by element', () => {
    // `aria-labelledby` takes IDREFS, which the option's `string` type permits. Treating the value
    // as one id would call every multi-target reference broken.
    const problems = findLabellingProblems(
      attributes({ labelledBy: 'brand  heading missing' }),
      resolver('brand', 'heading')
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('missing');
    expect(problems[0]).not.toContain('heading');
  });

  test('reports a dialog with no accessible name at all', () => {
    const problems = findLabellingProblems(attributes({ describedBy: 'body' }), resolver('body'));

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('no accessible name');
  });

  test('does not add the missing-name finding on top of a broken reference', () => {
    // Both are true at once here, and saying so twice helps nobody: the dangling reference is
    // already the reason the name is missing, and it is the one that says what to fix.
    const problems = findLabellingProblems(attributes({ labelledBy: 'gone' }), resolver());

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('aria-labelledby');
  });

  test('reports an alertdialog on a non-modal dialog', () => {
    // The contradiction the hook bindings reject at the type level, caught here for the markup
    // `umbra/vanilla` cannot type-check: an alertdialog is modal by definition, and announcing one
    // over content the user can still reach contradicts itself for assistive technology.
    const problems = findLabellingProblems(
      attributes({ label: 'Deployment failed', role: 'alertdialog', nonModal: true }),
      resolver()
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('alertdialog');
    expect(problems[0]).toContain('non-modal');
  });
});

test.describe('what it deliberately stays quiet about', () => {
  test('an alertdialog with no description is not a finding', () => {
    // Deliberate, and it must stay that way. WAI-ARIA Practices: "It is advisable to omit
    // specifying aria-describedby if the dialog content includes semantic structures, such as
    // lists, tables, or multiple paragraphs, that need to be perceived in order to easily
    // understand the content." Warning here would push people toward the pattern the spec tells
    // them to avoid — where the modality contradiction is unconditional, this one is not.
    expect(
      findLabellingProblems(
        attributes({ label: 'Deployment failed', role: 'alertdialog' }),
        resolver()
      )
    ).toEqual([]);
  });

  test('a non-modal dialog with the ordinary role is not a finding', () => {
    // The role that agrees with `show()` — only the alertdialog pairing contradicts the variant.
    expect(
      findLabellingProblems(
        attributes({ label: 'Filters', role: 'dialog', nonModal: true }),
        resolver()
      )
    ).toEqual([]);
  });

  test('an empty attribute is treated as absent rather than as a broken reference', () => {
    // `aria-labelledby=""` carries no id, so there is nothing to resolve. It still leaves the
    // dialog unnamed, which is the finding that does fire.
    const problems = findLabellingProblems(attributes({ labelledBy: '  ' }), resolver());

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('no accessible name');
  });
});
