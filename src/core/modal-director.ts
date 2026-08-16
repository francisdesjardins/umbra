import { attachClickOutside } from './attach-click-outside.js';
import { attachFocusContainment } from './attach-focus-containment.js';
import { createFocusCoordinator } from './attach-focus.js';
import {
  attachDialogCancel,
  attachDialogKeydown,
  attachWindowDismissKey,
} from './attach-keydown.js';
import {
  syncCloseSequence,
  syncLabellingDiagnostics,
  syncOpenSequence,
} from './attach-lifecycle.js';
import { createStepRunner } from './step-runner.js';
import type { ActionGate } from '../actions/action-engine.js';
import type { HotkeyDef } from '../actions/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';
import type { FocusCoordinator } from './attach-focus.js';
import type { DialogKeydownOptions, ModalDomContext } from './attach-types.js';
import type { ModalStore } from './modal-store.js';
import type { StepInputs, StepTeardown } from './step-runner.js';
import type { GetDialog, ModalFailure, ModalPhase } from './types.js';

/**
 * Who asks the lifecycle's decisions, in what order, and on which pass.
 *
 * **Every framework-free piece of this library is a decision the core owns** — `canDismiss`,
 * `orderStack`, `chooseActionRunner` — and each is named, documented and tested. The *sequence*
 * those decisions are asked in was the one that was not: it existed only as the order of
 * statements in three binding files, and a sequence nobody named is a sequence nobody can test.
 * This file is that sequence, executed.
 *
 * ## What a binding is left with
 *
 * One pass with no dependency list, and one teardown:
 *
 * ```ts
 * useEffect(() => {
 *   director.sync({ phase, isPreparing, prepare, onKeyDown, …options });
 * });
 * useEffect(() => {
 *   return () => {
 *     director.destroy();
 *   };
 * }, [director]);
 * ```
 *
 * The pass effect **must not return a cleanup**: a cleanup would tear the whole sequence down
 * before every re-run and the diffing below would be pointless. All teardown belongs to
 * {@link ModalDirector.destroy}.
 *
 * ## One key per step, not one key for the sequence
 *
 * The obvious executor is a single ordered pass behind a single key — which is what
 * `umbra/vanilla`'s `attachedFor` is, and it was the design this file was going to have. It is
 * wrong, and the reason is worth the paragraph because nothing in the suite would have failed on
 * it.
 *
 * `focus.sync` carries state across its own attachment: `wasRunning` is how it recognises the
 * running → idle transition that restores focus to the button that ran an action. A single key
 * is the union of every step's inputs, and that union contains `onKeyDown` — which callers pass
 * as an inline arrow, so its identity changes on every render. An action starting *causes* a
 * render, so the union key changes mid-action, the focus step is rebuilt with `wasRunning` back
 * to `false`, the settle is not recognised, and focus is never given back. That is the shape of
 * the WebKit bug this library fixed the day before, reintroduced by a refactor.
 *
 * So each step declares its own inputs, and only the steps whose own inputs changed are rebuilt.
 * `focus.sync` depends on the phase and nothing else, which is the property
 * `modal-director.test.ts` asserts directly rather than leaving to be rediscovered. What this is,
 * in one line: **React's dependency array, made framework-free** — so a binding inherits the
 * granularity instead of transcribing it.
 *
 * Only `syncOpenSequence` runs on every pass. `syncLabellingDiagnostics` is idempotent and could,
 * but it is keyed instead, because keying is what React did and a step that changes how often it
 * runs is a behaviour change wearing a refactor's clothes.
 *
 * ## What is not here
 *
 * Steps that run during **render** rather than from an effect — `setDialogAttributes` and
 * `getDialogAnimationStyles` — are deliberately absent, because a binding writes them where its
 * renderer runs and no order shared with an effect would mean anything. React calls
 * `getDialogAnimationStyles` in its render body, so it runs before every step below while
 * appearing last in the file.
 *
 * `umbra/vanilla` does not use this. Its `sync()` runs `syncOpenSequence` **last** where the hook
 * bindings run it first, and adopting the director would move it — a change measured green on
 * three engines and deliberately not taken, because "no test noticed" is enough to close a
 * contract question between two bindings that owe each other a mirror and not enough to move
 * shipped behaviour that owes nobody one. `wiring-order.test.ts` records the difference.
 *
 * **One thing does notice it, and it is worth knowing before that change is reconsidered.** The
 * focus coordinator's `focusin` bookkeeping is armed by `focus.sync`, so running that step before
 * `syncOpenSequence` means it hears the opening focus `showModal()` places and running it after
 * means it does not. So `umbra/vanilla` remembers a `lastFocusInside` the hook bindings leave
 * empty, and a later `reclaimFocus` takes its `preferred` path there while the hook bindings fall
 * to the floor beneath it. Both deliver the same guarantee, which is why nothing failed; the
 * compatibility matrix carries the measurement, on the raise-hands-the-keyboard-back row.
 *
 * @internal Not part of the public API. A binding is the only caller.
 */

// ── What the director is handed ──────────────────────────────────────────────

/**
 * The modal being directed — fixed for its whole lifetime, so no step lists any of it.
 *
 * **`modalId` included, and that is a statement rather than an omission.** The store, the action
 * engine and the focus coordinator all take the id when they are built and never look again, so a
 * modal's identity is settled at mount; a step re-reading it would be the only part of the
 * lifecycle pretending otherwise. React's registration effect lists it as a dependency, which is
 * what makes a changed `id` re-register under the new name while everything else keeps the
 * original — see the `id` option's own doc, which says so from the caller's side.
 */
export type ModalDirectorContext = {
  readonly store: ModalStore;
  readonly getDialog: GetDialog;
  readonly modalId: string;
  readonly manager: DialogManager;
  readonly engine: ActionGate;
};

/**
 * One pass over the lifecycle: everything a step reads that can change between two of them.
 *
 * Flat rather than nested by step, because a binding assembles it once and the director is what
 * knows which fields belong to which step — that split is the whole point of the file.
 */
export type ModalLifecyclePass = {
  readonly phase: ModalPhase;
  readonly isPreparing: boolean;
  readonly prepare: ((signal: AbortSignal) => void | Promise<void>) | undefined;
  readonly onError: ((failure: ModalFailure) => void) | undefined;
  readonly onKeyDown: ((event: KeyboardEvent) => void) | undefined;
  readonly nonModal: boolean;
  /** The transition property whose `transitionend` settles the close. */
  readonly primaryProperty: string;
  /** How long to wait for it before finalizing anyway. */
  readonly exitDuration: number;
  readonly dismissKey: HotkeyDef | false;
  readonly dismissWhilePreparing: boolean;
  readonly onDismissRequest: (() => boolean | void) | undefined;
  readonly containFocus: boolean;
  readonly dismissOnClickOutside: boolean;
};

/** What a step needs beyond the pass and the DOM context, built once per modal. */
type StepParts = {
  readonly engine: ActionGate;
  readonly focus: FocusCoordinator;
};

/**
 * Everything a step's `run` reads that is not the DOM context.
 *
 * One object rather than two arguments because the pair travels together everywhere and only the
 * director ever assembles it — a step declaring `parts` it does not touch costs nothing, and the
 * table below stays a table.
 */
type ModalLifecycleStepArgs = {
  readonly pass: ModalLifecyclePass;
  readonly parts: StepParts;
};

/**
 * One step of the lifecycle: what it is called, what it reads, and how to run it.
 *
 * `inputs: null` means *run on every pass and never tear down* — the only step that needs it is
 * `syncOpenSequence`, which closes over `prepare`, a user callback that must never be a pass
 * behind. Its own phase guard and `dialog.open` check are what stop the work happening twice; see
 * `attach-lifecycle.ts`.
 */
type ModalLifecycleStepSpec = {
  readonly step: string;
  readonly inputs: ((pass: ModalLifecyclePass) => StepInputs) | null;
  readonly run: (dom: ModalDomContext, args: ModalLifecycleStepArgs) => StepTeardown;
};

// ── The sequence ─────────────────────────────────────────────────────────────

/** The three keydown listeners share an option object to the letter, so they share its builder. */
const keydownOptions = (pass: ModalLifecyclePass, engine: ActionGate): DialogKeydownOptions => {
  return {
    isPreparing: pass.isPreparing,
    onKeyDown: pass.onKeyDown,
    dismissKey: pass.dismissKey,
    engine,
    nonModal: pass.nonModal,
    dismissWhilePreparing: pass.dismissWhilePreparing,
    onDismissRequest: pass.onDismissRequest,
  };
};

/** …and, having the same options, the same inputs. */
const keydownInputs = (pass: ModalLifecyclePass): StepInputs => {
  return [
    pass.phase,
    pass.isPreparing,
    pass.onKeyDown,
    pass.dismissKey,
    pass.dismissWhilePreparing,
    pass.onDismissRequest,
    pass.nonModal,
  ];
};

/**
 * The order, as the thing that runs it.
 *
 * There is no separate declaration of the sequence to drift from this one:
 * {@link MODAL_LIFECYCLE_SEQUENCE} is derived from the table below.
 */
export const MODAL_LIFECYCLE_STEPS = [
  {
    /** Advance the native lifecycle — the `showModal()` / `show()` that puts the dialog on screen. */
    step: 'syncOpenSequence',
    inputs: null,
    run: (dom, { pass }) => {
      syncOpenSequence(dom, {
        prepare: pass.prepare,
        nonModal: pass.nonModal,
        onError: pass.onError,
      });
    },
  },
  {
    /** Report an unresolvable `aria-labelledby`, or a dialog with no accessible name at all. */
    step: 'syncLabellingDiagnostics',
    // `isPreparing` as well as the phase: the diagnostic asks its question once the content is
    // final, and a phase-only key would never bring it back when `prepare` settles.
    inputs: (pass) => {
      return [pass.phase, pass.isPreparing];
    },
    run: (dom, { pass }) => {
      syncLabellingDiagnostics(dom, { isPreparing: pass.isPreparing });
    },
  },
  {
    /** Arm the exit: the `transitionend` the close waits on, and the finalisation behind it. */
    step: 'syncCloseSequence',
    inputs: (pass) => {
      return [pass.phase, pass.nonModal, pass.primaryProperty, pass.exitDuration, pass.onError];
    },
    run: (dom, { pass }) => {
      return syncCloseSequence(dom, {
        onError: pass.onError,
        nonModal: pass.nonModal,
        primaryProperty: pass.primaryProperty,
        exitDuration: pass.exitDuration,
      });
    },
  },
  {
    /** Hotkeys and the dismiss key, scoped to this dialog's own subtree. */
    step: 'attachDialogKeydown',
    inputs: keydownInputs,
    run: (dom, { pass, parts }) => {
      return attachDialogKeydown(dom, keydownOptions(pass, parts.engine));
    },
  },
  {
    /** The platform's own cancel, which Escape raises before any listener of ours sees it. */
    step: 'attachDialogCancel',
    inputs: keydownInputs,
    run: (dom, { pass, parts }) => {
      return attachDialogCancel(dom, keydownOptions(pass, parts.engine));
    },
  },
  {
    /** The dismiss key for a non-modal dialog, which the window has to answer for. */
    step: 'attachWindowDismissKey',
    inputs: keydownInputs,
    run: (dom, { pass, parts }) => {
      return attachWindowDismissKey(dom, keydownOptions(pass, parts.engine));
    },
  },
  {
    /**
     * Settle the opening focus, and restore it when an action lands.
     *
     * Ahead of the two below because it decides *where focus belongs*, and they only guard it
     * once it is there. Nothing can observe the difference — it is one flush — but the reading
     * order is the argument for the writing order.
     */
    step: 'focus.sync',
    /**
     * **The phase, and deliberately nothing else.** This step's attachment owns `wasRunning`, the
     * flag that recognises an action settling; rebuilding it mid-action loses the transition and
     * focus is never restored. Every other field here can change during an action — `onKeyDown`
     * changes on every render — so any of them in this list is that bug. See the file's header.
     */
    inputs: (pass) => {
      return [pass.phase];
    },
    run: (_dom, { pass, parts }) => {
      return parts.focus.sync(pass.phase);
    },
  },
  {
    /** The Tab wrap a `<dialog>` does not get from `show()`, opt-in through `containFocus`. */
    step: 'attachFocusContainment',
    inputs: (pass) => {
      return [pass.phase, pass.containFocus];
    },
    run: (dom, { pass }) => {
      return attachFocusContainment(dom, { containFocus: pass.containFocus });
    },
  },
  {
    /** Dismissal by a click that landed outside, once the four-step gate agrees. */
    step: 'attachClickOutside',
    inputs: (pass) => {
      return [pass.phase, pass.dismissOnClickOutside, pass.dismissWhilePreparing];
    },
    run: (dom, { pass, parts }) => {
      return attachClickOutside(dom, {
        dismissOnClickOutside: pass.dismissOnClickOutside,
        dismissWhilePreparing: pass.dismissWhilePreparing,
        engine: parts.engine,
      });
    },
  },
] as const satisfies readonly ModalLifecycleStepSpec[];

/** One step of the shared lifecycle, by name. */
export type ModalLifecycleStep = (typeof MODAL_LIFECYCLE_STEPS)[number]['step'];

/**
 * The order the shared lifecycle runs in, as data — for the gates that check a binding against it.
 *
 * Derived rather than written, so it cannot disagree with what actually runs.
 */
export const MODAL_LIFECYCLE_SEQUENCE: readonly ModalLifecycleStep[] = MODAL_LIFECYCLE_STEPS.map(
  (spec) => {
    return spec.step;
  }
);

// ── The executor ─────────────────────────────────────────────────────────────

/**
 * Build the director for one modal.
 *
 * It owns the focus coordinator, because that is per-modal state the sequence reads and no
 * binding has another use for it.
 *
 * **The diffing is `createStepRunner`'s and nothing here restates it.** That split is not
 * bookkeeping: the table above is DOM to the last line, which is what kept the rule *reading* it
 * out of the unit project's reach — so "detach everything stale before attaching any of it" and
 * "`destroy` clears the keys as well as running them" were carried by two paragraphs and by
 * nothing that fails. What is left here is the part that is genuinely about modals: which steps
 * there are, what each reads, and the DOM context they share.
 */
export function createModalDirector(ctx: ModalDirectorContext) {
  const { store, getDialog, modalId, manager, engine } = ctx;

  const parts: StepParts = {
    engine,
    focus: createFocusCoordinator({ getDialog, modalId, manager }, { engine }),
  };

  const runner = createStepRunner<ModalLifecyclePass, ModalDomContext>(
    MODAL_LIFECYCLE_STEPS.map((spec) => {
      return {
        inputs: spec.inputs,
        run: (dom, pass) => {
          return spec.run(dom, { pass, parts });
        },
      };
    }),
    // Once per pass, so every step of a pass sees the same object — the phase is the only field
    // that moves, and a step reading a different one than its neighbour would be a bug with no
    // symptom until two steps disagreed about it.
    (pass) => {
      return { store, getDialog, modalId, phase: pass.phase, manager };
    }
  );

  return {
    /**
     * Bring the lifecycle in line with this pass — rebuilding only the steps whose inputs moved.
     *
     * Safe to call as often as a binding renders, and meant to be: the pass carries no dependency
     * list of its own, so `prepare` and `onKeyDown` are never a render behind.
     */
    sync(pass: ModalLifecyclePass): void {
      runner.sync(pass);
    },

    /** Tear the whole sequence down, in the order it was wired. */
    destroy(): void {
      runner.destroy();
    },
  };
}

/** The director as its bindings see it. */
export type ModalDirector = ReturnType<typeof createModalDirector>;
