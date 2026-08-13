/**
 * What works with what — as data, so it can be checked.
 *
 * The compatibility facts of this library were spread across `API.md`, two `CLAUDE.md` files, the
 * changelog and a hundred JSDoc blocks, and prose in five places is prose that disagrees with itself
 * in five places: inventorying these rows produced seven defects before a single cell existed. This
 * is the one place where "X with Y" has one answer.
 *
 * **The vocabulary is the point**, and in particular the two kinds of ✗ are not the same fact:
 *
 * | State             | Means                                                        | On the worklist?      |
 * | ----------------- | ------------------------------------------------------------ | --------------------- |
 * | `works`           | works, and a named test proves it                             | no                    |
 * | `works-untested`  | should work, nothing verifies it                              | **yes** — write it    |
 * | `partial`         | half works, the limit is written down and fixable             | **yes**               |
 * | `no-platform`     | the browser forbids it; no implementation would change it     | no — never            |
 * | `no-by-design`    | the library refuses, with a documented reason                 | no — the reason is due |
 * | `n-a`             | the combination has no meaning on this path                   | no                    |
 *
 * Without that split the list of ✗ contains items nobody can ever act on, and a real gap reads the
 * same as a platform law.
 *
 * **What the gate can and cannot check** — the same honesty `docs-exports.test.ts` keeps about its
 * own scope. It checks that every option has a row, that no row names an option that does not exist,
 * and that every test a cell cites resolves to a real file and a real title. It **cannot** check that
 * the cited test proves the cell. That part stays human.
 *
 * @internal Test data, not part of the public API.
 */

/** One cell's verdict. See the table in this module's doc comment. */
export type CellState =
  'works' | 'works-untested' | 'partial' | 'no-platform' | 'no-by-design' | 'n-a';

/**
 * How strongly a constraint is held — and it is a second dimension because it decides whether a cell
 * is solid or hopeful.
 *
 * - `TYPE` — the checker rejects the wrong combination. Nothing else can be relied on this way.
 * - `RUNTIME` — a named function narrows or refuses at run time.
 * - `PROSE` — a sentence in a doc comment, and nothing else. Every `PROSE` cell is a candidate to
 *   become one of the other two.
 */
export type Enforcement = 'TYPE' | 'RUNTIME' | 'PROSE';

/** A test a cell rests on: the file it is in and its title, both matched verbatim by the gate. */
export type TestReference = {
  /** Repo-relative, e.g. `src/vanilla/__tests__/bind-dialog.ct.tsx`. */
  readonly file: string;
  /** The `test('…')` title, exactly — typographic apostrophes included. */
  readonly title: string;
};

export type Cell = {
  readonly state: CellState;
  readonly note?: string;
  readonly reference?: TestReference;
  /**
   * An open question this cell carries **despite** its state, and the reason the field exists.
   *
   * A `✓` can be true and still have a hole in it — a claim proven on one binding and not the others, a
   * discrimination that does not reproduce and is unexplained. Written into `note`, that reaches a
   * reader of the table and **not** the worklist, so it is a to-do nothing enumerates: the state is
   * what `worklist()` reads, and the state says "done". This is how such a thing gets listed.
   */
  readonly caveat?: string;
};

/** One option, and what it does and does not combine with. */
export type OptionRow = {
  /** Must be a member of `UseModalBaseOptions` or `ModalVariant` — the gate checks both ways. */
  readonly option: string;
  readonly dependsOn?: readonly string[];
  readonly excludes?: readonly string[];
  /** Entry points or variants that accept it and do nothing with it. */
  readonly ignoredBy?: readonly string[];
  readonly enforcement: Enforcement;
  readonly note: string;
  readonly reference?: TestReference;
};

/** One capability, across the three bindings. */
export type BindingRow = {
  readonly capability: string;
  readonly react: Cell;
  readonly solid: Cell;
  readonly vanilla: Cell;
};

/** One fact about the platform, or about two features meeting. */
export type PlatformRow = {
  readonly fact: string;
  readonly state: CellState;
  readonly why: string;
  readonly reference?: TestReference;
  /** An open question this row carries despite its state — see {@link Cell.caveat}. */
  readonly caveat?: string;
};

// ── Axis A — option × option ──────────────────────────────────────────────────
//
// One row per option, and the interesting column is `enforcement`: **exactly one pair is `TYPE`
// today** — `nonModal` against the two dismissal options, through `ModalVariant`'s discriminated
// union, pinned by two `@ts-expect-error` assertions in `core/__tests__/type-model.test.ts`.
// Everything else is a function that narrows at run time, or a sentence.

export const OPTION_ROWS: readonly OptionRow[] = [
  {
    option: 'id',
    enforcement: 'RUNTIME',
    note: 'The manager’s key. Two live modals sharing one id is last-registration-wins, which is why the playground’s microfrontend demo namespaces them.',
  },
  {
    option: 'render',
    excludes: ['umbra/vanilla'],
    enforcement: 'TYPE',
    note: '`BindDialogOptions` is an `Omit<…, "render">`: a controller does not render, so passing one is a type error rather than an ignored option.',
  },
  {
    option: 'animation',
    dependsOn: ['style'],
    enforcement: 'RUNTIME',
    note: '`resolveAnimation` fills the optional halves once, so the declared `transition` and the `transitionend` the close waits on cannot disagree.',
  },
  {
    option: 'style',
    enforcement: 'RUNTIME',
    note: 'Merged _over_ a template’s structural styles and over the placement, so a caller always wins. A `<dialog>` keeps the UA’s `fit-content` unless this says otherwise.',
    reference: {
      file: 'src/utils/__tests__/animation-utils.test.ts',
      title: 'a custom style wins over the placement it would fight',
    },
  },
  {
    option: 'dismissKey',
    excludes: ['an action that declares the same hotkey'],
    enforcement: 'RUNTIME',
    note: '`engine.ownsHotkey` is asked at keydown, so an action claiming the key suppresses the dismissal rather than both firing. `false` turns the key off entirely.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'Escape defers to the action that claimed it',
    },
  },
  {
    option: 'onDismissRequest',
    dependsOn: ['dismissKey'],
    enforcement: 'RUNTIME',
    note: 'Replaces the *last* step of the dismiss key and nothing before it — which key, whether an action claimed it, whether a popup answers it first, whether a `prepare` or a running action forbids it, and which dialog is in front are all still the library’s. `dismissKey: false` turns the key off, so nothing is requested either. Returning `false` declines the press, which only the non-modal listener acts on: it captures, so a press it takes is one the page never sees.',
    reference: {
      file: 'src/core/__tests__/dismiss-request.ct.tsx',
      title: 'a declined press is left travelling',
    },
  },
  {
    option: 'dismissWhilePreparing',
    dependsOn: ['prepare'],
    enforcement: 'RUNTIME',
    note: 'One of the four inputs to `canDismiss`, which every dismissal path shares. Without `prepare` there is no preparing state for it to describe.',
  },
  {
    option: 'containFocus',
    ignoredBy: ['nonModal: false'],
    enforcement: 'PROSE',
    note: 'The Tab wrap `show()` does not give a dialog. A modal one is already trapped by the top layer, so the option is inert there — accepted, and nothing says so but a sentence.',
  },
  {
    option: 'onOpenRequest',
    enforcement: 'RUNTIME',
    note: 'The asking door: refusal is explicit through `request.refuse(reason)`, acceptance is the default because the manager cannot infer it — React’s open is asynchronous.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'a refused request reports why, and nothing opens',
    },
  },
  {
    option: 'onKeyDown',
    enforcement: 'RUNTIME',
    note: 'Scoped with `isOwnEventTarget`, so a modal opened from inside this one does not deliver its keys here on the way up.',
  },
  {
    option: 'prepare',
    enforcement: 'RUNTIME',
    note: 'Gates the open and receives an `AbortSignal` the close aborts. `isPreparing` tracks the callback, not the `opening` phase.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'a controller destroyed mid-prepare does not leave the dialog marked busy',
    },
  },
  {
    option: 'onClose',
    enforcement: 'TYPE',
    note: 'Takes `CloseResult<TData, TReason>`, so declaring the reasons on the hook is what makes a `switch` over them exhaustive.',
  },
  {
    option: 'ariaLabel',
    excludes: ['ariaLabelledBy'],
    enforcement: 'PROSE',
    note: 'Both may be passed and the platform prefers `aria-labelledby`; nothing rejects the pair. Omitted entirely when absent, because `aria-label=""` would hide the omission from an audit.',
  },
  {
    option: 'ariaLabelledBy',
    dependsOn: ['an element with that id, rendered by the time prepare settles'],
    enforcement: 'RUNTIME',
    note: '`syncLabellingDiagnostics` reports ids that resolve to nothing — reading the element, not the options, because in `umbra/vanilla` the markup is the caller’s. Silent until `setLogLevel`.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'reports a reference the caller’s markup gets wrong',
    },
  },
  {
    option: 'ariaDescribedBy',
    enforcement: 'PROSE',
    note: 'Not required by `role: "alertdialog"`, deliberately: the APG says to omit a description when the content has semantic structure, so a type would turn a conditional recommendation into a rule.',
  },
  {
    option: 'role',
    enforcement: 'TYPE',
    note: 'A closed union of `"dialog" | "alertdialog"`. Deliberately not the whole ARIA surface — a `<dialog>` is a dialog, and a surface that is not one wants a live region inside it.',
  },
  {
    option: 'template',
    enforcement: 'RUNTIME',
    note: 'Free-form, and read by exactly one library path: the `StackModal` handed to a `prioritize` policy. That is how "every drawer under every alert" is expressed.',
    reference: {
      file: 'src/manager/__tests__/stack-order.test.ts',
      title: 'the policy is told what a dialog is, and asked once per dialog',
    },
  },
  {
    option: 'clipContainer',
    dependsOn: ['nonModal', 'portal: false'],
    enforcement: 'PROSE',
    note: '`@internal` and set by the template hooks whose entrance slides past the container edge. Only affects the contained path; ignored elsewhere with nothing but this to say so.',
  },
  {
    option: 'portal',
    ignoredBy: ['nonModal: false'],
    enforcement: 'PROSE',
    note: 'A modal dialog is placed by the top layer, so `portal` changes nothing for it. In `umbra/vanilla` it selects the placement and does **not** move the element — the markup is the caller’s.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'portal places without relocating',
    },
  },
  {
    option: 'nonModal',
    excludes: ['dismissOnBackdropClick when true', 'dismissOnClickOutside when false'],
    enforcement: 'TYPE',
    note: '**The one pair the checker holds.** `ModalVariant` is a discriminated union, so the wrong dismissal option for the variant is a compile error rather than an option that is silently read by nobody.',
    reference: {
      file: 'src/core/__tests__/type-model.test.ts',
      title: 'the documented variant combinations are the ones that compile',
    },
  },
  {
    option: 'dismissOnBackdropClick',
    dependsOn: ['nonModal: false', 'at least one declared action'],
    excludes: ['dismissOnClickOutside'],
    enforcement: 'TYPE',
    note: 'Opt-in, and gated on `hasActions()` as well — a modal that has drawn no action does not dismiss on its backdrop, which is why `undeclare` matters beyond stale hotkeys.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'unbinding an action retires it — backdrop dismissal comes back',
    },
  },
  {
    option: 'dismissOnClickOutside',
    dependsOn: ['nonModal: true'],
    excludes: ['dismissOnBackdropClick'],
    enforcement: 'TYPE',
    note: 'The non-modal half. A modal dialog has no outside to click — the top layer swallows it — which is why these are two options and not one.',
  },
];

// ── Axis B — capability × binding ─────────────────────────────────────────────
//
// `binding-parity.test.ts` already diffs the *names* the two hook bindings export and refuses to
// follow `export *`. What it cannot express is what a name does differently, or which binding a
// capability has actually been exercised on — and that second column is where this axis earns its
// keep. Fifteen capabilities are proven on React and on nothing else.

export const BINDING_ROWS: readonly BindingRow[] = [
  {
    capability: 'open / close / the typed close reason',
    react: {
      state: 'works',
      reference: {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'closes with reason "confirm" via controller',
      },
    },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'an action closes with its own reason',
      },
    },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a bound action closes with its own reason',
      },
    },
  },
  {
    capability: 'the render callback and the Modal it returns',
    react: {
      state: 'works',
      reference: {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'opens when open() is called',
      },
    },
    solid: {
      state: 'works',
      note: 'Live values are getters, so the render args must not be destructured.',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'the template’s context stays live, because it is merged and not spread',
      },
    },
    vanilla: {
      state: 'no-by-design',
      note: 'A controller does not render. Shipping one would mean shipping UI, which is the library’s one refusal.',
    },
  },
  {
    capability: 'portal: true',
    react: { state: 'works', note: '`createPortal` returns a node the caller still places.' },
    solid: {
      state: 'works',
      note: 'The binding mounts the element itself, so `Modal` is `null`.',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'portal: true mounts the dialog itself and leaves Modal null',
      },
    },
    vanilla: {
      state: 'partial',
      note: 'Selects the placement, does not relocate: the `<dialog>` is markup the caller wrote. So `fixed` reaches the viewport only if they placed it outside any transformed ancestor.',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'portal places without relocating',
      },
    },
  },
  {
    capability: 'ModalOutlet',
    react: {
      state: 'works',
      reference: {
        file: 'src/react/__tests__/modal-outlet.ct.tsx',
        title: 'renders modal via outlet without {Modal} in JSX',
      },
    },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'an outlet renders the dialog and Modal becomes null',
      },
    },
    vanilla: { state: 'no-by-design', note: 'No render pass, so nothing for an outlet to place.' },
  },
  {
    capability: 'the action factory (action(reason, …))',
    react: { state: 'works' },
    solid: {
      state: 'works',
      note: 'Re-wrapped to attach `undeclare`, because Solid never re-runs the parent and a button removed by its own `<Show>` has to retire itself.',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'a removed action stops counting — backdrop dismissal comes back',
      },
    },
    vanilla: {
      state: 'no-by-design',
      note: 'No declaration window. `bindAction(button, reason)` attaches to a button that already exists and its unbind retires it.',
    },
  },
  {
    capability: 'per-action running state',
    react: { state: 'works', note: '`action.isRunning(reason)`.' },
    solid: {
      state: 'works',
      note: 'Same name, and it stays live through the wrapper — which is what the test pins.',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'action.isRunning names which one, and survives the binding’s own wrapper',
      },
    },
    vanilla: {
      state: 'works',
      note: 'Spelled `isActionRunning(reason)` on the controller: there is no factory to hang it on.',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'isActionRunning answers for one action, off the button',
      },
    },
  },
  {
    capability: 'useLookup',
    react: { state: 'works', note: 'Returns the `ModalInfo` object.' },
    solid: {
      state: 'works',
      note: 'Returns an accessor: a discriminated union cannot survive being spread into getters without losing the narrowing.',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'the manager hooks are live from outside the panel',
      },
    },
    vanilla: {
      state: 'works',
      note: 'Through `manager.lookup(id)` — the same answer, without a reactive wrapper.',
    },
  },
  {
    capability: 'phase, exposed to the caller',
    react: {
      state: 'no-by-design',
      note: 'A phase moves while the dialog is up; exposing it invites logic keyed on a transition. `isVisible` and `isPreparing` are the two answers a caller needs.',
    },
    solid: {
      state: 'no-by-design',
      note: 'Same reason, and the getters make it worse: a phase read inside JSX would subscribe that expression to every transition.',
    },
    vanilla: {
      state: 'works',
      note: 'The controller has no render pass, so its snapshot is the only clock a caller can read.',
    },
  },
  {
    capability: 'prioritize (the stack policy)',
    react: {
      state: 'works',
      reference: {
        file: 'src/manager/__tests__/stack-priority.ct.tsx',
        title: 'with a policy the high-priority dialog stays in front of a later open',
      },
    },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'the policy is inherited by this binding too',
      },
    },
    vanilla: {
      state: 'works',
      note: 'Including a dialog inside a shadow root.',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'the policy puts it in front of a light-DOM dialog opened later',
      },
    },
  },
  {
    capability: 'focusOnOpen',
    react: { state: 'works' },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'focusOnOpen claims the opening focus',
      },
    },
    vanilla: {
      state: 'works',
      note: 'On a button the library never rendered — the caller forwards `data-focus-on-open`.',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'focusOnOpen claims the opening focus on a button it never rendered',
      },
    },
  },
  {
    capability: 'focus restored after a failed action',
    react: { state: 'works' },
    solid: {
      state: 'partial',
      note: 'Focus lands on the `<dialog>` rather than on the button that ran the action — **measured**, and it is the race `attach-focus.ts` documents for `umbra/vanilla` reaching a second binding. Solid writes the action props’ `disabled` getter synchronously when the engine reports running, so the button is blurred before `captureActionRunner` reads `activeElement`; the `lastFocusInside` floor that catches this for the controller does not catch it here. Diagnosed, not fixed — a fix belongs with the coordinator rather than with a test.',
    },
    vanilla: {
      state: 'works',
      note: 'Reads `focusin` rather than `activeElement`, because this binding’s own `bindAction` disables the button synchronously first.',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a failed action hands focus back to the button that ran it',
      },
    },
  },
  {
    capability: 'the labelling diagnostic',
    react: { state: 'works' },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'says nothing about a name its prepare had not rendered yet',
      },
    },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'reports a dialog with no accessible name at all',
      },
    },
  },
  {
    capability: 'onOpenRequest',
    react: { state: 'works' },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'onOpenRequest can refuse, and the refusal carries its reason',
      },
    },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'an accepted request opens the dialog',
      },
    },
  },
  {
    capability: 'containFocus',
    react: { state: 'works' },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'containFocus wraps Tab inside a non-modal panel',
      },
    },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'containFocus wraps Tab inside the panel',
      },
    },
  },
  {
    capability: 'dismissOnClickOutside',
    react: { state: 'works' },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'dismissOnClickOutside closes it on a click in the page',
      },
    },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'dismissOnClickOutside closes it on a click in the page',
      },
    },
  },
  {
    capability: 'dismissOnBackdropClick',
    react: { state: 'works' },
    solid: {
      state: 'works',
      note: 'Reached through the `undeclare` test, which asserts dismissal coming back.',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'a removed action stops counting — backdrop dismissal comes back',
      },
    },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'unbinding an action retires it — backdrop dismissal comes back',
      },
    },
  },
  {
    capability: 'a custom dismissKey',
    react: { state: 'works' },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'a custom dismissKey closes it, and Escape does not',
      },
    },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a custom dismissKey closes it, and Escape does not',
      },
    },
  },
  {
    capability: 'prepare aborted by a close',
    react: { state: 'works' },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'a close aborts the prepare it was waiting on',
      },
    },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a controller destroyed mid-prepare does not leave the dialog marked busy',
      },
    },
  },
  {
    capability: 'reconcileOpen',
    react: {
      state: 'works',
      reference: {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'the prop drives the dialog, and stays authoritative over an imperative open',
      },
    },
    solid: {
      state: 'works',
      reference: {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'the signal drives the dialog, and stays authoritative over an imperative open',
      },
    },
    vanilla: {
      state: 'works',
      note: 'Read off the snapshot the controller publishes rather than through `useLookup`, which is why `phase` is on this binding’s surface and on neither of the others.',
      caveat:
        'The `phase`-versus-`isVisible` half is proven on React only: moving the decision to `isVisible` fails there and does not here, and why it does not is unexplained rather than accounted for.',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'the flag drives the dialog, and stays authoritative over an imperative open',
      },
    },
  },
  {
    capability: 'a dialog inside a shadow root',
    react: { state: 'works-untested' },
    solid: { state: 'works-untested' },
    vanilla: {
      state: 'works',
      reference: {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a dialog in a shadow root gets the library backdrop and its opening focus',
      },
    },
  },
];

// ── Axis C — the platform, and features meeting each other ────────────────────

export const PLATFORM_ROWS: readonly PlatformRow[] = [
  {
    fact: 'z-index orders two dialogs in the top layer',
    state: 'no-platform',
    why: 'Top-layer elements paint in the order they were added and `z-index` does not apply between them — measured: a dialog stamped `z-index: 9999` still paints under one shown after it. Moving one is `close()` + `showModal()` and nothing cheaper.',
    reference: {
      file: 'src/manager/__tests__/stack-priority.ct.tsx',
      title: 'with a policy the high-priority dialog stays in front of a later open',
    },
  },
  {
    fact: 'a non-modal dialog can sit above a modal one',
    state: 'no-platform',
    why: 'The top layer paints above ordinary content and no `z-index` reaches between them. So modality is the first sort key and a policy cannot overrule it — a big number on a panel ranks it against the other panels only.',
    reference: {
      file: 'src/manager/__tests__/stack-order.test.ts',
      title: 'a policy cannot lift a non-modal dialog over a modal one',
    },
  },
  {
    fact: 'a raise avoids firing the element’s native close event',
    state: 'no-platform',
    why: '`close()` queues the event, so it arrives with `dialog.open` already back to `true` — which is the only guard a listener has for telling a raise from a real close. It matters most in `umbra/vanilla`, where the listener is the caller’s.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'a raise fires the native close event, with the dialog already open again',
    },
  },
  {
    fact: 'a raise keeps the caret where the user left it',
    state: 'partial',
    why: 'Restored for the dialog that **held** the keyboard — the case a late policy install hits. One that did not is re-shown by `showModal()`, and where focus lands then is **the engine’s answer, not the library’s**: Chromium puts it on the dialog’s first focusable, WebKit preserves the field. So the guarantee is that the dialog in front keeps the keyboard; the position is not one, and a test that pinned a control was pinning one engine. Fixing it for real means teaching the `focusin` bookkeeping to ignore focus the library itself moves during a raise, which needs a window `raiseDialog` can publish and the coordinator can read.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'a policy installed over it keeps the caret where it was',
    },
  },
  {
    fact: 'installing a policy over dialogs already open is minimal',
    state: 'partial',
    why: 'The top layer is not tracked until a policy exists, so the first plan compares against nothing and re-shows every open modal dialog, bottom-first. Seeding the tracking at install time would fix it — and would also make the focus restore above dead, which is a decision rather than a tidy-up. Installing at start-up costs nothing.',
  },
  {
    fact: 'the adopted stylesheet reaches a dialog inside a shadow root',
    state: 'works',
    why: '`adoptedStyleSheets` does not cross a shadow boundary, so the sheet is adopted per **root** rather than per document — `showDialog` adopts into `dialog.getRootNode()` on every open, idempotent. Without it the dialog shows the UA backdrop, measured at `rgba(0, 0, 0, 0.1)`.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'a dialog in a shadow root gets the library backdrop and its opening focus',
    },
  },
  {
    fact: 'one Escape closes only the dialog it was pressed in',
    state: 'works',
    why: 'A modal opened from inside another renders its `<dialog>` in that subtree, so every event bubbles through the one underneath. `isOwnEventTarget` and `queryOwn` scope both the keydown and the hotkey dispatch.',
    reference: {
      file: 'src/react/__tests__/use-modal.ct.tsx',
      title: 'the dismiss key unwinds the stack one modal per press, front to back',
    },
  },
  {
    fact: 'Escape is always answered by someone',
    state: 'no-by-design',
    why: 'Put a modal with `dismissKey: false` in front of a non-modal panel and **nothing closes** — the modal was told not to listen and the panel is no longer the foreground. That is the right answer rather than a gap: the front dialog is what the user is looking at and it opted out, so falling through to the panel behind would close the one thing they cannot see. What makes it acceptable rather than a dead keyboard is measured separately — the press is **not swallowed**, so the application can still handle it, while a press the panel *does* claim is stopped at the capture phase and never reaches the page. Both directions of that are asserted.',
    reference: {
      file: 'src/react/__tests__/use-modal.ct.tsx',
      title: 'a deaf modal in front leaves the panel behind alone, and the press reaches the page',
    },
  },
  {
    fact: 'a modal dialog’s own sizing survives the UA’s max-width',
    state: 'no-platform',
    why: '`dialog:modal` gets `max-width/max-height: calc(100% - 6px - 2em)` — 337px on a 375px phone, so a panel asking for `min(600px, 92vw)` is cut by eight pixels. Above roughly 475px the two agree, which is why it survives every desktop review.',
  },
  {
    fact: 'a 1px border flush to the dialog’s edge draws fully',
    state: 'no-platform',
    why: 'A `<dialog>` keeps `fit-content` and `margin: auto`, so its box lands on a fraction of a pixel and how much of the last one the compositor keeps is not the author’s to decide. Measured: three dialogs kept 16%, 91% and 73% of an identical right border. User-land fix — inset it, or size in whole pixels.',
  },
  {
    fact: 'a contained non-modal panel needs nothing from the caller',
    state: 'no-by-design',
    why: 'It is `absolute` against a library-owned host that is itself `absolute; inset: 0` over the nearest sized, positioned ancestor — so the caller must provide that region or the panel collapses. Absolute rather than in-flow because a `height: 100%` block is laid out after the content it should cover.',
    reference: {
      file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
      title: 'positions the panel against the dialog’s parent by default',
    },
  },
  {
    fact: 'the body scroll lock is safe with two managers on one page',
    state: 'works',
    why: 'Claimed per owner and released when the last claim goes: the target is one global `<body>`, and a shared boolean would make it last-writer-wins.',
    reference: {
      file: 'src/manager/__tests__/dialog-manager.ct.tsx',
      title: 'two managers both holding the lock release it only when the last one lets go',
    },
  },
  {
    fact: 'the scroll lock compensates the right width',
    state: 'works',
    why: 'It pads by what the lock **actually reclaims**, not by the current scrollbar width — a page with `scrollbar-gutter: stable` keeps its gutter through `overflow: hidden`, so the naive version shifts content inward.',
    reference: {
      file: 'src/manager/__tests__/scroll-lock.test.ts',
      title: 'scrollbar-gutter: stable — gutter survives the lock, so compensation is zero',
    },
  },
  {
    fact: 'a policy orders two copies of the library on one page',
    state: 'no-by-design',
    why: 'A policy is installed on one manager and orders that manager’s dialogs. Two independent copies share the top layer and know nothing of each other — which is the microfrontend case the feature exists for, and the reason it is documented as a per-project decision.',
  },
  {
    fact: 'the React Compiler is verified to have run',
    state: 'works',
    why: '`verify:package` asserts both halves of the one grep the docs point at: the built `react/use-modal.js` imports React’s `compiler-runtime` **and** opens with a `c(n)` memo-cache allocation — the import alone would survive a build that compiled one trivial function and bailed on the hook. The complement is asserted too: the Solid binding must contain no `compiler-runtime`, since the compiler decides what a hook is by name and `umbra/solid` exports `useModal` as well. Seen to fail by restoring the pre-rolldown `react({ babel: … })` wiring, which is accepted and transforms nothing.',
  },
  {
    fact: 'nothing in the repo still needs TypeScript 6',
    state: 'partial',
    why: 'The linter runs on the TS 7 compiler through tsgolint. `typescript@6.0.3` remains for **typedoc alone**, whose two remaining jobs are `docs:check` and the JSON model behind the playground’s `/api` page — the HTML half is gone. TS 7 ships an API (`typescript/unstable/sync`) and it is **most of the way there**: exports, doc comments, `@example` tags, `typeToString` and `emitter.printNode` all work, and a lazy declaration node inflates through `resolve()`. Three measured blockers remain, and the middle one is the surprise: the resolved node exposes **no child traversal** (`children` is `undefined`, and no `forEachChild` is exported), so a syntax-level check like `notExported` cannot be written; walking the resolved _type graph_ instead is semantically the wrong question — it reports **0** findings against typedoc’s 10 allowances, because an alias resolves away; and the server **panics** rather than throwing on an unsupported checker call, so preconditions must be guarded rather than probed. So the `/api` model is the nearer half of this, not the validator.',
  },
];

// ── Rendering ─────────────────────────────────────────────────────────────────

const SYMBOL: Record<CellState, string> = {
  works: '✓',
  'works-untested': '✓ untested',
  partial: '~',
  'no-platform': '✗ platform',
  'no-by-design': '✗ by design',
  'n-a': 'n/a',
};

/** Every state that puts a cell on the worklist. */
export const OPEN_STATES: readonly CellState[] = ['works-untested', 'partial'];

const escapeCell = (text: string): string => {
  return text.replaceAll('|', '\\|');
};

const cell = (value: Cell): string => {
  const note = value.note === undefined ? '' : ` — ${value.note}`;
  // The caveat is rendered too, or the document would hide what `yarn todo` prints — and a reader of
  // the table is exactly who needs to know a ✓ has a hole in it.
  const caveat = value.caveat === undefined ? '' : ` **Still open:** ${value.caveat}`;
  return escapeCell(`${SYMBOL[value.state]}${note}${caveat}`);
};

const list = (label: string, values: readonly string[] | undefined): string => {
  return values === undefined || values.length === 0 ? '' : `**${label}** ${values.join(', ')}. `;
};

/**
 * The whole matrix as the markdown block `API.md` carries.
 *
 * Rendered rather than hand-written on both sides, and the gate compares the two — a table kept in
 * two places is a table that disagrees in one of them, which is the failure this file was created to
 * end rather than to repeat.
 */
export function renderMatrix(): string {
  const lines: string[] = [];

  lines.push('### The states', '');
  lines.push('| Symbol | Means | On the worklist? |');
  lines.push('| --- | --- | --- |');
  lines.push('| ✓ | works, and a named test proves it | no |');
  lines.push('| ✓ untested | should work, nothing verifies it | **yes** — write the test |');
  lines.push('| ~ | half works, and the limit is written down and fixable | **yes** |');
  lines.push(
    '| ✗ platform | the browser forbids it; no implementation would change it | no — never |'
  );
  lines.push('| ✗ by design | the library refuses, with a documented reason | no |');
  lines.push('| n/a | the combination has no meaning on this path | no |');
  lines.push('');
  lines.push(
    'The two kinds of ✗ are **not the same fact**, and keeping them apart is the point: without the split, a list of everything that does not work contains items nobody can ever act on, and a real gap reads like a platform law.'
  );
  lines.push('');

  lines.push('### Option × option', '');
  lines.push(
    'One row per option a caller can pass. The **held by** column is the one to read: `TYPE` means the checker rejects the wrong combination, `RUNTIME` means a named function narrows or refuses, `PROSE` means a sentence and nothing else — so every `PROSE` row is a candidate to become one of the other two. **Exactly one pair is `TYPE` today**: `nonModal` against the two dismissal options, through `ModalVariant`.'
  );
  lines.push('');
  lines.push('| Option | Held by | Notes |');
  lines.push('| --- | --- | --- |');
  for (const row of OPTION_ROWS) {
    const relations = `${list('Depends on', row.dependsOn)}${list('Excludes', row.excludes)}${list('Ignored by', row.ignoredBy)}`;
    lines.push(
      `| \`${row.option}\` | ${row.enforcement} | ${escapeCell(`${relations}${row.note}`)} |`
    );
  }
  lines.push('');

  lines.push('### Capability × binding', '');
  lines.push(
    '`binding-parity.test.ts` diffs the _names_ the two hook bindings export. This is what it cannot express: what a name does differently, and which binding a capability has actually been exercised on.'
  );
  lines.push('');
  lines.push('| Capability | `umbra/react` | `umbra/solid` | `umbra/vanilla` |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of BINDING_ROWS) {
    lines.push(
      `| ${escapeCell(row.capability)} | ${cell(row.react)} | ${cell(row.solid)} | ${cell(row.vanilla)} |`
    );
  }
  lines.push('');

  lines.push('### The platform, and features meeting each other', '');
  lines.push('| Can it? | | Why |');
  lines.push('| --- | --- | --- |');
  for (const row of PLATFORM_ROWS) {
    lines.push(`| ${escapeCell(row.fact)} | ${SYMBOL[row.state]} | ${escapeCell(row.why)} |`);
  }

  return lines.join('\n');
}

/**
 * Everything the table leaves open — the backlog it produces rather than describes.
 *
 * Two kinds, and the second is the one a state-only reading misses: a cell whose **state** is open
 * (`✓ untested`, `~`), and a cell that is otherwise done but carries a `caveat`. Both are printed by
 * `yarn todo`, which is the answer to "is there anything else to validate" — there is one place to ask,
 * and it is generated from the same data the document is.
 */
export function worklist(): string[] {
  const open = (state: CellState): boolean => {
    return OPEN_STATES.includes(state);
  };
  return [
    ...BINDING_ROWS.flatMap((row) => {
      return (
        [
          ['umbra/react', row.react],
          ['umbra/solid', row.solid],
          ['umbra/vanilla', row.vanilla],
        ] as const
      )
        .filter(([, value]) => {
          return open(value.state);
        })
        .map(([binding, value]) => {
          return `${SYMBOL[value.state]}  ${row.capability} — ${binding}`;
        });
    }),
    ...PLATFORM_ROWS.filter((row) => {
      return open(row.state);
    }).map((row) => {
      return `${SYMBOL[row.state]}  ${row.fact}`;
    }),
    // The caveats, whatever their cell's state — including the ones whose state says "done".
    ...BINDING_ROWS.flatMap((row) => {
      return (
        [
          ['umbra/react', row.react],
          ['umbra/solid', row.solid],
          ['umbra/vanilla', row.vanilla],
        ] as const
      )
        .filter(([, value]) => {
          return value.caveat !== undefined;
        })
        .map(([binding, value]) => {
          return `? (${SYMBOL[value.state]})  ${row.capability} — ${binding}: ${value.caveat ?? ''}`;
        });
    }),
    ...PLATFORM_ROWS.filter((row) => {
      return row.caveat !== undefined;
    }).map((row) => {
      return `? (${SYMBOL[row.state]})  ${row.fact}: ${row.caveat ?? ''}`;
    }),
  ];
}

/** Every reference any cell rests on, for the gate to resolve. */
export function allReferences(): readonly {
  readonly where: string;
  readonly ref: TestReference;
}[] {
  return [
    ...OPTION_ROWS.flatMap((row) => {
      return row.reference === undefined
        ? []
        : [{ where: `option ${row.option}`, ref: row.reference }];
    }),
    ...BINDING_ROWS.flatMap((row) => {
      return (
        [
          ['react', row.react],
          ['solid', row.solid],
          ['vanilla', row.vanilla],
        ] as const
      ).flatMap(([binding, value]) => {
        return value.reference === undefined
          ? []
          : [{ where: `${row.capability} (${binding})`, ref: value.reference }];
      });
    }),
    ...PLATFORM_ROWS.flatMap((row) => {
      return row.reference === undefined ? [] : [{ where: row.fact, ref: row.reference }];
    }),
  ];
}
