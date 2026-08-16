import { expect, test } from '@playwright/test';
import {
  MODAL_LIFECYCLE_SEQUENCE,
  MODAL_LIFECYCLE_STEPS,
  type ModalLifecyclePass,
  type ModalLifecycleStep,
} from '../modal-director.js';
import { sameInputs } from '../step-runner.js';

/**
 * The director's framework-free half: which step reads what, and what counts as unchanged.
 *
 * The executor is `step-runner.ts`'s and is tested there, against a table of its own — what is
 * left here is the part that is about modals: which step reads what, which is where the design's
 * one real hazard lives.
 */

const BASE: ModalLifecyclePass = {
  phase: 'open',
  isPreparing: false,
  prepare: undefined,
  onError: undefined,
  onKeyDown: undefined,
  nonModal: false,
  primaryProperty: 'opacity',
  exitDuration: 200,
  dismissKey: 'Escape',
  containFocus: false,
  dismissWhilePreparing: true,
  onDismissRequest: undefined,
  dismissOnClickOutside: false,
};

function inputsOf(step: ModalLifecycleStep, pass: ModalLifecyclePass): readonly unknown[] | null {
  const spec = MODAL_LIFECYCLE_STEPS.find((candidate) => {
    return candidate.step === step;
  });
  if (!spec) {
    throw new Error(`no such step: ${step}`);
  }
  return spec.inputs === null ? null : spec.inputs(pass);
}

/** Whether this step would be rebuilt going from one pass to the next. */
function rebuilds(step: ModalLifecycleStep, next: Partial<ModalLifecyclePass>): boolean {
  const before = inputsOf(step, BASE);
  if (before === null) {
    // A step with no inputs runs on every pass and is never torn down, so "rebuilt" does not
    // apply — the tests below never ask it of one.
    throw new Error(`${step} runs on every pass`);
  }
  return !sameInputs(before, inputsOf(step, { ...BASE, ...next }) ?? []);
}

test.describe('what each step reads', () => {
  test('syncOpenSequence runs on every pass', () => {
    // No inputs, deliberately: it closes over `prepare`, a user callback that must never be a pass
    // behind. Its own phase guard and `dialog.open` check are what stop the work happening twice.
    expect(inputsOf('syncOpenSequence', BASE)).toBeNull();
  });

  test('focus.sync reads the phase and nothing else', () => {
    // **The design's one real hazard, as a gate.** This step's attachment owns `wasRunning`, the
    // flag that recognises an action settling and gives focus back to the button that ran it.
    // Widen this list and the step is rebuilt mid-action — `hasRunningAction` flipping forces a
    // render, and a caller's inline `onKeyDown` arrow gets a new identity on every one of them —
    // so the settle is not recognised and focus is never restored. That is the WebKit focus bug's
    // exact shape, and no test in this repo would fail on it. This one does.
    expect(inputsOf('focus.sync', BASE)).toEqual(['open']);

    expect(rebuilds('focus.sync', { phase: 'closing' })).toBe(true);
    for (const changed of [
      { onKeyDown: () => {} },
      // The same hazard from a second direction: `onDismissRequest` is the option a *controlled*
      // surface passes, and a controlled surface re-renders on its owner's state.
      { onDismissRequest: () => {} },
      { isPreparing: true },
      { dismissKey: 'Enter' },
      { containFocus: true },
      { dismissOnClickOutside: true },
      { dismissWhilePreparing: false },
      { nonModal: true },
      { exitDuration: 999 },
      { primaryProperty: 'transform' },
    ] satisfies Partial<ModalLifecyclePass>[]) {
      expect(
        rebuilds('focus.sync', changed),
        `focus.sync must survive ${Object.keys(changed)[0]} changing`
      ).toBe(false);
    }
  });

  test('the labelling diagnostic comes back when prepare settles', () => {
    // A phase-only key would never re-ask: the check stays quiet while `prepare` runs, because a
    // name may point at a heading the caller has not been able to render yet.
    expect(rebuilds('syncLabellingDiagnostics', { isPreparing: true })).toBe(true);
  });

  test('the three keydown listeners read exactly the same thing', () => {
    // They share an option object to the letter, so a difference here would mean one of them
    // re-attaching without the others — three listeners disagreeing about which dismiss key is
    // live.
    const keydown = [
      'attachDialogKeydown',
      'attachDialogCancel',
      'attachWindowDismissKey',
    ] as const;
    const [first] = keydown;
    for (const step of keydown) {
      expect(inputsOf(step, BASE), `${step} diverged`).toEqual(inputsOf(first, BASE));
    }
    expect(rebuilds('attachDialogKeydown', { onKeyDown: () => {} })).toBe(true);
    expect(rebuilds('attachDialogKeydown', { dismissKey: false })).toBe(true);
    // The listeners are what call it, so a new handler has to reach them — an owner whose
    // `onDismissRequest` closes over fresh state would otherwise be answered by a stale one.
    expect(rebuilds('attachDialogKeydown', { onDismissRequest: () => {} })).toBe(true);
    expect(rebuilds('attachDialogKeydown', { containFocus: true })).toBe(false);
  });

  test('an option only its own step reads only rebuilds that step', () => {
    // The point of one key per step rather than one key for the sequence: toggling `containFocus`
    // re-attaches the Tab wrap and leaves the keyboard, the focus policy and the exit listeners
    // exactly where they were.
    expect(rebuilds('attachFocusContainment', { containFocus: true })).toBe(true);
    for (const step of [
      'syncLabellingDiagnostics',
      'syncCloseSequence',
      'attachDialogKeydown',
      'focus.sync',
      'attachClickOutside',
    ] satisfies ModalLifecycleStep[]) {
      expect(rebuilds(step, { containFocus: true }), `${step} should not care`).toBe(false);
    }
  });

  test('the phase rebuilds everything that can be rebuilt', () => {
    // Every step is phase-driven — that is what `sync*` means here — so nothing may sit out a
    // phase change. A step that did would keep listeners from the previous phase alive.
    for (const step of MODAL_LIFECYCLE_SEQUENCE) {
      if (inputsOf(step, BASE) === null) {
        continue;
      }
      expect(rebuilds(step, { phase: 'closed' }), `${step} ignored a phase change`).toBe(true);
    }
  });

  test('no step reads a value the pass does not carry', () => {
    // A step reading something off a closure instead of the pass is a dependency the director
    // cannot diff, so it would silently never re-attach. Every input has to be traceable to a
    // field of the pass — checked by giving every field a distinct value and requiring each input
    // to be one of them.
    const distinct: ModalLifecyclePass = {
      phase: 'opening',
      isPreparing: true,
      onError: undefined,
      prepare: () => {},
      onKeyDown: () => {},
      nonModal: true,
      primaryProperty: 'transform',
      exitDuration: 321,
      dismissKey: 'Enter',
      containFocus: true,
      dismissWhilePreparing: false,
      onDismissRequest: () => {
        return true;
      },
      dismissOnClickOutside: true,
    };
    const carried = new Set<unknown>(Object.values(distinct));

    for (const step of MODAL_LIFECYCLE_SEQUENCE) {
      for (const input of inputsOf(step, distinct) ?? []) {
        expect(carried.has(input), `${step} reads something the pass does not carry`).toBe(true);
      }
    }
  });
});
