import { expect, test } from '@playwright/test';
import { findLabellingProblems } from '../dialog-labelling.js';

/**
 * The rule behind the runtime diagnostic, asserted without a browser.
 *
 * Worth pinning here rather than only through a component test, because two of these are
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

test.describe('findLabellingProblems', () => {
  test('says nothing about a dialog whose reference resolves', () => {
    expect(
      findLabellingProblems(
        { label: null, labelledBy: 'confirm-title', describedBy: null },
        resolver('confirm-title')
      )
    ).toEqual([]);
  });

  test('says nothing about a dialog named by a string', () => {
    // `aria-label` has no id to resolve, so there is nothing here that can be broken.
    expect(
      findLabellingProblems(
        { label: 'Delete item', labelledBy: null, describedBy: null },
        resolver()
      )
    ).toEqual([]);
  });

  test('reports a reference that points at no element', () => {
    // The failure mode this whole diagnostic exists for: the attribute is written, the element is
    // not, and the dialog is anonymous while looking named.
    const problems = findLabellingProblems(
      { label: null, labelledBy: 'confirm-title', describedBy: null },
      resolver()
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('aria-labelledby');
    expect(problems[0]).toContain('confirm-title');
  });

  test('reports a dangling description separately from the name', () => {
    const problems = findLabellingProblems(
      { label: 'Delete item', labelledBy: null, describedBy: 'confirm-body' },
      resolver()
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('aria-describedby');
  });

  test('checks a space-delimited list element by element', () => {
    // `aria-labelledby` takes IDREFS, which the option's `string` type permits. Treating the value
    // as one id would call every multi-target reference broken.
    const problems = findLabellingProblems(
      { label: null, labelledBy: 'brand  heading missing', describedBy: null },
      resolver('brand', 'heading')
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('missing');
    expect(problems[0]).not.toContain('heading');
  });

  test('reports a dialog with no accessible name at all', () => {
    const problems = findLabellingProblems(
      { label: null, labelledBy: null, describedBy: 'body' },
      resolver('body')
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('no accessible name');
  });

  test('does not add the missing-name finding on top of a broken reference', () => {
    // Both are true at once here, and saying so twice helps nobody: the dangling reference is
    // already the reason the name is missing, and it is the one that says what to fix.
    const problems = findLabellingProblems(
      { label: null, labelledBy: 'gone', describedBy: null },
      resolver()
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('aria-labelledby');
  });
});

test.describe('what it deliberately stays quiet about', () => {
  test('an alertdialog with no description is not a finding', () => {
    // Deliberate, and it must stay that way. WAI-ARIA Practices: "It is advisable to omit
    // specifying aria-describedby if the dialog content includes semantic structures, such as
    // lists, tables, or multiple paragraphs, that need to be perceived in order to easily
    // understand the content." Warning here would push people toward the pattern the spec tells
    // them to avoid — which is why `role` is not even an input to this function.
    expect(
      findLabellingProblems(
        { label: 'Deployment failed', labelledBy: null, describedBy: null },
        resolver()
      )
    ).toEqual([]);
  });

  test('an empty attribute is treated as absent rather than as a broken reference', () => {
    // `aria-labelledby=""` carries no id, so there is nothing to resolve. It still leaves the
    // dialog unnamed, which is the finding that does fire.
    const problems = findLabellingProblems(
      { label: null, labelledBy: '  ', describedBy: null },
      resolver()
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('no accessible name');
  });
});
