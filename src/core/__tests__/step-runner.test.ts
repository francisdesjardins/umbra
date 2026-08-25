import { expect, test } from '@playwright/test';
import { noop } from '../../__tests__/noop.js';
import { createStepRunner, sameInputs, type SyncStep } from '../step-runner.js';

// The lifecycle executor, against a table that records instead of touching the DOM — which is what
// these assertions needed: inside `createDialogDirector` the only table is real `<dialog>`s, so a
// listener order that quietly changes and a modal inert after a remount were prose, not tests.

type Log = string[];

/** A step that records itself. `reads` names the one pass field its `inputs` looks at. */
function step(
  name: string,
  spec: { readonly reads: string | null; readonly log: Log }
): SyncStep<Record<string, unknown>, string> {
  const { reads, log } = spec;
  return {
    inputs:
      reads === null
        ? null
        : (pass) => {
            return [pass[reads]];
          },
    run: (context, _pass) => {
      log.push(`attach:${name}:${context}`);
      return () => {
        log.push(`detach:${name}`);
      };
    },
  };
}

test.describe('sameInputs', () => {
  test('the first pass is never unchanged', () => {
    expect(sameInputs(undefined, [])).toBe(false);
    expect(sameInputs(undefined, [1])).toBe(false);
  });

  test('same length and Object.is on every element', () => {
    const shared = {};
    expect(sameInputs([1, 'a', shared], [1, 'a', shared])).toBe(true);
    expect(sameInputs([1, 'a', shared], [1, 'a', {}])).toBe(false);
  });

  test('length alone can differ, and two empties are unchanged', () => {
    expect(sameInputs([1], [1, 2])).toBe(false);
    expect(sameInputs([1, 2], [1])).toBe(false);
    expect(sameInputs([], [])).toBe(true);
  });

  test('two functions that do the same thing are two inputs', () => {
    // The hazard the per-step design exists for: an inline arrow is a fresh identity every render,
    // so any step listing one is rebuilt every render — see `dialog-director.ts`.
    const fn = () => {
      return undefined;
    };
    expect(sameInputs([fn], [fn])).toBe(true);
    expect(
      sameInputs(
        [fn],
        [
          () => {
            return undefined;
          },
        ]
      )
    ).toBe(false);
  });

  test('NaN is unchanged, +0 and -0 are not', () => {
    expect(sameInputs([Number.NaN], [Number.NaN])).toBe(true);
    expect(sameInputs([0], [-0])).toBe(false);
  });
});

test.describe('the first pass', () => {
  test('attaches every step, in the table’s order', () => {
    const log: Log = [];
    const runner = createStepRunner(
      [step('a', { reads: 'x', log }), step('b', { reads: 'y', log })],
      () => {
        return 'ctx';
      }
    );

    runner.sync({ x: 1, y: 1 });

    expect(log).toEqual(['attach:a:ctx', 'attach:b:ctx']);
  });

  test('a step whose inputs are empty still attaches — empty is not unchanged', () => {
    const log: Log = [];
    const runner = createStepRunner(
      [
        {
          inputs: () => {
            return [];
          },
          run: () => {
            log.push('attach');
            return undefined;
          },
        },
      ],
      () => {
        return 'ctx';
      }
    );

    runner.sync({});

    expect(log).toEqual(['attach']);
  });
});

test.describe('only what moved is rebuilt', () => {
  test('a pass that changes nothing rebuilds nothing', () => {
    const log: Log = [];
    const runner = createStepRunner(
      [step('a', { reads: 'x', log }), step('b', { reads: 'y', log })],
      () => {
        return 'ctx';
      }
    );

    runner.sync({ x: 1, y: 1 });
    log.length = 0;
    runner.sync({ x: 1, y: 1 });

    expect(log).toEqual([]);
  });

  test('a field only one step reads rebuilds only that step', () => {
    const log: Log = [];
    const runner = createStepRunner(
      [step('a', { reads: 'x', log }), step('b', { reads: 'y', log })],
      () => {
        return 'ctx';
      }
    );

    runner.sync({ x: 1, y: 1 });
    log.length = 0;
    runner.sync({ x: 2, y: 1 });

    expect(log).toEqual(['detach:a', 'attach:a:ctx']);
  });
});

test.describe('everything stale goes down before anything comes up', () => {
  // **The invariant the design is built on.** Rebuilding in place would interleave —
  // `detach:a, attach:a, detach:b, attach:b` — and dispatch follows the order listeners were
  // added, so a surviving step silently changes places with a rebuilt one.
  test('two steps rebuilding together detach as a group', () => {
    const log: Log = [];
    const runner = createStepRunner(
      [step('a', { reads: 'x', log }), step('b', { reads: 'x', log })],
      () => {
        return 'ctx';
      }
    );

    runner.sync({ x: 1 });
    log.length = 0;
    runner.sync({ x: 2 });

    expect(log).toEqual(['detach:a', 'detach:b', 'attach:a:ctx', 'attach:b:ctx']);
  });

  test('a surviving step is not detached, and keeps its place in the order', () => {
    const log: Log = [];
    const runner = createStepRunner(
      [
        step('a', { reads: 'x', log }),
        step('survivor', { reads: 'y', log }),
        step('c', { reads: 'x', log }),
      ],
      () => {
        return 'ctx';
      }
    );

    runner.sync({ x: 1, y: 1 });
    log.length = 0;
    runner.sync({ x: 2, y: 1 });

    expect(log).toEqual(['detach:a', 'detach:c', 'attach:a:ctx', 'attach:c:ctx']);
  });
});

test.describe('a step with no inputs', () => {
  test('runs on every pass, and is never torn down', () => {
    const log: Log = [];
    const runner = createStepRunner([step('always', { reads: null, log })], () => {
      return 'ctx';
    });

    runner.sync({});
    runner.sync({});
    runner.sync({});

    expect(log).toEqual(['attach:always:ctx', 'attach:always:ctx', 'attach:always:ctx']);
  });

  // The contract on {@link SyncStep}, pinned because it is invisible today: the real table's only
  // such step returns `void`. A teardown returned here is overwritten on the next pass and never
  // called — a leak, and the reason such a step must not return one.
  test('a teardown it returns is replaced rather than run — which is why it must not return one', () => {
    const log: Log = [];
    const runner = createStepRunner(
      [
        {
          inputs: null,
          run: () => {
            log.push('attach');
            return () => {
              log.push('detach');
            };
          },
        },
      ],
      () => {
        return 'ctx';
      }
    );

    runner.sync({});
    runner.sync({});

    // Two attachments, no detachment between them: the first teardown was dropped on the floor.
    expect(log).toEqual(['attach', 'attach']);
  });
});

test.describe('destroy', () => {
  test('runs every teardown, in the order the steps were wired', () => {
    const log: Log = [];
    const runner = createStepRunner(
      [step('a', { reads: 'x', log }), step('b', { reads: 'y', log })],
      () => {
        return 'ctx';
      }
    );

    runner.sync({ x: 1, y: 1 });
    log.length = 0;
    runner.destroy();

    expect(log).toEqual(['detach:a', 'detach:b']);
  });

  // **The other invariant with no assertion.** A runner that only ran its teardowns would still
  // believe every step attached, so the next identical `sync` rebuilds nothing: a modal that works
  // on mount and is inert after a remount, and it passes in one React mode.
  test('clears the keys, so an identical pass afterwards attaches again', () => {
    const log: Log = [];
    const runner = createStepRunner([step('a', { reads: 'x', log })], () => {
      return 'ctx';
    });

    runner.sync({ x: 1 });
    runner.destroy();
    log.length = 0;
    runner.sync({ x: 1 });

    expect(log).toEqual(['attach:a:ctx']);
  });

  test('is safe twice — the second finds nothing to run', () => {
    const log: Log = [];
    const runner = createStepRunner([step('a', { reads: 'x', log })], () => {
      return 'ctx';
    });

    runner.sync({ x: 1 });
    runner.destroy();
    log.length = 0;
    runner.destroy();

    expect(log).toEqual([]);
  });
});

test.describe('the context', () => {
  test('is built once per pass, not once per step', () => {
    let built = 0;
    const runner = createStepRunner(
      [
        { inputs: null, run: noop },
        { inputs: null, run: noop },
        { inputs: null, run: noop },
      ],
      () => {
        built += 1;
        return 'ctx';
      }
    );

    runner.sync({});

    expect(built).toBe(1);
  });

  test('every step of a pass is handed the same object', () => {
    const seen: unknown[] = [];
    const record: SyncStep<Record<string, unknown>, object> = {
      inputs: null,
      run: (context) => {
        seen.push(context);
      },
    };
    const runner = createStepRunner([record, record], () => {
      return {};
    });

    runner.sync({});

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
  });
});
