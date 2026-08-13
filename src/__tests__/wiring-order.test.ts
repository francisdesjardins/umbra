import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The order each binding wires the shared lifecycle in, recorded so that changing it is a
 * decision rather than an accident.
 *
 * **Why this exists.** Every framework-free piece of this library is a decision — `canDismiss`,
 * `orderStack`, `chooseActionRunner` — and each is tested. The *sequence* those decisions are
 * asked in is a decision too, and it was the one thing written three times and asserted nowhere.
 * The bug that prompted this was one layer down: a focus policy that existed only as the order of
 * statements someone happened to write, with no name and no test, wrong for two years on an engine
 * nobody ran.
 *
 * **This file does not claim the orders should match.** They do not, and the differences are
 * recorded below rather than resolved, because resolving them without knowing whether the order
 * matters would be guessing. What it does is make any *change* to a binding's order fail until
 * someone updates the record — and count what is still unreconciled, the way the compatibility
 * matrix counts its open cells.
 *
 * **Only effect-time steps are compared, and that exclusion is load-bearing.** Source order is a
 * usable proxy for run order among React's `useEffect`s and Solid's `createEffect`s (both run in
 * declaration order) and inside vanilla's single `sync()` body. It is *not* comparable for steps
 * that run during render: React calls `getDialogAnimationStyles` in its render body, so it runs
 * before every effect while appearing last in the file. Including it produced a table that read
 * "React styles first, vanilla styles second" from evidence that said the opposite.
 */

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Steps that run from an effect — or, in vanilla, from the store subscription that stands in. */
const EFFECT_STEPS = [
  'syncOpenSequence',
  'syncLabellingDiagnostics',
  'syncCloseSequence',
  'attachDialogKeydown',
  'attachDialogCancel',
  'attachWindowDismissKey',
  'attachClickOutside',
  'attachFocusContainment',
  'focus.sync',
] as const;

const BINDINGS = {
  react: 'react/use-modal.tsx',
  solid: 'solid/use-modal.ts',
  vanilla: 'vanilla/bind-dialog.ts',
} as const;

/**
 * The order as it stands, 2026-08-13. Not an aspiration — a record.
 *
 * Updating one of these lists is the point at which someone has to say why the order moved, in
 * the commit. A binding whose order changes silently is what this prevents.
 */
const RECORDED: Readonly<Record<keyof typeof BINDINGS, readonly string[]>> = {
  react: [
    'syncOpenSequence',
    'syncLabellingDiagnostics',
    'syncCloseSequence',
    'attachDialogKeydown',
    'attachDialogCancel',
    'attachWindowDismissKey',
    'focus.sync',
    'attachFocusContainment',
    'attachClickOutside',
  ],
  solid: [
    'syncOpenSequence',
    'syncLabellingDiagnostics',
    'syncCloseSequence',
    'attachDialogKeydown',
    'attachDialogCancel',
    'attachWindowDismissKey',
    'attachFocusContainment',
    'attachClickOutside',
    'focus.sync',
  ],
  vanilla: [
    'attachDialogKeydown',
    'attachDialogCancel',
    'attachWindowDismissKey',
    'attachClickOutside',
    'attachFocusContainment',
    'syncCloseSequence',
    'focus.sync',
    'syncOpenSequence',
    'syncLabellingDiagnostics',
  ],
};

/**
 * The divergences, each with the question it leaves open.
 *
 * A `reason` here is not a justification — none of these has one yet. It is a statement of what
 * would have to be established to close the cell, which is the honest thing to write while the
 * answer is unknown.
 */
const UNRECONCILED: readonly { readonly what: string; readonly question: string }[] = [
  {
    what: 'syncOpenSequence runs first in the hook bindings and last in vanilla',
    question:
      'showModal() before or after the listeners are attached. If it matters, one of the two is wrong today; if it does not, the sequence can be shared. Nothing establishes which.',
  },
  {
    what: 'focus.sync runs before focus containment and click-outside in React, after both in Solid',
    question:
      'Whether the opening focus is settled before or after the Tab wrap is installed. The hook pair is meant to mirror file-for-file and here it does not mirror in time.',
  },
];

function orderIn(file: string): string[] {
  const source = readFileSync(resolve(srcRoot, file), 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
    .replaceAll(/\/\/[^\n]*/g, ' ')
    // Imports name every step and would swamp the real call sites.
    .replaceAll(/^import[\s\S]*?from\s+'[^']+';$/gm, ' ');

  return EFFECT_STEPS.map((step) => {
    return [source.indexOf(`${step}(`), step] as const;
  })
    .filter(([at]) => {
      return at !== -1;
    })
    .sort((a, b) => {
      return a[0] - b[0];
    })
    .map(([, step]) => {
      return step;
    });
}

test.describe('wiring order', () => {
  for (const [binding, file] of Object.entries(BINDINGS)) {
    test(`${binding} wires the lifecycle in the order this file records`, () => {
      expect(
        orderIn(file),
        `${file} changed the order it wires the shared lifecycle in. That is a decision about when showModal() runs relative to the listeners and the focus policy — update RECORDED and say why in the commit.`
      ).toEqual(RECORDED[binding as keyof typeof BINDINGS]);
    });
  }

  test('every binding wires every effect-time step', () => {
    // The comparison above is vacuous for a step a binding never calls, and a step dropped from
    // one binding is exactly the regression that would hide there.
    for (const [binding, file] of Object.entries(BINDINGS)) {
      expect(orderIn(file).length, `${binding} is missing an effect-time step`).toBe(
        EFFECT_STEPS.length
      );
    }
  });

  test('the recorded divergences are the ones that actually exist', () => {
    // Two orders differing is the finding; this keeps the count honest as the orders change.
    const distinct = new Set(
      Object.values(RECORDED).map((order) => {
        return order.join(' → ');
      })
    );
    expect(
      distinct.size,
      'The bindings agree on the order now, or disagree in a new way. Either is worth noticing: update UNRECONCILED, and if they all agree the sequence is ready to be shared.'
    ).toBe(3);
    expect(UNRECONCILED.length).toBeGreaterThan(0);
  });
});
