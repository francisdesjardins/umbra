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
  /**
   * Why the cell is what it is — **required of a refusal and of a `~`**, whose whole content is the
   * explanation, and checked as such by the gate.
   *
   * Split from {@link Cell.note} because the two are different obligations wearing one word: a `✓`
   * may carry a note or carry nothing, while `✗ by design` and `~` owe an answer and a reader who
   * does not get one has been told a feature is missing and not why. `PlatformRow` has always
   * spelled this `why`; a cell is the same claim at a smaller scale.
   */
  readonly why?: string;
  /** Elaboration a `✓` does not owe — how it works, what it costs, what it is not. */
  readonly note?: string;
  readonly references?: readonly TestReference[];
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
  readonly references?: readonly TestReference[];
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
  readonly references?: readonly TestReference[];
  /** An open question this row carries despite its state — see {@link Cell.caveat}. */
  readonly caveat?: string;
};

// ── Axis A — option × option ──────────────────────────────────────────────────
//
// One row per option, and the interesting column is `enforcement`: **two pairs are `TYPE`
// today**, both through `ModalVariant`'s discriminated union and both pinned by `@ts-expect-error`
// assertions in `core/__tests__/type-model.test.ts` — `nonModal` against the two dismissal
// options, and `nonModal: true` against `role: 'alertdialog'`. Everything else is a function that
// narrows at run time, or a sentence.

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
    references: [
      {
        file: 'src/utils/__tests__/animation-utils.test.ts',
        title: 'a custom style wins over the placement it would fight',
      },
    ],
  },
  {
    option: 'dismissKey',
    excludes: ['an action that declares the same hotkey'],
    enforcement: 'RUNTIME',
    note: '`engine.ownsHotkey` is asked at keydown, so an action claiming the key suppresses the dismissal rather than both firing. `false` turns the key off entirely.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'Escape defers to the action that claimed it',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'dismissKey: false disables all key-based dismissal',
      },
    ],
  },
  {
    option: 'onDismissRequest',
    dependsOn: ['dismissKey', 'dismissOnBackdropClick', 'dismissOnClickOutside'],
    enforcement: 'RUNTIME',
    note: 'Replaces the *last* step of **every** user-initiated dismissal and nothing before it — which key, whether an action claimed it, whether a popup answers it first, where the pointer landed, whether a `prepare` or a running action forbids it, and which dialog is in front are all still the library’s. So it depends on all three doors: whichever is switched off requests nothing, and `dismissKey: false` is the same statement about the key. The handler is told which door through `DismissCause`, since one owner answering three of them can otherwise only guess. Returning `false` declines, which only the non-modal dismiss-key listener acts on: it captures, so a press it takes is one the page never sees — nothing is prevented on a pointer path, so a declined click is just a dialog left open.',
    references: [
      {
        file: 'src/core/__tests__/dismiss-request.ct.tsx',
        title: 'a declined press is left travelling',
      },
      {
        file: 'src/core/__tests__/dismiss-request.ct.tsx',
        title: 'the owner is told which door, and the key still says its own name',
      },
      {
        file: 'src/core/__tests__/dismiss-request.ct.tsx',
        title: 'reports the click and stays open',
      },
      {
        file: 'src/utils/__tests__/dismiss-gate.test.ts',
        title: 'tells the owner which door it came through',
      },
    ],
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
    enforcement: 'RUNTIME',
    note: 'Buys the Tab **wrap**, and only that. A modal dialog is wrapped by the top layer already, so the markers are redundant there — accepted and inert, which is what `ignoredBy` says. The recovery that used to share this flag does not: reaching the content from a focused `<dialog>` is unconditional now, on both variants, because it answers a platform disagreement rather than offering a choice. Off by default because on a toast or a popover keeping Tab inside is the defect rather than the fix.',
    references: [
      {
        file: 'src/core/__tests__/focus-containment.ct.tsx',
        title: 'a dead-space click leaves the keyboard reachable without containFocus',
      },
      {
        file: 'src/core/__tests__/focus-containment.ct.tsx',
        title: 'wraps Tab from the last stop back to the first',
      },
      {
        file: 'src/core/__tests__/focus-containment.ct.tsx',
        title: 'lets Tab walk out of it — which is what show() means',
      },
    ],
  },
  {
    option: 'onOpenRequest',
    enforcement: 'RUNTIME',
    note: 'The asking door: refusal is explicit through `request.refuse(reason)`, acceptance is the default because the manager cannot infer it — React’s open is asynchronous.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a refused request reports why, and nothing opens',
      },
    ],
  },
  {
    option: 'onKeyDown',
    enforcement: 'RUNTIME',
    note: 'Scoped with `isOwnEventTarget`, so a modal opened from inside this one does not deliver its keys here on the way up.',
  },
  {
    option: 'onError',
    enforcement: 'RUNTIME',
    note: 'Userland errors only, and only the two with nowhere else to go: a throwing `prepare` (the dialog is already shown and `isPreparing` settles either way, so the modal announces itself ready) and a throwing `onClose` (detached, with nothing left rendering). An action’s throw is already the render args’ `error`, `render` reaches the framework’s error boundary, and `onKeyDown` / `onClick` escape to the DOM listener that called them — none of those arrive here. The library’s own failures never do either: routing them into a consumer callback would make a bug unreportable. A report, not a veto — the close still completes.',
    references: [
      {
        file: 'src/core/__tests__/finalize-close.test.ts',
        title: 'a throwing onClose is normalized and reported as its own source',
      },
    ],
  },
  {
    option: 'prepare',
    enforcement: 'RUNTIME',
    note: 'Runs **after** the dialog is shown, alongside the entrance — it does not gate the open and cannot refuse it. `syncOpenSequence` shows the dialog and schedules the phase frame before starting it, and a `prepare` that throws is logged and settles like any other. What waits on it is `open()`’s promise, `isPreparing` and so `aria-busy`, and `dismissWhilePreparing`. Receives an `AbortSignal` the close aborts; `isPreparing` tracks the callback, not the `opening` phase.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a controller destroyed mid-prepare does not leave the dialog marked busy',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'closing aborts the work it started',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'a prepare that throws is reported, and the modal still settles',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'a modal with no prepare is not busy to begin with',
      },
    ],
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
    references: [
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: '`ariaLabel` names the dialog for assistive technology',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'a dialog given no name has none — the library never invents one',
      },
    ],
  },
  {
    option: 'ariaLabelledBy',
    dependsOn: ['an element with that id, rendered by the time prepare settles'],
    enforcement: 'RUNTIME',
    note: '`syncLabellingDiagnostics` reports ids that resolve to nothing — reading the element, not the options, because in `umbra/vanilla` the markup is the caller’s. Silent until `setLogLevel`.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'reports a reference the caller’s markup gets wrong',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'reports an `ariaLabelledBy` that points at no element',
      },
      {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'says nothing about a name its prepare had not rendered yet',
      },
      {
        file: 'src/utils/__tests__/logger.test.ts',
        title: 'logger is silent when no pattern is set',
      },
    ],
  },
  {
    option: 'ariaDescribedBy',
    enforcement: 'PROSE',
    note: 'Not required by `role: "alertdialog"`, deliberately: the APG says to omit a description when the content has semantic structure, so a type would turn a conditional recommendation into a rule.',
    references: [
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title:
          '`ariaLabelledBy` / `ariaDescribedBy` point at the content, and `role` can interrupt',
      },
    ],
  },
  {
    option: 'role',
    excludes: ['nonModal: true (for `"alertdialog"`)'],
    enforcement: 'TYPE',
    note: 'A closed union, and it narrows with the variant: the modal branch offers `"dialog" | "alertdialog"`, the non-modal branch `"dialog"` alone — an alertdialog is modal by definition, so the pair is unwritable rather than merely wrong. Deliberately not the whole ARIA surface — a `<dialog>` is a dialog, and a surface that is not one wants a live region inside it. For the markup the type cannot see, `umbra/vanilla`’s hand-written `role="alertdialog"` on a non-modal dialog is the labelling diagnostic’s third finding.',
    references: [
      {
        file: 'src/core/__tests__/dialog-labelling.test.ts',
        title: 'reports an alertdialog on a non-modal dialog',
      },
    ],
  },
  {
    option: 'template',
    enforcement: 'RUNTIME',
    note: 'Free-form, and read by exactly one library path: the `StackModal` handed to a `prioritize` policy. That is how "every drawer under every alert" is expressed.',
    references: [
      {
        file: 'src/manager/__tests__/stack-order.test.ts',
        title: 'the policy is told what a dialog is, and asked once per dialog',
      },
    ],
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
    note: 'A modal dialog is placed by the top layer, so `portal` changes nothing about where it *appears* — but **where it is mounted** still matters, because a dialog portaled out of a themed container, a design-system root or a microfrontend’s mount point loses whatever that ancestor provided. `true` is `document.body`; a getter names the host instead (`PortalTarget`), asked at placement rather than at hook-call time so a host still being rendered is found. A getter answering `null` falls back to the body and warns rather than un-portaling, the placement CSS having already been chosen. In `umbra/vanilla` it stays a `boolean`: that binding selects the placement and does **not** move the element — the markup is the caller’s — so a host it could only ignore is a type error instead.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'portal places without relocating',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'a portal host of the caller’s own is where the dialog lands',
      },
      {
        file: 'src/core/__tests__/modal-runtime.test.ts',
        title: 'a getter answering null falls back rather than un-portaling',
      },
    ],
  },
  {
    option: 'nonModal',
    excludes: ['dismissOnBackdropClick when true', 'dismissOnClickOutside when false'],
    enforcement: 'TYPE',
    note: '**The one pair the checker holds.** `ModalVariant` is a discriminated union, so the wrong dismissal option for the variant is a compile error rather than an option that is silently read by nobody.',
    references: [
      {
        file: 'src/core/__tests__/type-model.test.ts',
        title: 'the documented variant combinations are the ones that compile',
      },
    ],
  },
  {
    option: 'dismissOnBackdropClick',
    dependsOn: ['nonModal: false', 'at least one declared action'],
    excludes: ['dismissOnClickOutside'],
    enforcement: 'TYPE',
    note: 'Opt-in, and gated on `hasActions()` as well — a modal that has drawn no action does not dismiss on its backdrop, which is why `undeclare` matters beyond stale hotkeys.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'unbinding an action retires it — backdrop dismissal comes back',
      },
    ],
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
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'closes with reason "confirm" via controller',
        },
      ],
    },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'an action closes with its own reason',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'a bound action closes with its own reason',
        },
      ],
    },
  },
  {
    capability: 'the render callback and the Modal it returns',
    react: {
      state: 'works',
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'opens when open() is called',
        },
      ],
    },
    solid: {
      state: 'works',
      note: 'Live values are getters, so the render args must not be destructured.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'the template’s context stays live, because it is merged and not spread',
        },
      ],
    },
    vanilla: {
      state: 'no-by-design',
      why: 'A controller does not render. Shipping one would mean shipping UI, which is the library’s one refusal.',
    },
  },
  {
    capability: 'portal: true',
    react: { state: 'works', note: '`createPortal` returns a node the caller still places.' },
    solid: {
      state: 'works',
      note: 'The binding mounts the element itself, so `Modal` is `null`.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'portal: true mounts the dialog itself and leaves Modal null',
        },
      ],
    },
    vanilla: {
      state: 'partial',
      why: 'Selects the placement, does not relocate: the `<dialog>` is markup the caller wrote. So `fixed` reaches the viewport only if they placed it outside any transformed ancestor.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'portal places without relocating',
        },
      ],
    },
  },
  {
    capability: 'ModalOutlet',
    react: {
      state: 'works',
      references: [
        {
          file: 'src/react/__tests__/modal-outlet.ct.tsx',
          title: 'renders modal via outlet without {Modal} in JSX',
        },
      ],
    },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'an outlet renders the dialog and Modal becomes null',
        },
      ],
    },
    vanilla: { state: 'no-by-design', why: 'No render pass, so nothing for an outlet to place.' },
  },
  {
    capability: 'the action factory (action(reason, …))',
    react: { state: 'works' },
    solid: {
      state: 'works',
      note: 'Re-wrapped to attach `undeclare`, because Solid never re-runs the parent and a button removed by its own `<Show>` has to retire itself.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'a removed action stops counting — backdrop dismissal comes back',
        },
      ],
    },
    vanilla: {
      state: 'no-by-design',
      why: 'No declaration window. `bindAction(button, { reason })` attaches to a button that already exists and its unbind retires it.',
    },
  },
  {
    capability: 'per-action running state',
    react: { state: 'works', note: '`action.isRunning(reason)`.' },
    solid: {
      state: 'works',
      note: 'Same name, and it stays live through the wrapper — which is what the test pins.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'action.isRunning names which one, and survives the binding’s own wrapper',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: 'Spelled `isActionRunning(reason)` on the controller: there is no factory to hang it on.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'isActionRunning answers for one action, off the button',
        },
      ],
    },
  },
  {
    capability: 'useLookup',
    react: { state: 'works', note: 'Returns the `ModalInfo` object.' },
    solid: {
      state: 'works',
      note: 'Returns an accessor: a discriminated union cannot survive being spread into getters without losing the narrowing.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'the manager hooks are live from outside the panel',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: 'Through `manager.lookup(id)` — the same answer, without a reactive wrapper.',
    },
  },
  {
    capability: 'ModalRegistry — project-level id and contract typing',
    react: {
      state: 'works',
      note: 'A consumer augments `ModalRegistry` and every door narrows: `open`, `close`, `requestOpen`, `requestOpenAndWait`, `openAndWait`, `lookup` and `useModal`. An entry declares up to three things — `reason` and `data` for the close, `payload` for the open — so a request is checked against what the modal said it takes, in the same call whose result was already typed. The hook gains an overload that reads `data` and `reason` off the id, so a declared modal needs no type arguments at all; the per-call-site `useModal<TData, TReason>` form is untouched, and is what an empty registry resolves to. Proven at compile time rather than by a runtime test: `src/core/__tests__/registry.test-d.ts` asserts the empty state inside the main type-check, and `yarn type-check:registry` compiles `type-fixtures/` alone — declaration merging is global, so an augmented registry in the main project would hide the very fallback it asserts.',
      caveat:
        'Adoption is per modal, not all-or-nothing: an undeclared id still works, which is what lets a project host modals it does not own — the playground renders a few hundred of the library’s own harnesses. The trade is that a mistyped id is not an error, since an unknown one is supported; what an entry buys is its contract. `close` keeps per-id reason checking through one generic signature rather than an overload pair, because a failing first overload falls through to the permissive one instead of erroring — `requestOpen` is written the same way, and `requestOpenAndWait`, which needs its pair for the *return*, constrains the payload in **both** halves so neither rescues what the other rejected. **`onOpenRequest` is the one door that does not narrow**, deliberately: `PayloadOf` types the asking side, where both call sites are the project’s own, and the receiving side is where a message from outside arrives — a parameter annotated with a declaration nobody checked at run time would read as a guarantee never made.',
    },
    solid: {
      state: 'works',
      note: 'The same overload pair, over the same core types.',
    },
    vanilla: {
      state: 'works',
      note: 'The id is the manager\u2019s key rather than a renderer\u2019s, so `bindDialog` narrows with the rest.',
    },
  },
  {
    capability: 'register / unregister, so an open can wait for its dialog',
    react: {
      state: 'works',
      note: 'A modal joins the registry when its component mounts, so an imperative `open` from a service, a router guard or a deep link can arrive before the dialog behind a code-split route exists. Every other door already reported that — `openAndWait` resolves `[Error, null]`, `requestOpenAndWait` refuses with `not-registered` — while `open` only warned, and warnings are silent until `setLogLevel`. It answers `false` now, and `subscribe` carries the two registry moments beside the two screen ones, so the ask can be held until the dialog arrives. **No queue is shipped**: a pending open needs an expiry, and how long a deep link should wait for a route is the application’s question, the same reason nothing here auto-dismisses.',
      references: [
        {
          file: 'src/manager/__tests__/dialog-manager-registry.test.ts',
          title: 'open says so rather than doing nothing quietly',
        },
        {
          file: 'src/manager/__tests__/dialog-manager-registry.test.ts',
          title: 'the events are enough to hold an open until its dialog exists',
        },
        {
          file: 'src/manager/__tests__/dialog-manager-registry.test.ts',
          title: 'register lands with the dialog already openable',
        },
      ],
    },
    solid: {
      state: 'works',
      note: 'The manager’s own, and every binding registers through the same door.',
    },
    vanilla: {
      state: 'works',
      note: '`bindDialog` registers at bind and unregisters at `destroy()`, so a swap that rebinds is heard as the pair — which is the one arrangement where a consumer needs to know the registry moved.',
    },
  },
  {
    capability: 'dialogManager.openAndWait (the imperative instruct-and-await)',
    react: {
      state: 'works',
      note: 'A root export rather than a binding’s, for a module with no component to hold a hook’s `openAndWait` — a service, a router guard, a worker. Resolves the same `[error, result]` tuple, typed by the registry, and takes the `[Error, null]` branch rather than hanging or lying in the two cases that cannot be answered: an id nobody registered, and a dialog still leaving. That second one is the store’s rule, so all three awaiting doors inherit it — `beginOpen` queues no reopen, and the exit already running belongs to whoever asked for it. `requestOpenAndWait` is the other half of the pair: that one asks and may be refused, so reach for it across an ownership boundary and this one inside.',
      references: [
        {
          file: 'src/manager/__tests__/open-and-wait.test.ts',
          title: 'opens the dialog and resolves with how it closed',
        },
        {
          file: 'src/manager/__tests__/open-and-wait.test.ts',
          title: 'hears a close that happens inside the open',
        },
        {
          file: 'src/manager/__tests__/open-and-wait.test.ts',
          title: 'refuses while the dialog is still leaving, instead of answering with its close',
        },
        {
          file: 'src/core/__tests__/modal-store.test.ts',
          title: 'a resolver registered during the exit is refused rather than answered',
        },
      ],
    },
    solid: {
      state: 'works',
      note: 'The same function — it lives under the root, which every binding re-exports.',
    },
    vanilla: {
      state: 'works',
      note: 'Beside the controller’s own `openAndWait()`, which is the one to use when you are holding the controller.',
    },
  },
  {
    capability: 'phase, exposed to the caller',
    react: {
      state: 'works',
      note: 'On the render args and the hook return. `isVisible` and `isPreparing` are not the two answers a caller needs after all: `isVisible` is true for both `open` and `closing`, so nothing but `phase` separates a panel that is leaving from one that is up — and the render callback, which decides what is on screen, carried neither. Transient state is what forces it: an action stops running before the exit animation ends, so a label read from `hasRunningAction` reverts with the panel still painted.',
      caveat:
        'The `closing` window itself is not assertable in a component test: transitions are off in a harness, so `runCloseSequence` finalizes with no exit to observe. It is measured in a real browser instead — 18 painted frames of a playground modal holding its running label through the exit.',
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'phase reaches the render callback, and agrees with the hook return',
        },
      ],
    },
    solid: {
      state: 'works',
      note: 'A getter, like every other live value.',
      caveat:
        'A `phase` read inside JSX subscribes that expression to every transition. That is the getter\u2019s cost and the caller\u2019s to spend: read it where the transition matters and nowhere else.',
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
      references: [
        {
          file: 'src/manager/__tests__/stack-priority.ct.tsx',
          title: 'with a policy the high-priority dialog stays in front of a later open',
        },
      ],
    },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'the policy is inherited by this binding too',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: 'Including a dialog inside a shadow root.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'the policy puts it in front of a light-DOM dialog opened later',
        },
      ],
    },
  },
  {
    capability: 'focusOnOpen',
    react: {
      state: 'works',
      references: [
        {
          file: 'src/actions/__tests__/use-modal-actions.ct.tsx',
          title: 'the marked action takes the opening focus from the first focusable',
        },
      ],
    },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'focusOnOpen claims the opening focus',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: 'On a button the library never rendered — the caller forwards `data-focus-on-open`.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'focusOnOpen claims the opening focus on a button it never rendered',
        },
      ],
    },
  },
  {
    capability: 'focus restored after a failed action',
    react: {
      state: 'works',
      references: [
        {
          file: 'src/actions/__tests__/use-modal-actions.ct.tsx',
          title: 'a different button than the opening one keeps the focus on itself',
        },
      ],
    },
    solid: {
      state: 'works',
      note: 'Restored by **finding the button, not remembering it**. Solid replaces the element when the action state changes, so all three of the coordinator’s reads name a node that answers `isConnected === false`, and a remembered element drops the restore through `preferredRestoreTarget`’s `openingFocus` floor onto the `<dialog>`. The reason outlives the node: the coordinator reads which action is running off the engine and re-queries `[data-action-reason]` (`findActionButton`, scoped with `queryOwn`) whenever the captured element is stale. `ActionButtonProps` carries that attribute for every action, which makes it the third prop a custom button wrapper must forward.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'lands on the button that ran it, which Solid had already replaced',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: 'Reads `focusin` rather than `activeElement`, because this binding’s own `bindAction` disables the button synchronously first.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'a failed action hands focus back to the button that ran it',
        },
      ],
    },
  },
  {
    capability: 'onError',
    react: {
      state: 'works',
      note: 'Read through a ref, so a teardown reports to whichever handler is current rather than to the one captured when the effect last ran.',
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'a prepare that throws is reported, and the modal still settles',
        },
      ],
    },
    solid: {
      state: 'works',
      note: '`options.onError` passed straight through — there is no stale capture to guard against, because nothing re-runs.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'a prepare that throws is reported, and the modal still settles',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: 'No render pass, so the report reaches the page through the caller’s own subscriber. `aria-busy` on markup the caller wrote is what says the settle reached the element and not only the store.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'a prepare that throws is reported, and the modal still settles',
        },
      ],
    },
  },
  {
    capability: 'the labelling diagnostic',
    react: {
      state: 'works',
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'reports an `ariaLabelledBy` that points at no element',
        },
      ],
    },
    solid: {
      state: 'works',
      // The positive test, deliberately: the timing test asserts zero warnings, which a diagnostic
      // that never ran on this binding would satisfy identically.
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'reports a reference that points at no element',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'reports a dialog with no accessible name at all',
        },
      ],
    },
  },
  {
    capability: '`aria-busy` while `prepare` runs',
    react: {
      state: 'works',
      note: 'The one attribute the library owns rather than relays — written both ways, `"false"` included, so a dialog is never silently stuck announcing itself as loading.',
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'the dialog says it is loading, and stops saying so',
        },
      ],
    },
    solid: {
      state: 'works',
      note: 'The one live entry of the attribute table, and the reason `setDialogAttributes` runs in an effect there at all.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'the dialog carries its accessible name and its busy state',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: 'On markup the caller wrote — which is what says the settle reached the element and not only the store.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'aria-busy clears when prepare settles',
        },
      ],
    },
  },
  {
    capability: 'an action hotkey, dispatched through `aria-keyshortcuts`',
    react: {
      state: 'works',
      note: 'The attribute is the mechanism, not a decoration: dispatch queries `[aria-keyshortcuts]` and clicks what it finds, so a custom wrapper that drops the prop loses its hotkeys silently — pinned in both directions.',
      references: [
        {
          file: 'src/actions/__tests__/use-modal-actions.ct.tsx',
          title: 'action buttons have aria-keyshortcuts when hotkey is declared',
        },
        {
          file: 'src/actions/__tests__/use-modal-actions.ct.tsx',
          title: 'hotkey dispatch works through custom wrapper that forwards aria-keyshortcuts',
        },
        {
          file: 'src/actions/__tests__/use-modal-actions.ct.tsx',
          title: 'hotkey dispatch fails silently when wrapper drops aria-keyshortcuts',
        },
      ],
    },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'an action hotkey runs the same path its button does',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: '`bindAction` writes the attribute at bind time; the caller’s button carries it like any other markup of theirs.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'an action’s hotkey runs the same path its button does',
        },
      ],
    },
  },
  {
    capability: 'onOpenRequest',
    react: { state: 'works' },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'onOpenRequest can refuse, and the refusal carries its reason',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'an accepted request opens the dialog',
        },
      ],
    },
  },
  {
    capability: 'adopting a dialog that arrived open',
    react: {
      state: 'n-a',
      note: 'The binding creates the element, so there is never one to adopt.',
    },
    solid: { state: 'n-a', note: 'Same — `umbra/solid` builds its own `<dialog>`.' },
    vanilla: {
      state: 'works',
      note: 'The element is the caller’s, so it can arrive open — from server-rendered HTML, or from a page that opened it before the binding existed. Adopted for a non-modal dialog, closed for a modal one. Before this the store started at `closed` against an open element and the first pass wrote `display: none` over it: the DOM said open, the store said closed, the user saw nothing, and nothing warned.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'a non-modal one is adopted where it stands',
        },
      ],
    },
  },
  {
    capability: 'containFocus',
    react: {
      state: 'works',
      // A React harness in `core/__tests__` — a genuine React-binding proof, sitting next to what
      // it tests, per the repo's own rule.
      references: [
        {
          file: 'src/core/__tests__/focus-containment.ct.tsx',
          title: 'wraps Tab from the last stop back to the first',
        },
      ],
    },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'containFocus wraps Tab inside a non-modal panel',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'containFocus wraps Tab inside the panel',
        },
      ],
    },
  },
  {
    capability: 'dismissOnClickOutside',
    react: { state: 'works' },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'dismissOnClickOutside closes it on a click in the page',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'dismissOnClickOutside closes it on a click in the page',
        },
      ],
    },
  },
  {
    capability: 'dismissOnBackdropClick',
    react: { state: 'works' },
    solid: {
      state: 'works',
      note: 'Reached through the `undeclare` test, which asserts dismissal coming back.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'a removed action stops counting — backdrop dismissal comes back',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'unbinding an action retires it — backdrop dismissal comes back',
        },
      ],
    },
  },
  {
    capability: 'a custom dismissKey',
    react: {
      state: 'works',
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'custom dismissKey closes on that key, Escape does not',
        },
      ],
    },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'a custom dismissKey closes it, and Escape does not',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'a custom dismissKey closes it, and Escape does not',
        },
      ],
    },
  },
  {
    capability: 'prepare aborted by a close',
    react: { state: 'works' },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'a close aborts the prepare it was waiting on',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'a controller destroyed mid-prepare does not leave the dialog marked busy',
        },
      ],
    },
  },
  {
    capability: 'reconcileOpen',
    react: {
      state: 'works',
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'the prop drives the dialog, and stays authoritative over an imperative open',
        },
      ],
    },
    solid: {
      state: 'works',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'the signal drives the dialog, and stays authoritative over an imperative open',
        },
      ],
    },
    vanilla: {
      state: 'works',
      note: 'Read off the snapshot the controller publishes rather than through `useLookup`, which is why `phase` is on this binding’s surface and on neither of the others.',
      caveat:
        'The `phase`-versus-`isVisible` half is proven on React only, and the reason has narrowed twice. The two forms differ on exactly one input pair — `phase === "closing"` with `open === false`; every other pair is identical, since `isVisible` is `phase !== "closed"`. **The controller never publishes that phase here.** The harness now accumulates every phase it is notified of with a functional updater, which cannot drop one to a React batch, and it reads `opening,open,closed` — so this is the store’s own sequence rather than an observation problem, which is what the first reading of this assumed. React’s harness, on the same animation config, does reach `"closing"`. Closing this means an exit that stays observable through the controller’s snapshot long enough to be reconciled against — not a change to `reconcileOpen`, whose decision is already the right one.',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'the flag drives the dialog, and stays authoritative over an imperative open',
        },
      ],
    },
  },
  {
    capability: 'markup replaced underneath it (htmx, Turbo, Unpoly)',
    react: {
      state: 'n-a',
      note: 'The renderer owns the markup, so a fragment swap is not a thing that happens to it — React replaces the tree and the binding re-runs with it.',
    },
    solid: {
      state: 'n-a',
      note: 'As React: the dialog is the binding’s own output, not a fragment somebody hands it.',
    },
    vanilla: {
      state: 'partial',
      why: 'The binding a hypermedia page would use, and the one arrangement where nothing tells the library. `bindDialog` closes over the element it was handed and registers `getDialog` with the manager, so a swap leaves the controller driving a detached node while the fragment on screen carries none of the library’s attributes — it is a plain `<dialog>` again. **Deliberately not detected**: an observer per dialog is every consumer paying for one integration style, and the code doing the swapping is the one thing that already knows. `destroy()` then bind again over what arrived restores the whole surface and leaves the registry at one entry — run it from `htmx:beforeSwap` / `htmx:afterSwap` or the equivalent.',
      references: [
        {
          file: 'src/vanilla/__tests__/swap.ct.tsx',
          title: 'destroy and bind again restores it over the fragment that arrived',
        },
        {
          file: 'src/vanilla/__tests__/swap.ct.tsx',
          title: 'the controller drives the element it was handed, not the one on screen',
        },
      ],
    },
  },
  {
    capability: 'a server render (`renderToString`)',
    react: {
      state: 'works',
      note: 'Every hook reads its store through `useSyncExternalStore`, which **throws** rather than degrades when given no server reader — one missing argument takes down the render of any page that mounts a modal. All five pass their ordinary `getSnapshot` as the server one, which is sound because the stores are in-memory and DOM-free: the server reads a freshly-closed modal and hydration reads the identical thing. What it emits is a closed `<dialog>`, the only honest answer, since the top layer is enterable from `showModal()` alone. Asserted by `verify:package` on the built artifact — and it inspects the markup, because a hook that rendered nothing would also not throw.',
    },
    solid: {
      state: 'no-by-design',
      why: 'The binding builds its `<dialog>` with `document.createElement` at hook-call time — that *is* the design, and what compiled JSX would do anyway. There is no render tree to serialise, so a server pass fails on the document rather than on a missing snapshot, and a guard would produce a hook that returns nothing rather than one that server-renders. Supporting it means constructing through Solid’s JSX instead, which is a different binding, not a patch.',
    },
    vanilla: {
      state: 'n-a',
      note: 'The controller renders nothing: the `<dialog>` is markup the caller’s server already emitted. The question it answers instead is what happens to a dialog that arrives open — see the platform rows.',
    },
  },
  {
    capability: 'a dialog inside a shadow root',
    react: {
      state: 'works',
      note: 'Portaled into the root with `createPortal`, which is the shape a web component hosting a React tree takes.',
      references: [
        {
          file: 'src/react/__tests__/use-modal.ct.tsx',
          title: 'gets the library backdrop and its opening focus',
        },
      ],
    },
    solid: {
      state: 'works',
      note: 'The whole Solid app rendered into the root, which is how a widget keeps the host page’s CSS out.',
      references: [
        {
          file: 'src/solid/__tests__/solid-modal.ct.tsx',
          title: 'gets the library backdrop and its opening focus',
        },
      ],
    },
    vanilla: {
      state: 'works',
      references: [
        {
          file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
          title: 'a dialog in a shadow root gets the library backdrop and its opening focus',
        },
      ],
    },
  },
];

// ── Axis C — the platform, and features meeting each other ────────────────────

export const PLATFORM_ROWS: readonly PlatformRow[] = [
  {
    fact: 'z-index orders two dialogs in the top layer',
    state: 'no-platform',
    why: 'Top-layer elements paint in the order they were added and `z-index` does not apply between them — measured: a dialog stamped `z-index: 9999` still paints under one shown after it. Moving one is `close()` + `showModal()` and nothing cheaper.',
    references: [
      {
        file: 'src/manager/__tests__/stack-priority.ct.tsx',
        title: 'with a policy the high-priority dialog stays in front of a later open',
      },
    ],
  },
  {
    fact: 'a non-modal dialog can sit above a modal one',
    state: 'no-platform',
    why: 'The top layer paints above ordinary content and no `z-index` reaches between them. So modality is the first sort key and a policy cannot overrule it — a big number on a panel ranks it against the other panels only.',
    references: [
      {
        file: 'src/manager/__tests__/stack-order.test.ts',
        title: 'a policy cannot lift a non-modal dialog over a modal one',
      },
    ],
  },
  {
    fact: 'Tab reaches the content when the dialog element itself has focus',
    state: 'partial',
    why: 'Clicking a dialog’s empty space focuses the `<dialog>` element — it is click-focusable while open, though it takes no `tabindex` and refuses `focus()` from script. What Tab does from there is the engines’ own answer and they do not agree: **forward Tab reaches the content on Chromium and Firefox and is swallowed by WebKit**, and **Shift+Tab reaches nothing on any of the three**. Measured both ways on all three. `attachFocusContainment` answers it unconditionally now — the recovery used to sit behind `containFocus`, which made an ordinary click cost the keyboard in any dialog that had not opted into an option about something else. Left open only to be re-measured: if WebKit descends one day, the forward half becomes redundant.',
    references: [
      {
        file: 'src/core/__tests__/focus-containment.ct.tsx',
        title: 'a dead-space click leaves the keyboard reachable without containFocus',
      },
    ],
  },
  {
    fact: 'a server-rendered `<dialog open>` can be modal',
    state: 'no-platform',
    why: 'The top layer is enterable only through `showModal()` from script, so an `open` attribute in served HTML is **by definition** a non-modal open — no backdrop, nothing inert. It is the one thing SSR cannot hand a dialog. `bindDialog` adopts such a dialog when the caller asked for `nonModal`, and closes it otherwise rather than claiming a containment the element does not have.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a modal one is closed instead, because the top layer is not enterable from HTML',
      },
    ],
  },
  {
    fact: '`portal: true` survives a server render',
    state: 'no-platform',
    why: '`createPortal` needs a live container — `document.body` — and a server pass has no document at all, so the render throws where the default and the contained arrangement both succeed. Nothing an implementation can do: the option exists to place a node somewhere the render tree does not reach, and on a server there is no such somewhere. A page that server-renders should leave the dialog in the tree and portal after hydration if it needs to.',
  },
  {
    fact: 'a raise avoids firing the element’s native close event',
    state: 'no-platform',
    why: '`close()` queues the event, so it arrives with `dialog.open` already back to `true` — which is the only guard a listener has for telling a raise from a real close. It matters most in `umbra/vanilla`, where the listener is the caller’s.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a raise fires the native close event, with the dialog already open again',
      },
    ],
  },
  {
    fact: 'a raise keeps the caret where the user left it',
    state: 'partial',
    why: 'Restored for the dialog that **held** the keyboard — the case a late policy install hits. One that did not is re-shown by `showModal()`, and where focus lands then is **the engine’s answer, not the library’s**: Chromium puts it on the dialog’s first focusable, WebKit preserves the field. So the guarantee is that the dialog in front keeps the keyboard; the position is not one, and a test that pinned a control was pinning one engine. Fixing it for real means teaching the `focusin` bookkeeping to ignore focus the library itself moves during a raise, which needs a window `raiseDialog` can publish and the coordinator can read.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a policy installed over it keeps the caret where it was',
      },
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'keeps the keyboard when something opens over it',
      },
    ],
  },
  {
    fact: 'a raise hands the keyboard back to a dialog that claimed no `focusOnOpen`',
    state: 'works',
    why: 'A panel opening underneath runs the platform’s focusing steps and takes the keyboard from the dialog in front. `reclaimFocus` undoes it, and with a claim there is something to aim at — **without one there was not**: the fallback was `dialog.focus()`, which an open `<dialog>` refuses, so the modal stayed on screen with focus on `<body>` and every hotkey but Escape dead. The floor is the dialog’s **first focusable** instead. Which one that is depends on how the confirmation is read: focusing a candidate and asking the `document` who holds it is wrong inside a shadow root — it answers with the *host*, so the scan walks past a candidate that took focus and the dialog ends on its **last** control. `focusFirstAvailable` asks the dialog’s own root — and scans only this dialog’s own controls, which the row below carries.\n\nProven on all three bindings, and measuring them turned up two things inference had got wrong. **The theft itself is Chromium’s**: on Firefox and WebKit a non-modal `show()` underneath does not take the keyboard from a modal in the top layer, so the dialog keeps it with no repair at all — disabling both repair paths leaves those two engines green. And on `umbra/vanilla` the floor is **not** the delivering path: `bind-dialog.ts` runs `focus.sync` *before* `syncOpenSequence` where the director runs it after, so its `focusin` bookkeeping hears the opening autofocus that the hook bindings’ misses, `preferred` is set, and the floor is never reached. Either path suffices there — measured by disabling each alone (green) and both together (red).',
    references: [
      {
        file: 'src/core/__tests__/opening-focus-foreground.ct.tsx',
        title: 'a panel opening underneath does not leave focus on the body',
      },
      {
        file: 'src/core/__tests__/opening-focus-foreground.ct.tsx',
        title: 'and it is the first control, not the last, inside a shadow root',
      },
      {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'gets the keyboard back when a panel opens underneath',
      },
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'gets the keyboard back when a panel opens underneath',
      },
    ],
  },
  {
    fact: 'closing a non-modal panel returns the keyboard to what opened it',
    state: 'works',
    why: 'The close-the-dialog steps restore the previously focused element for `show()` as well as `showModal()` — measured on all three engines with a bare dialog — but only when focus is still inside the dialog at `close()` time, and an action-driven close broke that condition on Chromium: the button is `disabled` while its action settles, the browser blurs a disabled element, and by `close()` the keyboard was on `<body>` and stayed there. Firefox and WebKit passed the same harness. `showDialog` now remembers who held the keyboard before the show and the coordinator’s closed pass gives it back — **only when the close left focus on nothing**, so it never competes with the platform’s own restore and never takes the keyboard from a page the panel never blocked.',
    references: [
      {
        file: 'src/core/__tests__/non-modal-close-focus.ct.tsx',
        title: 'hands the keyboard back to the trigger that opened it',
      },
      {
        file: 'src/core/__tests__/non-modal-close-focus.ct.tsx',
        title: 'still hands it back when an action closed it',
      },
    ],
  },
  {
    fact: 'a live region rendered inside `render` announces its first content',
    state: 'no-platform',
    why: 'Screen readers announce a live region’s *changes*; a region inserted into the accessibility tree already holding its text is the case they miss or announce inconsistently — and `render` mounts its content in the same pass that shows the `<dialog>`, so a `role="status"` in there is born full. The same fact reaches every binding: `umbra/vanilla` markup inside a closed dialog sits under `display: none`, out of the tree, and becomes an insertion when it opens. The pattern that works is structural — a persistent, visually hidden region **outside** the dialog, written to at open time. The playground’s `useAnnouncer` (shared/lib) is that pattern, and the corner toast runs it; the library deliberately ships nothing here, for the same reason `role: "status"` is not on the option surface.',
  },
  {
    fact: 'a scrollable, control-less region inside a dialog stays out of the tab order',
    state: 'no-platform',
    why: 'Chromium and Firefox put a scroller with no focusable child into the tab order themselves — without that stop a keyboard user could never scroll the text, which is WCAG 2.1.1 applied by the engine. WebKit does not, so a dialog relying on the engines has scrollable text one browser’s keyboard cannot reach. The norm is to declare it — `tabindex="0"`, `role="region"`, an accessible name, applied only while the content actually overflows — which the reference templates’ content areas all carry through `useScrollRegion`. The library’s half is indirect and real: an explicit `tabindex` is what makes the region visible to the focus scan (the wrap, the Tab recovery, the reclaim floor), where an engine-granted stop carries no attribute a selector could name.',
  },
  {
    fact: 'the library’s backdrop survives forced colors',
    state: 'no-platform',
    why: 'Forced-colors mode (Windows High Contrast) strips author backgrounds and box-shadows: `--dialog-backdrop` is replaced by the UA’s own system scrim, and a surface drawn by shadow alone loses its silhouette entirely. Measured under emulation on the playground: a translucent system wash where the 0.7 black was, `box-shadow: none` on every surface, the focus ring forced to the system Highlight — and every reference template still delimited, because each carries a real `1px` border on the edge that matters (the same border discipline the contrast pass required for 1.4.11). The rule for a consumer is one sentence: give the dialog’s surface a border and let the mode recolour it; a shadow is decoration there, never the outline.',
  },
  {
    fact: '`aria-modal` written onto the `<dialog>`',
    state: 'no-by-design',
    why: 'The library never writes it, and that is the correct spelling of the fact rather than an omission: `showModal()` exposes the modal state to assistive technology itself (HTML-AAM maps a dialog in the modal state, and the top layer makes the rest of the document genuinely inert), so the attribute adds nothing on the modal variant — and on the non-modal one it would be a lie, announcing an inertness `show()` does not produce. A hand-written `aria-modal` is the marker of a `<div>` pretending to be a dialog, which is the thing this library exists to not build.',
  },
  {
    fact: 'installing a policy over dialogs already open is minimal',
    state: 'partial',
    why: 'The top layer is not tracked until a policy exists, so the first plan compares `planRaises` against an empty `current` — which by its own arithmetic returns every open modal dialog, bottom-first. **Seeding the tracking at install time was tried and is not in the code**, because nothing observable changed: with two modal dialogs open in the order the policy already wants, the harness that counts native `close` events reports **zero either way**, so whatever costs a round-trip here is not reached by the obvious arrangement, and a fix nobody can show working is not one. What is still true is the arithmetic, so the cost is real somewhere the measurement has not gone — a third dialog, an order the policy actually changes, or a phase the snapshot holds and the elements do not. Installing at start-up costs nothing and remains the advice.',
  },
  {
    fact: 'the adopted stylesheet reaches a dialog inside a shadow root',
    state: 'works',
    why: '`adoptedStyleSheets` does not cross a shadow boundary, so the sheet is adopted per **root** rather than per document — `showDialog` adopts into `dialog.getRootNode()` on every open, idempotent. Without it the dialog shows the UA backdrop, measured at `rgba(0, 0, 0, 0.1)`.',
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'a dialog in a shadow root gets the library backdrop and its opening focus',
      },
    ],
  },
  {
    fact: 'one Escape closes only the dialog it was pressed in',
    state: 'works',
    why: 'A modal opened from inside another renders its `<dialog>` in that subtree, so every event bubbles through the one underneath. `isOwnEventTarget` and `queryOwn` scope both the keydown and the hotkey dispatch.',
    references: [
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'the dismiss key unwinds the stack one modal per press, front to back',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'an outer modal never dispatches through a nested dialog’s button',
      },
    ],
  },
  {
    fact: 'the Tab recovery lands on a control of the dialog it was pressed in',
    state: 'works',
    why: 'The same subtree rule as the row above, on the one path that had been written without it. `focusFirstAvailable` — the scan that answers a Tab pressed while focus is on the `<dialog>` element — walked a plain `querySelectorAll` where every other lookup in `focus-policy.ts` goes through the scope. **Reproduced on all three engines before it was fixed**, and only in the reversed direction: forward, this dialog’s own first control is first either way, so the defect was invisible to `Tab` and plain under `Shift+Tab`, which scans from the end and reached a nested panel’s button. `queryAllOwn` is `queryOwn`’s plural, added so the rule has one statement rather than a filter copied to a second call site.',
    references: [
      {
        file: 'src/core/__tests__/focus-containment.ct.tsx',
        title: 'Shift+Tab from the dialog element stays on this dialog’s own last stop',
      },
    ],
  },
  {
    fact: 'Escape is always answered by someone',
    state: 'no-by-design',
    why: 'Put a modal with `dismissKey: false` in front of a non-modal panel and **nothing closes** — the modal was told not to listen and the panel is no longer the foreground. That is the right answer rather than a gap: the front dialog is what the user is looking at and it opted out, so falling through to the panel behind would close the one thing they cannot see. What makes it acceptable rather than a dead keyboard is measured separately — the press is **not swallowed**, so the application can still handle it, while a press the panel *does* claim is stopped at the capture phase and never reaches the page. Both halves of that are asserted.',
    references: [
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title:
          'a deaf modal in front leaves the panel behind alone, and the press reaches the page',
      },
    ],
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
    references: [
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'positions the panel against the dialog’s parent by default',
      },
    ],
  },
  {
    fact: 'the body scroll lock is safe with two managers on one page',
    state: 'works',
    why: 'Claimed per owner and released when the last claim goes: the target is one global `<body>`, and a shared boolean would make it last-writer-wins.',
    references: [
      {
        file: 'src/manager/__tests__/dialog-manager.ct.tsx',
        title: 'two managers both holding the lock release it only when the last one lets go',
      },
    ],
  },
  {
    fact: 'the scroll lock compensates the right width',
    state: 'works',
    why: 'It pads by what the lock **actually reclaims**, not by the current scrollbar width — a page with `scrollbar-gutter: stable` keeps its gutter through `overflow: hidden`, so the naive version shifts content inward.',
    references: [
      {
        file: 'src/manager/__tests__/scroll-lock.test.ts',
        title: 'scrollbar-gutter: stable — gutter survives the lock, so compensation is zero',
      },
    ],
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
    why: 'The linter runs on the TS 7 compiler through tsgolint. `typescript@6.0.3` remains for **typedoc alone**, whose two remaining jobs are `docs:check` and the JSON model behind the playground’s `/api` page — the HTML half is gone. TS 7 ships an API (`typescript/unstable/sync`) and it is **most of the way there**: exports, doc comments, `@example` tags, `typeToString` and `emitter.printNode` all work, and a lazy declaration node inflates through `resolve()`. Three measured blockers remain, and the middle one is the surprise: the resolved node exposes **no child traversal** (`children` is `undefined`, and no `forEachChild` is exported), so a syntax-level check like `notExported` cannot be written; walking the resolved _type graph_ instead is semantically the wrong question — it reports **0** findings against typedoc’s 10 allowances, because an alias resolves away; and the server **panics** rather than throwing on an unsupported checker call, so preconditions must be guarded rather than probed. So the `/api` model is the nearer half of this, not the validator. **Re-measured 2026-08-14: unchanged.** `typedoc@0.28.20` still declares `typescript: "5.0.x || … || 6.0.x"`, so the pin is not a stale one to drop — it is the peer range, and the cell is blocked on typedoc rather than on this repo. Check that range first; there is nothing else to try until it moves.',
  },
];

// ── Axis D — WCAG 2.2, criterion by criterion ────────────────────────────────
//
// The success criteria a dialog *engine* touches, mapped with the same states as everything else —
// not a conformance claim. A headless library renders nothing, so most criteria land on the
// caller's content; these rows say which halves are the library's, which are the platform's, and
// which are deliberately handed over. The bar for a `works` is the same as everywhere in this
// file: a named test proves it.

/** One WCAG 2.2 success criterion, and where a headless dialog library stands on it. */
export type WcagRow = {
  /** The numbered criterion, e.g. `'2.1.2'`. */
  readonly criterion: string;
  /** Its name as the spec titles it. */
  readonly name: string;
  readonly level: 'A' | 'AA' | 'AAA';
  readonly state: CellState;
  readonly why: string;
  readonly references?: readonly TestReference[];
  /** An open question this row carries despite its state — see {@link Cell.caveat}. */
  readonly caveat?: string;
};

export const WCAG_ROWS: readonly WcagRow[] = [
  {
    criterion: '2.1.1',
    name: 'Keyboard',
    level: 'A',
    state: 'works',
    why: 'Everything the library itself does is reachable by key: a hotkey dispatches by clicking the declaring button, so the key path and the click path are one path — running state, veto and typed close included — and the dismiss key unwinds the stack one dialog per press. The controls themselves are the caller’s markup, which is where the rest of this criterion lives.',
    references: [
      {
        file: 'src/solid/__tests__/solid-modal.ct.tsx',
        title: 'an action hotkey runs the same path its button does',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: 'the dismiss key unwinds the stack one modal per press, front to back',
      },
    ],
  },
  {
    criterion: '2.1.2',
    name: 'No Keyboard Trap',
    level: 'A',
    state: 'works',
    why: 'A modal dialog is exited by Escape through the native `cancel`, wherever focus is; a non-modal one lets Tab walk out by default, and `containFocus` — the opt-in wrap — never claims the dismiss key. Even the deliberate dead end (a modal with `dismissKey: false` in front of a panel) leaves the press travelling, so the application can still answer it.',
    references: [
      {
        file: 'src/core/__tests__/focus-containment.ct.tsx',
        title: 'lets Tab walk out of it — which is what show() means',
      },
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title:
          'a deaf modal in front leaves the panel behind alone, and the press reaches the page',
      },
    ],
  },
  {
    criterion: '2.2.1',
    name: 'Timing Adjustable',
    level: 'A',
    state: 'n-a',
    why: 'The library ships no timed content — nothing auto-dismisses and nothing expires. A toast that adds a timer is user-land, and the playground’s corner toast demonstrates the compliant shape: the countdown pauses on hover **and** on focus, so the keyboard user reaching the Dismiss button gets the same reprieve a pointer user does.',
  },
  {
    criterion: '2.3.3',
    name: 'Animation from Interactions',
    level: 'AAA',
    state: 'no-by-design',
    why: 'Animations are defaults the caller replaces, and the off-switch is one CSS rule — `@media (prefers-reduced-motion: reduce) { dialog { transition: none !important } }` — which the close path *measures* and short-circuits on (`checkTransitionsDisabled`), so a reduced-motion dialog closes immediately instead of waiting for a `transitionend` that never comes. The playground ships that rule; a consumer writes it once. AAA rather than AA, listed because honouring it costs one declaration.',
  },
  {
    criterion: '2.4.3',
    name: 'Focus Order',
    level: 'A',
    state: 'works',
    why: 'Opening focus goes to the claim (`focusOnOpen`) or to what the platform chose, never to a dialog that is not in front; the restore after an action returns to whoever ran it; the reclaim when the stack moves prefers where the user actually was. Order inside the content is the caller’s markup, in DOM order, untouched — the library never rewrites a `tabindex`.',
    references: [
      {
        file: 'src/actions/__tests__/use-modal-actions.ct.tsx',
        title: 'the marked action takes the opening focus from the first focusable',
      },
      {
        file: 'src/core/__tests__/opening-focus-foreground.ct.tsx',
        title: 'a panel opening underneath does not take focus from the dialog in front',
      },
    ],
  },
  {
    criterion: '2.4.7',
    name: 'Focus Visible',
    level: 'AA',
    state: 'works',
    why: 'Every focus move the library makes on the user’s behalf carries `focusVisible: true`, because input modality would otherwise hide it: a dialog opened by mouse inherits “pointer”, and two engines out of three draw no ring on a library-made focus. The ring itself is the page’s own `:focus-visible` styling — the library asks for it, the caller draws it.',
    references: [
      {
        file: 'src/actions/__tests__/use-modal-actions.ct.tsx',
        title: 'the opening focus is visibly focused, claimed or not',
      },
      {
        file: 'src/actions/__tests__/use-modal-actions.ct.tsx',
        title: 'the button it returns to is visibly focused, not silently',
      },
    ],
  },
  {
    criterion: '2.4.11',
    name: 'Focus Not Obscured (Minimum)',
    level: 'AA',
    state: 'no-by-design',
    why: 'A modal dialog cannot produce the failure: focus is inside it and the top layer paints above everything. The case that can arise is a **non-modal** panel positioned by the caller over the page element that holds focus — and placement is deliberately user-land (`dialogPlacement` is a table of CSS the caller applies), so the guarantee is the caller’s. The library’s half: it never moves focus underneath a panel (the foreground rules decline), and the panel stays dismissible from wherever focus is through the window-level dismiss key.',
  },
  {
    criterion: '4.1.2',
    name: 'Name, Role, Value',
    level: 'A',
    state: 'works',
    why: 'The name is relayed and never invented (`aria-label=""` is refused), the role is a closed union that narrows with the variant, `aria-busy` is owned and written both ways, and the hotkey a button advertises through `aria-keyshortcuts` is the exact string dispatch queries — value and behaviour cannot drift apart. The labelling diagnostic reports the three ways the element can still end up lying.',
    references: [
      {
        file: 'src/react/__tests__/use-modal.ct.tsx',
        title: '`ariaLabel` names the dialog for assistive technology',
      },
      {
        file: 'src/vanilla/__tests__/bind-dialog.ct.tsx',
        title: 'aria-busy clears when prepare settles',
      },
      {
        file: 'src/core/__tests__/action-factory.test.ts',
        title: 'carry the ARIA spelling of the hotkey, not the string as written',
      },
    ],
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
  const reason = value.why ?? value.note;
  const note = reason === undefined ? '' : ` — ${reason}`;
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
    'One row per option a caller can pass. The **held by** column is the one to read: `TYPE` means the checker rejects the wrong combination, `RUNTIME` means a named function narrows or refuses, `PROSE` means a sentence and nothing else — so every `PROSE` row is a candidate to become one of the other two. **Two pairs are `TYPE` today**, both through `ModalVariant`: `nonModal` against the two dismissal options, and `nonModal: true` against `role: "alertdialog"`.'
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
  lines.push('');

  lines.push('### WCAG 2.2, criterion by criterion', '');
  lines.push(
    'The success criteria a dialog *engine* touches, in the same vocabulary as everything above — not a conformance claim. A headless library renders nothing, so most criteria land on the caller’s content; these rows say which halves are the library’s, which are the platform’s, and which are deliberately handed over. A ✓ here meets the same bar as everywhere else in this table: a named test proves it.'
  );
  lines.push('');
  lines.push('| Criterion | Level | | Where the library stands |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of WCAG_ROWS) {
    lines.push(
      `| ${row.criterion} ${escapeCell(row.name)} | ${row.level} | ${SYMBOL[row.state]} | ${escapeCell(row.why)} |`
    );
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
    ...WCAG_ROWS.filter((row) => {
      return open(row.state);
    }).map((row) => {
      return `${SYMBOL[row.state]}  WCAG ${row.criterion} ${row.name}`;
    }),
    ...WCAG_ROWS.filter((row) => {
      return row.caveat !== undefined;
    }).map((row) => {
      return `? (${SYMBOL[row.state]})  WCAG ${row.criterion} ${row.name}: ${row.caveat ?? ''}`;
    }),
  ];
}

/** Every reference any cell rests on, for the gate to resolve. */
export function allReferences(): readonly {
  readonly where: string;
  readonly ref: TestReference;
}[] {
  const spread = (where: string, references: readonly TestReference[] | undefined) => {
    return (references ?? []).map((ref) => {
      return { where, ref };
    });
  };
  return [
    ...OPTION_ROWS.flatMap((row) => {
      return spread(`option ${row.option}`, row.references);
    }),
    ...BINDING_ROWS.flatMap((row) => {
      return (
        [
          ['react', row.react],
          ['solid', row.solid],
          ['vanilla', row.vanilla],
        ] as const
      ).flatMap(([binding, value]) => {
        return spread(`${row.capability} (${binding})`, value.references);
      });
    }),
    ...PLATFORM_ROWS.flatMap((row) => {
      return spread(row.fact, row.references);
    }),
    ...WCAG_ROWS.flatMap((row) => {
      return spread(`WCAG ${row.criterion} ${row.name}`, row.references);
    }),
  ];
}
