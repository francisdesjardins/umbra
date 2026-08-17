#!/usr/bin/env node
/**
 * The performance claims, as measurements rather than as readings of the source.
 *
 * **What this is for, and what it deliberately is not.** Every claim here is *structural* — a no-op
 * commit is free, an aggregate read does not care how many actions exist, the stack sort is the sort
 * and not the policy. So the number that matters is a **ratio between two runs on the same machine**,
 * not throughput: absolute ops/sec on a laptop under load says nothing a reader can carry anywhere,
 * while "200 actions costs what 1 action costs" survives the noise and is the actual promise.
 *
 * Dependency-free on purpose, matching the package it measures. mitata would give better statistics
 * and cost a devDependency plus an install; the shape of these answers is coarse enough that the
 * median of repeated batches resolves it, and a ratio near 1 is not a close call.
 *
 * A local command like `yarn coverage:update`, for the same reason: nothing renders the result, and
 * a number produced on CI's shared runner would be noise with a version number on it.
 *
 * Measured against `dist/`, because it is what ships — and because the relative specifiers in `src/`
 * carry `.js` for the declaration emit, which Node's type-stripping does not remap. Run
 * `yarn build` first.
 *
 * Usage: `yarn bench`
 */
import { createStore } from '../dist/esm/store/create-store.js';
import { createActionEngine } from '../dist/esm/actions/action-engine.js';
import { orderStack } from '../dist/esm/manager/stack-order.js';

/** Batches, then the median — one slow batch is the OS scheduling, not the code. */
const BATCHES = 9;

/** Nanoseconds per operation, median of {@link BATCHES}. */
const measure = (run, said) => {
  const { label, iterations } = said;

  // Warm-up, so the first batch is not paying for the JIT everyone else's numbers exclude.
  for (let i = 0; i < Math.min(iterations, 10_000); i++) {
    run(i);
  }

  const perBatch = [];
  for (let batch = 0; batch < BATCHES; batch++) {
    const started = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      run(i);
    }
    perBatch.push(Number(process.hrtime.bigint() - started) / iterations);
  }
  perBatch.sort((a, b) => {
    return a - b;
  });

  const ns = perBatch[Math.floor(BATCHES / 2)];
  console.log(`  ${label.padEnd(46)} ${ns.toFixed(1).padStart(9)} ns/op`);
  return ns;
};

const ratio = (said) => {
  const { label, of, against, expectation } = said;
  console.log(`  → ${label}: ${(of / against).toFixed(2)}× — ${expectation}\n`);
};

console.log('\numbra — the performance claims, measured\n');

// ── 1. `equals` gates commits ────────────────────────────────────────────────
console.log('A store commit is gated by `equals`, so a set that changes nothing is free');
{
  const store = createStore({ count: 0 });
  let notified = 0;
  store.subscribe(() => {
    notified++;
  });

  const noop = measure(
    () => {
      store.set((previous) => {
        return previous;
      });
    },
    { label: 'set() returning the same reference', iterations: 1_000_000 }
  );
  const notifiedByNoops = notified;

  const commit = measure(
    (i) => {
      store.set(() => {
        return { count: i };
      });
    },
    { label: 'set() returning a new object', iterations: 1_000_000 }
  );

  // The load-bearing assertion, and the one no optimiser can flatter: the gate is a *behaviour*,
  // not a speed. A no-op that still woke every subscriber would be fast and wrong.
  console.log(
    `  → the gated path notified ${String(notifiedByNoops)} listeners across ${String(BATCHES)}M calls (must be 0)`
  );
  // An order of magnitude on purpose: at ~1 cycle the no-op is at or under this harness's
  // resolution, and an optimiser that can see the commit never happens is entitled to most of it.
  // "Free" is the claim; a precise multiple would be measuring the JIT.
  ratio({
    label: 'a no-op set against a committing one',
    of: commit,
    against: noop,
    expectation: 'free to within measurement',
  });
}

// ── 2. Aggregated action state is precomputed ────────────────────────────────
console.log('Aggregated action state is computed at write time, so reads are O(1) in action count');
{
  const build = (actions) => {
    const engine = createActionEngine('bench');
    engine.beginRender();
    for (let i = 0; i < actions; i++) {
      engine.declare(`action-${String(i)}`, undefined);
    }
    engine.endRender();
    return engine;
  };

  const one = build(1);
  const many = build(200);

  const readOne = measure(
    () => {
      return one.aggregated();
    },
    { label: 'aggregated() with 1 declared action', iterations: 2_000_000 }
  );
  const readMany = measure(
    () => {
      return many.aggregated();
    },
    { label: 'aggregated() with 200 declared actions', iterations: 2_000_000 }
  );

  ratio({
    label: '200 actions against 1',
    of: readMany,
    against: readOne,
    expectation: 'O(1) holds at ≈1.0×',
  });
}

// ── 3. The stack sort ────────────────────────────────────────────────────────
console.log('The stack order is three keys over `toSorted`, and runs on every snapshot');
{
  const dialogs = (count) => {
    return Array.from({ length: count }, (_, i) => {
      return {
        id: `d-${String(i)}`,
        template: 'modal',
        nonModal: i % 4 === 0,
        openSequence: i,
      };
    });
  };

  const four = dialogs(4);
  const fifty = dialogs(50);
  const policy = (modal) => {
    return modal.nonModal ? 1 : 2;
  };

  const plain = measure(
    () => {
      return orderStack(four, undefined);
    },
    { label: 'orderStack, 4 dialogs, no policy', iterations: 500_000 }
  );
  const policed = measure(
    () => {
      return orderStack(four, policy);
    },
    { label: 'orderStack, 4 dialogs, with a policy', iterations: 500_000 }
  );
  const many = measure(
    () => {
      return orderStack(fifty, policy);
    },
    { label: 'orderStack, 50 dialogs, with a policy', iterations: 200_000 }
  );

  // One call per dialog, not one per comparison — `orderStack` ranks up front precisely so a policy
  // allowed to be a lookup is not asked O(n log n) times. It is still work: on four dialogs it
  // roughly doubles a 143 ns operation, which is the honest reading of the ratio below.
  ratio({
    label: 'a policy against no policy, same stack',
    of: policed,
    against: plain,
    expectation: 'n calls, not n log n — doubling a very small number',
  });
  console.log(`  → 50 dialogs costs ${(many / 1000).toFixed(2)} µs — a stack nobody has, priced\n`);
}

console.log('Ratios are the claim; absolute figures are this machine on this day.\n');
