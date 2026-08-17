import { expect, test } from '@playwright/test';
import {
  MODAL_LIFECYCLE_SEQUENCE,
  MODAL_LIFECYCLE_STEPS,
  type ModalLifecyclePass,
  type ModalLifecycleStep,
} from '../modal-director.js';
import { sameInputs } from '../step-runner.js';

// The director's framework-free half: which step reads what, and what counts as unchanged. The
// executor is `step-runner.ts`'s and tested there; what a step reads is where the hazard lives.

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

function rebuilds(step: ModalLifecycleStep, next: Partial<ModalLifecyclePass>): boolean {
  const before = inputsOf(step, BASE);
  if (before === null) {
    // A step with no inputs runs every pass and is never torn down, so it is never asked below.
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
    // **The one real hazard, as a gate.** This attachment owns `wasRunning`, which recognises an
    // action settling and gives focus back. Widen the list and the step is rebuilt mid-action —
    // a caller's inline arrow re-identifies each render — so the settle is missed: the WebKit bug.
    expect(inputsOf('focus.sync', BASE)).toEqual(['open']);

    expect(rebuilds('focus.sync', { phase: 'closing' })).toBe(true);
    for (const changed of [
      { onKeyDown: () => {} },
      // The same hazard from a second direction: a *controlled* surface re-renders on its owner.
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
    // A phase-only key would never re-ask: a name may point at a heading `prepare` has not drawn.
    expect(rebuilds('syncLabellingDiagnostics', { isPreparing: true })).toBe(true);
  });

  test('the three keydown listeners read exactly the same thing', () => {
    // They share an option object to the letter, so a difference means one re-attaching without
    // the others — three listeners disagreeing about which dismiss key is live.
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
    // The listeners call it, so a stale `onDismissRequest` would answer an owner's fresh state.
    expect(rebuilds('attachDialogKeydown', { onDismissRequest: () => {} })).toBe(true);
    expect(rebuilds('attachDialogKeydown', { containFocus: true })).toBe(false);
  });

  test('an option only its own step reads only rebuilds that step', () => {
    // The point of one key per step: toggling `containFocus` re-attaches the Tab wrap and leaves
    // the keyboard, the focus policy and the exit listeners where they were.
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
    // Every step is phase-driven, so one sitting out a phase change keeps stale listeners alive.
    for (const step of MODAL_LIFECYCLE_SEQUENCE) {
      if (inputsOf(step, BASE) === null) {
        continue;
      }
      expect(rebuilds(step, { phase: 'closed' }), `${step} ignored a phase change`).toBe(true);
    }
  });

  test('no step reads a value the pass does not carry', () => {
    // A step reading off a closure instead of the pass is a dependency the director cannot diff,
    // so it would silently never re-attach — checked by giving every field a distinct value.
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
