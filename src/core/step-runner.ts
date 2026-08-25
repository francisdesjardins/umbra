/**
 * React's dependency array, made framework-free — the executor, with no idea what a step does.
 *
 * The rule it implements is one sentence: **only the steps whose own inputs moved are rebuilt**,
 * and everything stale is detached before anything is attached. Why the granularity has to be per
 * step rather than one key for the sequence belongs to the caller that chose it, and is on
 * `dialog-director.ts`.
 *
 * **It is here rather than inside the director because it is a decision, and every other decision
 * in this library is a named function with a test.** The director's own table is DOM to the last
 * line, which is what kept its executor out of the unit project's reach — so the two invariants
 * below were carried by paragraphs and by nothing that fails. They are what this file exists to
 * make assertable:
 *
 * - **Detach every stale step before attaching any of them.** Rebuilding each in place would
 *   interleave, and listener dispatch follows the order listeners were added — so the steps that
 *   survived a pass would quietly change places with the ones that did not. React tears down every
 *   effect of a commit before it runs any of them, for the same reason.
 * - **`destroy` clears the keys, not just the teardowns.** A runner that only ran its teardowns
 *   would still believe every step attached, so the next `sync` would rebuild nothing — which is a
 *   modal that works on mount and is inert after a remount, and passes in one React mode.
 *
 * @internal Not part of the public API.
 */

/** A step's inputs, compared with `Object.is` the way React compares a dependency array. */
export type StepInputs = readonly unknown[];

/** What a step hands back: how to undo itself, or nothing to undo. */
export type StepTeardown = (() => void) | undefined | void;

/**
 * One step: what it reads, and how to run it.
 *
 * `inputs: null` means *run on every pass and never tear down*. Such a step must not return a
 * teardown — there is no pass on which the runner would call it, so returning one leaks it. The
 * runner does not defend against that, because the alternative is to swallow a teardown a step
 * meant to be honoured, and a leak that is stated is better than a cleanup that silently vanishes.
 */
export type SyncStep<TPass, TContext> = {
  readonly inputs: ((pass: TPass) => StepInputs) | null;
  readonly run: (context: TContext, pass: TPass) => StepTeardown;
};

/**
 * Whether a step's inputs are unchanged, by the same rule React applies to a dependency array:
 * same length, and `Object.is` on every element.
 *
 * A missing previous entry is *not* unchanged — that is the first pass, and the first pass has to
 * attach everything.
 *
 * @internal
 */
export function sameInputs(previous: StepInputs | undefined, next: StepInputs): boolean {
  if (previous === undefined || previous.length !== next.length) {
    return false;
  }
  return previous.every((value, index) => {
    return Object.is(value, next[index]);
  });
}

/**
 * Build the executor for one ordered list of steps.
 *
 * `contextFor` is called **once per pass**, not once per step: the steps of a pass all see the
 * same context object, which is what lets a caller derive it from the pass without every step
 * paying for its own copy.
 *
 * @internal
 */
export function createStepRunner<TPass, TContext>(
  steps: readonly SyncStep<TPass, TContext>[],
  contextFor: (pass: TPass) => TContext
): { sync: (pass: TPass) => void; destroy: () => void } {
  /** Per step, by index into `steps`. Cleared by `destroy`, not just run. */
  const attachedFor: (StepInputs | undefined)[] = [];
  const teardowns: (StepTeardown | undefined)[] = [];

  return {
    sync(pass: TPass): void {
      const context = contextFor(pass);

      const stale = new Set<number>();
      for (const [index, spec] of steps.entries()) {
        if (spec.inputs === null) {
          continue;
        }
        const inputs = spec.inputs(pass);
        if (sameInputs(attachedFor[index], inputs)) {
          continue;
        }
        attachedFor[index] = inputs;
        stale.add(index);
      }

      // Everything stale goes down before anything comes up — see the file's header for what
      // rebuilding in place would reorder.
      for (const index of stale) {
        teardowns[index]?.();
        teardowns[index] = undefined;
      }

      for (const [index, spec] of steps.entries()) {
        if (spec.inputs !== null && !stale.has(index)) {
          continue;
        }
        teardowns[index] = spec.run(context, pass) ?? undefined;
      }
    },

    destroy(): void {
      for (const teardown of teardowns) {
        teardown?.();
      }
      teardowns.length = 0;
      attachedFor.length = 0;
    },
  };
}
