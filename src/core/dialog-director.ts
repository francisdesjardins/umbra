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
import type { DismissCause } from './dismiss-reason.js';
import type { DialogId } from './registry.js';
import type { HotkeyDef } from '../actions/types.js';
import type { DialogManager } from '../manager/dialog-manager.js';
import type { FocusCoordinator } from './attach-focus.js';
import type { DialogKeydownOptions, DialogDomContext } from './attach-types.js';
import type { DialogStore } from './dialog-store.js';
import type { StepInputs, StepTeardown } from './step-runner.js';
import type { GetDialog, DialogFailure, DialogPhase } from './types.js';

/**
 * Who asks the lifecycle's decisions, in what order, and on which pass.
 *
 * The core owns every framework-free decision; the *sequence* existed only as the order of
 * statements in three binding files, and a sequence nobody names is one nobody can test. A binding
 * gets one pass and one teardown, and **the pass effect must not return a cleanup** — that would
 * tear the sequence down before every re-run.
 *
 * **One key per step, not one for the sequence.** A single key is the union of every step's inputs,
 * and that union holds `onKeyDown`, an inline arrow whose identity moves every render — so
 * `focus.sync` would rebuild mid-action with `wasRunning` back to `false`.
 *
 * @internal A binding is the only caller.
 */

// ── What the director is handed ──────────────────────────────────────────────

/**
 * The dialog being directed — fixed for its whole lifetime, so no step lists any of it, `dialogId`
 * included: the store, engine and focus coordinator take the id once at build and never look
 * again. React's registration effect does list it, which is what re-registers a changed `id`.
 */
export type DialogDirectorContext = {
  readonly store: DialogStore;
  readonly getDialog: GetDialog;
  readonly dialogId: DialogId;
  readonly manager: DialogManager;
  readonly engine: ActionGate;
};

/**
 * One pass over the lifecycle: everything a step reads that can change between two of them.
 *
 * Flat rather than nested by step, because a binding assembles it once and the director is what
 * knows which fields belong to which step — that split is the whole point of the file.
 */
export type DialogLifecyclePass = {
  readonly phase: DialogPhase;
  readonly isPreparing: boolean;
  readonly prepare: ((signal: AbortSignal) => void | Promise<void>) | undefined;
  readonly onError: ((failure: DialogFailure) => void) | undefined;
  readonly onKeyDown: ((event: KeyboardEvent) => void) | undefined;
  readonly nonModal: boolean;
  /** The transition property whose `transitionend` settles the close. */
  readonly primaryProperty: string;
  /** How long to wait for it before finalizing anyway. */
  readonly exitDuration: number;
  readonly dismissKey: HotkeyDef | false;
  readonly dismissWhilePreparing: boolean;
  readonly onDismissRequest: ((cause: DismissCause) => boolean | void) | undefined;
  readonly containFocus: boolean;
  readonly dismissOnClickOutside: boolean;
};

/** What a step needs beyond the pass and the DOM context, built once per dialog. */
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
type DialogLifecycleStepArgs = {
  readonly pass: DialogLifecyclePass;
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
type DialogLifecycleStepSpec = {
  readonly step: string;
  readonly inputs: ((pass: DialogLifecyclePass) => StepInputs) | null;
  readonly run: (dom: DialogDomContext, args: DialogLifecycleStepArgs) => StepTeardown;
};

// ── The sequence ─────────────────────────────────────────────────────────────

/**
 * The three keydown listeners share an option object to the letter, so they share its builder.
 *
 * Exported for the test that reads it: every field is forwarded from the pass, and a dropped one
 * disables a dismissal rule in all three listeners at once while every step still attaches.
 *
 * @internal
 */
export const keydownOptions = (
  pass: DialogLifecyclePass,
  engine: ActionGate
): DialogKeydownOptions => {
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
const keydownInputs = (pass: DialogLifecyclePass): StepInputs => {
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
 * {@link DIALOG_LIFECYCLE_SEQUENCE} is derived from the table below.
 */
export const DIALOG_LIFECYCLE_STEPS = [
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
     * Settle the opening focus, and restore it when an action lands. Ahead of the two below
     * because it decides where focus belongs and they only guard it once it is there — one
     * flush, so nothing observes the difference; the reading order is the argument.
     */
    step: 'focus.sync',
    /**
     * The phase and deliberately nothing else: this attachment owns `wasRunning`, so rebuilding
     * it mid-action loses the settle and focus is never restored. Every other field here can
     * change during an action, so any of them in this list is that bug.
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
      return [
        pass.phase,
        pass.dismissOnClickOutside,
        pass.dismissWhilePreparing,
        pass.onDismissRequest,
      ];
    },
    run: (dom, { pass, parts }) => {
      return attachClickOutside(dom, {
        dismissOnClickOutside: pass.dismissOnClickOutside,
        dismissWhilePreparing: pass.dismissWhilePreparing,
        engine: parts.engine,
        onDismissRequest: pass.onDismissRequest,
      });
    },
  },
] as const satisfies readonly DialogLifecycleStepSpec[];

/** One step of the shared lifecycle, by name. */
export type DialogLifecycleStep = (typeof DIALOG_LIFECYCLE_STEPS)[number]['step'];

/**
 * The order the shared lifecycle runs in, as data — for the gates that check a binding against it.
 *
 * Derived rather than written, so it cannot disagree with what actually runs.
 */
export const DIALOG_LIFECYCLE_SEQUENCE: readonly DialogLifecycleStep[] = DIALOG_LIFECYCLE_STEPS.map(
  (spec) => {
    return spec.step;
  }
);

// ── The executor ─────────────────────────────────────────────────────────────

/**
 * Build the director for one dialog.
 *
 * It owns the focus coordinator — per-dialog state the sequence reads, and no binding's business.
 * The diffing is `createStepRunner`'s: the table above is DOM to the last line, which kept the
 * rules reading it ("detach everything stale before attaching any of it", "`destroy` clears the
 * keys") out of the unit project's reach until they moved there. What stays here is the part
 * that is about dialogs — which steps exist, what each reads, and the context they share.
 */
export function createDialogDirector(ctx: DialogDirectorContext) {
  const { store, getDialog, dialogId, manager, engine } = ctx;

  const parts: StepParts = {
    engine,
    focus: createFocusCoordinator({ store, getDialog, dialogId, manager }, { engine }),
  };

  const runner = createStepRunner<DialogLifecyclePass, DialogDomContext>(
    DIALOG_LIFECYCLE_STEPS.map((spec) => {
      return {
        inputs: spec.inputs,
        run: (dom, pass) => {
          return spec.run(dom, { pass, parts });
        },
      };
    }),
    // Once per pass, so no two steps can read different phases.
    (pass) => {
      return { store, getDialog, dialogId, phase: pass.phase, manager };
    }
  );

  return {
    /**
     * Bring the lifecycle in line with this pass — rebuilding only the steps whose inputs moved.
     *
     * Safe to call as often as a binding renders, and meant to be: the pass carries no dependency
     * list of its own, so `prepare` and `onKeyDown` are never a render behind.
     */
    sync(pass: DialogLifecyclePass): void {
      runner.sync(pass);
    },

    /** Tear the whole sequence down, in the order it was wired. */
    destroy(): void {
      runner.destroy();
    },
  };
}

/** The director as its bindings see it. */
export type DialogDirector = ReturnType<typeof createDialogDirector>;
