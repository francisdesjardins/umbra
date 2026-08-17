# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**This file is the project's memory.** The code comments never narrate history, so the reasoning
behind a decision lives here and nowhere else. Entries are left as written — a changelog that edits
its own past is a story, not a record. (Which is why entries before 2026-08-04 still name the
package `@yourorg/dialog`; it is `umbra` now.)

## 2026-08-17

### Added — WCAG 2.2 as the compatibility matrix's fourth axis

The criteria a dialog _engine_ touches — 2.1.1, 2.1.2, 2.2.1, 2.3.3, 2.4.3, 2.4.7, 2.4.11, 4.1.2 —
in the same vocabulary as the rest of the table, and deliberately **not** a separate conformance
document: a second answer to "what is proven" is the drifting document this file was created to
end. Each row says which half is the library's (with the test that proves it), which is the
platform's, and which is deliberately the caller's. A ✓ meets the same bar as everywhere else —
a named test — and `yarn todo` enumerates these rows like any other.

### Fixed — reduced motion is honoured where the playground's dialogs animate

One rule, declared twice (the app's `CssBaseline`, the MFE frame's own stylesheet):
`prefers-reduced-motion` turns dialog transitions off, and the library's close path _measures_ the
`0s` duration and finalizes immediately instead of waiting for a `transitionend` that never comes.
Probed under emulation: computed duration `0s`, close in 82 ms. Parts of the playground (the
moons, `cosmic-override`) already honoured the query — the dialogs themselves were the gap, which
is the wrong place for a library whose templates get copied. The recipe is in the README's
accessibility chapter and the reasoning on the matrix's 2.3.3 row.

### Added — `yarn coverage:update`, the re-measure-both rule made mechanical

Two commands, four call sites (two badges and a paragraph in `README.md`, the pair in
`CLAUDE.md`), and the drift arrived exactly as predicted — twice, in both directions. The script
runs both measurements, parses the numbers out of their own reports, and rewrites every quote of
the pair plus the date in one move, through prettier so a no-op run is a no-op, with edits
anchored on the prose and required to match exactly once each. Running it twice measured the
instrumented suite's own jitter (92.08% then 92.20% on identical code), which is why the README
calls the badges a snapshot rather than a gate.

### Added — SECURITY.md and CONTRIBUTING.md, and one chip on the landing page

The security page says what the package actually is — no npm artifact, no runtime dependency
tree, `main` as the only line — and routes reports through GitHub's private advisories. The
contributing page leads with the frame the README already states and the two commands that gate a
PR. The playground homepage claims the accessibility work in one chip — "WCAG 2.2 · measured" —
because _measured_ is the claim the matrix can back, and a landing page that said more would be
saying less.

### Noted — `SlideDirection`'s physical edges are an open question

In a right-to-left document, "the drawer slides in from where the navigation is" is a _logical_
statement — `inline-start`, not `left` — and the union cannot say it; a caller shipping RTL flips
the direction themselves from `dir`. Going logical is a pass of its own (the placement table and
both style functions move to inset-inline/block properties, the four names migrate) and deserves a
real RTL consumer before it is decided. Said on the type, where the next reader of `direction`
will look.

## 2026-08-16

### The ARIA pass — a full audit of the core, and what it found

Every attribute the core writes or reads, the focus policy, the keyboard scoping and the
`<dialog>` semantics, checked against WAI-ARIA, the APG dialog pattern and the HTML spec —
inventory first, then a counter-validation of the compatibility matrix's a11y cells against the
test each one cites. The verdict worth recording: the emitted surface was sound (the
`aria-keyshortcuts` spelling, the owned `aria-busy`, the never-invented name, the absent
`aria-modal` all held), the matrix had **no mismatched citation and no unprovable ✓**, and the
real defects were elsewhere — the entries below, each its own commit.

### Fixed — the focus scan did not know every kind of Tab stop

`FOCUSABLE` named the form controls, links, frames and `tabindex` carriers, and nothing else — so
a `contenteditable` editor, a media element with controls, a `summary` and an image-map link were
invisible to the wrap, the unconditional Tab recovery and the reclaim floor. The scan forgives a
false positive (a candidate that refuses focus costs one step), but a kind the list does not name
is never tried: a dialog whose only stop was an editor was a stuck keyboard on WebKit. The list
errs wide now, stays private (one source, so a userland-configurable set stays openable without a
refactor — parked for a future configuration pass), and is pinned at both call sites.

### Fixed — a close could strand the keyboard on `<body>`, and on Chromium the action path did

Measured with a bare dialog on all three engines: the platform's close-the-dialog steps restore
the previously focused element for `show()` as well as `showModal()` — but only when focus is
still inside the dialog at `close()` time. An action-driven close broke that condition on
Chromium: the button is `disabled` while its action settles, the browser blurs a disabled element,
and by `close()` the keyboard was on `<body>` and stayed there — red on Chromium, green on Firefox
and WebKit, same harness. `showDialog` now remembers who held the keyboard before the show, and
the coordinator's closed pass hands it back **only when the close left focus on nothing**, so it
never competes with the platform's restore and never takes the keyboard from a page a non-modal
panel never blocked.

### Changed — an alertdialog that is not modal is unwritable, and reported when written anyway

`role` moved from the flat option surface into `ModalVariant`'s branches: the modal branch keeps
`'dialog' | 'alertdialog'`, the non-modal branch offers `'dialog'` alone — an alertdialog is modal
by definition (the APG requires `aria-modal`), so announcing one over content the user can still
reach contradicts itself for assistive technology. No reader changed, the templates inherit the
lock through the variant they already intersect, and every playground alertdialog was already
modal. The half the type cannot see — `umbra/vanilla`'s hand-written markup — gets the same
refusal as the missing name: a third labelling finding, read off the element, silent until
`setLogLevel`. The matrix's "exactly one pair is `TYPE`" is two pairs now.

### Fixed — the toast claimed an announcement it could not deliver

A live region announces its _changes_, and a `role="status"` rendered inside `render` is mounted
in the same pass that shows the dialog — born already holding its text, the case screen readers
miss or announce inconsistently. The corner toast was that case, with a comment asserting the
opposite. The playground gains `useAnnouncer` (a persistent, visually hidden region mounted beside
the trigger, whose `announce()` clears and rewrites a frame later so two identical toasts are two
announcements), the toast runs it, and the matrix carries the platform fact for all three
bindings. The library still ships nothing here on purpose — `role: 'status'` on a `<dialog>` stays
refused, and a dialog manager is not where anyone looks for a live region.

### Changed — a matrix cell cites its proofs in the plural, and the a11y cells cite theirs

The counter-validation found no lies and a citation debt: five React ✓ cells with no reference
while the proving test already existed, one Solid citation that could not tell a quiet diagnostic
from an absent one (swapped for the positive test twelve lines above it), and eight citations
proving a weaker claim than their cell — the structural cause being a singular `reference` field
under prose that says "proven on all three bindings". `references` is an array now, the missing
citations are in, two capability rows that existed only as tests (`aria-busy`, hotkey dispatch
through `aria-keyshortcuts`) are rows, and two platform rows record what the audit measured (the
non-modal close restore, and `aria-modal` as the by-design refusal it is).

### Added — the README's accessibility chapter

What the library keeps intact, what it hands over, what it owns and what it refuses — each claim a
matrix cell with a cited test. The browser floor gets a Features entry pointing at the measured
accounting it already had, and the coverage pair was re-measured after the pass (unit **95.46%**,
component **92.08%** over 54 files), both documents and both badges in one move.

### Fixed — `yarn test` ran three engines in one worker pool, and was unreliable for it

Locally the suite failed roughly every other full run: one test, a different one each time, always
green when run alone. CI never saw it — one engine per job, two retries.

Four hypotheses, three of them wrong, and the measurements are the reason the fourth is the one
that shipped:

|                                                | result                              |
| ---------------------------------------------- | ----------------------------------- |
| default (8 workers, three engines interleaved) | **2 of 3 runs red**                 |
| `--workers=4`, still interleaved               | 1 of 3 red, and 40% slower          |
| the failing tests alone, `--repeat-each=20`    | 180 of 180 green                    |
| one engine at a time                           | **1 of 21 runs red**, and no slower |

So it is not worker count, and it is not the tests — it is Chromium, Firefox and WebKit pages live
in the same pool at the same moment. `yarn test:component` runs them in sequence now, through
`scripts/test-engines.mjs`, which is what CI already does by having one job per engine.

**Retries stay at zero locally.** A retry would have made the runs green without making them
trustworthy, and a local suite is worth having only if a red means something.

Honest about what is left: ~55% of runs red became ~5%, not zero. The residual is a Firefox timing
flake that has not been characterised, and saying it was solved would be the same class of claim
this changelog spent the day removing.

Separately, and not the cause: 21 assertions on the stack probes were `expect(await probe(page))`,
a single read where Playwright retries only `expect(locator)` and `expect.poll`. They poll now.
That is a real gap in the harness — it just was not this one.

### Fixed — a modal opened by mouse put the keyboard somewhere you could not see

Reported as "the first open has no focus on the button, the second one does". The focus was on the
button **both times** — Enter and Space activated it on the first open too. What differed was the
ring, and only that.

`:focus-visible` follows input modality, and the click that opens a dialog is pointer input, so
`showModal()`'s own focusing steps place focus without a ring. Press any key — Escape, to close it —
and the next open draws one. Measured cold, one click, no key ever pressed: **Chromium and Firefox
show nothing, WebKit shows the ring**, for identical focus. So the three engines disagree with each
other and Chromium disagrees with itself between two opens.

It applied to a claimed `focusOnOpen` as well, which is the sharper half: a caller says "start
here" and two engines out of three start there invisibly.

`focus({ focusVisible: true })` overrides the heuristic on all three. **The subtlety that makes the
fix work is that it is not enough**: `showModal()` has usually focused the element already, and
refocusing an element that already holds focus is a no-op on all three engines, flags included. So
the focus is dropped first — and only when that buys something: never when a ring is already
showing, never when focus is somewhere else.

**It does not move focus.** Where the keyboard goes is unchanged, claimed or platform-picked; only
whether you can see it. That is why it is applied to the unclaimed case too — the library is what
opened a modal and relocated the keyboard, so the library is what owes the user a visible answer.

### Changed — the comment convention, applied; and this file, compacted

**`src/` 9 338 → 9 283 comment lines.** Two passes. The first put back in the present twelve
comments that explained a decision by telling the story of what came before it — the one thing the
convention says comments never do, because this file owns it. Judged site by site rather than by
pattern: of 37 matches for "used to" and "no longer", a third were real, so no lint rule was added.
Every measurement survived its rewrite.

The second compressed the blocks that restated a single source — `prioritize` was carrying three
facts the compatibility matrix and `raiseDialog` already own. Untouched at their current density:
the WebKit subscriber-order bet, the contravariance reason on the store port, and
`modal-director`'s single-key paragraph, each of which exists to stop one specific change being
made twice.

**This file 5 412 → 4 633 lines.** Everything from 2026-04-23 back — 41 date blocks, 342 entries —
is summarised in place. That range is largely a _predecessor_ store library's record:
`connectDevtools`, `useSuspenseStore`, `createDerivedStore`, `watch`, `deepClone`, a benchmark
suite. None of it exists here, and `src/CLAUDE.md` names `createDerivedStore` only to say there is
no such thing — so a reader searching this file for `watch` found it announced as added. The full
text stays in git history, which the summary says.

Two smaller things: the `@yourorg/dialog` note was the first paragraph a reader met and is now a
parenthesis under the rule it belongs to, and **2026-08-06 was two headings** against the
one-block-per-date convention — merged.

### Removed — `HANDOFF.md`, on the terms it set for itself

Its first paragraph said to delete it when the branch merged, and the branch merged. Where its four
sections went, since a changelog entry above still points at it:

1. **The engine matrix** was already answered on it — green on all three, on CI. Re-confirmed here
   against a real three-engine local run.
2. **The coverage pair** is re-measured below and lives in `CLAUDE.md` and `README.md`, which is
   where the rule to move both already pointed.
3. **Three exports used only inside their own file** — a decision it recorded as "left alone
   deliberately", so it dies with the file rather than outliving it as a task.
4. **A root export `API.md` never mentions** stays open, and is carried in the entry below rather
   than in a file nothing generates and nothing gates. Its narrower half — an _option_ the Options
   table never mentions — is a gate as of today.

### Changed — both coverage numbers, re-measured in one sitting

Unit 95.67% → **95.70%**, component 92.18% → **92.21%** over the same 54 files. `CLAUDE.md` and
`README.md` both moved, which is the pair the rule is about; the two README badges round to the
same 96% / 92% and are unchanged.

### Changed — the history of 2026-08-15 and 16 is two commits shorter

`ea8f9a8` and its revert `b2b2c10` are gone: the tree they produced was byte-identical to the one
before them, so nothing after them moved. What the revert _found_ is not gone — that
`check-examples.mjs` gates an `@example` on an `@internal` module exactly like one on a root export
is now stated in that script, where someone about to make the same mistake will read it.

The two `re-measure both coverage numbers, in the same sitting` commits are **kept and renamed**.
They looked like a duplicate and were not: two real measurements, one after `lock-ledger.ts`
arrived and one after `safe-storage.ts`. The defect was two distinct commits sharing one subject
line, so each names its module now. Nothing was reordered — moving non-adjacent commits would
change intermediate trees for a cosmetic gain.

Rebuilt with `git commit-tree` rather than a rebase, so every kept commit reuses its original tree
and the result is byte-identical at `HEAD` — checked with an empty `git diff` against the old tip
before anything was pushed.

### Fixed — `onError`'s payload type was unreachable, and its headline case untested

The option shipped wired on all three bindings and short of the surface around it. Four gaps, and
each one is a rule this repo already had written down.

**`ModalFailure` and `ModalErrorSource` reached no entry point.** `src/index.ts` carries the rule in
a comment — a consumer who can name what they were handed must be able to name its parts — and
`ModalErrorSource`'s own doc promises an exhaustive `switch` a consumer could not annotate. Not
caught by `docs:check`, because typedoc reaches them only through `UseModalBaseOptions`, which is in
`intentionallyNotExported` so each binding can re-export its own instantiation. Both are root
exports now, with the `CATEGORIES` entries `/api` needs.

**Nothing made `prepare` throw.** Anywhere, at any level — the failure the option was added for was
covered by no test on any binding. The `onClose` source had core coverage; the `prepare` source had
none, and it is the one whose whole point is that everything else settles normally. One CT per
binding now, each asserting both halves: the report arrives with its `source`, **and** the dialog is
open, no longer preparing, and no longer `aria-busy`. Checking only the first would pass on an
implementation that left the modal stuck announcing itself busy.

Worth measuring per binding rather than once: React reads the callback through a ref so a teardown
reports to whichever handler is current, Solid passes `options.onError` straight through, and
`umbra/vanilla` has no render pass at all, so the report reaches the page through the caller's own
subscriber.

**`API.md`'s `### Options` table did not list it.** The generated matrix chapter did, which is the
table nobody opens to answer "what can I pass". **That is now a gate** — the Options table is
checked against `OPTION_ROWS` with the two exceptions written down (`onOpenRequest`, documented in
the Dialog Manager chapter; `clipContainer`, `@internal`). It fails on exactly this omission.
Deliberately narrow: the broader rule — a root export `API.md` never mentions — would fail on about
twenty names today and needs a decision about what it should demand first.

**And the playground never showed it.** `When prepare fails` sits beside `Async Open` on
`/getting-started`, with a switch that makes the same open succeed or throw — because the
demonstration _is_ the pair. Both leave `aria-busy` at `false` and the dialog open; without
`onError` the only difference is that one of them has nothing in it.

### Changed — two parameters everywhere, and the rule that says so is on

`max-params: ["error", 2]` is enabled in `.oxlintrc.json`, so the convention the last few days
have been converging on is now the thing that fails a build. Deno's rule, taken whole: **an
options object counts as one of the two**, so `f(a, { b, c })` and never `f(a, b, { c })`. The
"2 + options" reading was considered and dropped — it has no stopping point, because every
parameter added positionally reads as the last one that could be, and the third one added is
always the one nobody remembers the order of.

Thirty-nine signatures moved. The public ones, and what each call site now says:

- **`applyStyle(element, { next, previous })`** — the chaining idiom is what `previous` was for,
  and it survives intact: `applied = applyStyle(el, { next, previous: applied })` is still one
  expression, and the return value is still `next` so it can be. `StyleWrite` is the new type,
  exported from the root and on the placement page of the reference.
- **`createStore(initial, { builder, equals, context })`** — the builder moved into the options
  object, which changes how the two overloads are told apart. It used to be positional, with weak-
  type detection ruling out the generic form because a function shares no property with an
  all-optional options type. Now the **domain overload is declared first and requires `builder`**,
  so a call carrying one matches it before arity is consulted and a call without one falls through.
  Declaration order rather than freshness, deliberately: excess-property checking would reject a
  stray `builder` on an object literal and let one through on a variable. `create-store.test.ts`
  pins all four instantiations, and its comment explains the new mechanism rather than the old one.
- **`getDialogAnimationStyles(phase, { animation, customStyle, placement })`** — four parameters,
  twenty-two call sites, and two of them optional in a way that made the fourth argument reachable
  only by passing `undefined` for the third.
- **`slideDialogStyle(geometry)` / `crossAxisStyle(geometry)`** — both read the same three answers,
  and one of them took them in a different order. `SlideGeometry` is that triple named once, which
  is the kind of defect the rule exists to make impossible rather than to catch.
- **`bindAction(button, { reason, ...options })`** and **`DialogManager.register(id, options)`**,
  whose `RegisterOptions` now carries the `store` it always travelled with.

Internally the same move, and the one worth reading is `modal-director.ts`: the step table's six
`(dom, pass, parts)` arrows are `(dom, { pass, parts })`, so the table stays a table.

Two exceptions, and both are signatures handed to us rather than written here — a Playwright
fixture and a Connect middleware. Each carries `oxlint-disable-next-line max-params` and a line
saying whose shape it is; the rule's own comment in `.oxlintrc.json` says that is the only kind of
exception there is.

### Added — `onError`, for the two userland failures that could not reach you

A `prepare` that throws and an `onClose` that throws were both invisible. Each was caught,
logged through `log.error` — silent unless `setLogLevel` is on — and then settled as if nothing
had happened: `open()`'s promise resolves, `isPreparing` goes false, `aria-busy` flips to false, and
the modal announces itself ready. A modal whose content failed to load presented as one that loaded
fine, and nothing documented it.

`onError({ error, source })` is the channel, and it is **userland only** by design. Nothing the
library does to itself arrives there: an internal failure is a bug, and routing it into a consumer
callback turns a crash into silent misbehaviour nobody can report.

The ones it deliberately does **not** claim already have homes, and taking them would have undone
decisions rather than filled gaps — an action's throw is the render args' `error`, a throw from
`render` reaches the framework's error boundary, and `onKeyDown` or an action's `onClick` escape to
the DOM listener that called them, which is where a handler's own exception belongs. That left
exactly two sources, so `ModalErrorSource` is a closed union of two rather than an open string.

One object rather than two parameters, for the reason the whole option surface is moving that way: a
third source becomes an addition instead of a signature change at every call site.

A report and not a veto — the close still completes and `isPreparing` still settles, so wiring this
to a reporter cannot change what the modal does.

The compatibility matrix gate caught the addition before any test did: a new option with no row
fails `yarn test:unit` with the file and the constant to edit. That is the gate doing exactly what
it was built for.

## 2026-08-15

### Fixed — `prepare` was called a gate in three places, and it cannot refuse anything

Left open this morning as "loose rather than wrong". Measured instead of read, and it is wrong.
`syncOpenSequence` calls `showDialog`, then `manager.syncStackOrder`, then
`store.scheduleOpenTransition()` — and only then starts `prepare`. So the dialog is on screen before
`prepare` begins and reaches `'open'` whether or not it settles, and a `prepare` that throws is
caught, logged, and runs `finishPreparing()` in the `finally` like any other. It gates neither the
appearance nor the phase, and it has no way to say no.

That collides with what "gate" already means here — `canDismiss`, `ActionGate` and `DismissGate` are
all things that decide whether something may proceed — and the collision got sharper the moment the
refusal tiers were written down beside it.

What actually waits on `prepare`: `open()`'s promise (`finishPreparing` flushes the resolvers
`beginOpen` pushed), `isPreparing` and therefore `aria-busy`, `dismissWhilePreparing`, and the
labelling diagnostic.

Three of the four places said "gates the open" — the compatibility matrix (and so API.md, generated
from it) and `src/CLAUDE.md`'s vocabulary row. **The accurate one was README.md**, which has said
"gates `isPreparing` and the promise `open()` returns" all along: the source of truth carried the
loose claim while the prose carried the precise one, which is the opposite of the arrangement the
matrix exists to produce.

### Fixed — `onKeyDown`'s `preventDefault()` takes the whole press, and the doc named one quarter of it

The option said "call `event.preventDefault()` to suppress the default ESC dismiss behavior". What a
prevented event actually does is stop the pipeline where it stands, so for that key the popup-claim
check, the **action hotkey dispatch** and the dismiss key are all skipped — four consequences, one
of them documented, and framed as ESC-specific when it is per-press.

The gap is not academic. Preventing Escape to hold a modal open behaves exactly as the sentence
implies; preventing a key that some action declared as its hotkey silently stops that action from
firing, and nothing in the option's documentation suggested it could. `ActionOptions` already
described this as "the same protocol `useModal`'s `onKeyDown` already uses" — so the protocol was
named as shared while only one side of it was described accurately.

### Added — how a callback refuses is what its name has to say

Found while checking whether the gate-versus-notification rule in the vocabulary table actually
holds. It does, and more consistently than the table claims: there are three tiers, and every
callback in the library already sits in the right one.

`on…Request` asks and reads the **return value** — `onOpenRequest` through `request.refuse(reason)`,
`onDismissRequest` by returning `false`. A plain `on…` on a user gesture refuses through the
**event** — `onKeyDown` and an action's `onClick` both take the press with `preventDefault()`, both
return `void`, and nothing reads it. `onClose` is the only pure notification, and its result is
ignored on purpose.

That was applied everywhere and written nowhere, which left a new callback with no rule to follow.
It is a row in the vocabulary table now, with the three tiers spelled out beneath it: a callback
that may say no by returning something is `on…Request`; one that vetoes a gesture is `on…` and does
it through the event; one that merely reports keeps `on…` and is read by nobody.

### Changed — a lock owner is a minted token now, not "any object"

`lockBodyScroll(owner: object)` said something wider than it meant. The parameter is an identity —
every comparison downstream is by reference, and nothing ever reads a field off it — but `object`
reads as _any_ non-primitive, which invites passing a domain object that happens to be in scope and
makes the lock's identity accidental rather than declared.

`LockOwner` is branded with a `unique symbol` and minted by `createLockOwner()`. Measured against
the compiler rather than argued: a string, a number, `null`, a function and a stray `{ id: 1 }` are
each rejected now, where `object` accepted the last two. The manager's `const lockOwner = {}` reads
as `createLockOwner()`, which says what it is.

**`WeakKey` was the other candidate and is the interesting rejection.** It is the standard
vocabulary for "a thing with identity", it is not the bare `object` keyword, and it costs nothing —
but it resolves to `object | symbol` here, and its name promises weak retention while the ledger
holds owners in a **strong** `Set`, which it must, because it reads `size`. A name that implies the
opposite of what the data structure does is worse than the vague one it replaces.

Worth knowing for the next time this comes up: `object` was never the loose type. The loose one is
`{}`, which accepts primitives — `typescript/no-empty-object-type` has been `"error"` here all
along, and `object` is unrestricted. The change is about saying _which_ identity, not about
tightening a hole.

### Fixed — `containFocus` told you to set it on a modal dialog, where it now buys nothing

The option's own JSDoc said "**Worth setting on a modal dialog too**, which the name does not
suggest", and gave the reason: clicking a panel's empty space focuses the `<dialog>` element, and
WebKit does not move Tab from there into the content. That reason is real and the advice is stale —
the recovery moved out from behind the flag and is unconditional now.
`attach-focus-containment.ts` attaches it _before_ reading `containFocus`, and says so in its own
comment: "Unconditional, and that is the point. This used to sit behind `containFocus`."

So a caller following the option's documentation adds two inert focus markers inside content the top
layer is already containing, and gets a behaviour they already had. Caught by the compatibility
matrix disagreeing with it — the matrix row has said `✗ ignored by nonModal: false` since the
recovery moved, which is the whole reason the table is the source of truth and prose is not.

The playground's one use is on a non-modal dialog and describes it correctly; nothing else repeated
the advice.

### Fixed — two public options were missing from the table a caller reads

`onDismissRequest` appeared **once** in the whole of API.md — inside the generated compatibility
matrix, which is a table about how features interact rather than the option reference. `containFocus`
appeared only in that chapter too. Both are options a caller passes to `useModal`, and neither was in
the `useModal` chapter's option table, so a reader of the reference would not learn they exist.

`onDismissRequest` is the more serious of the two: it is the newest option in the library, it has a
playground example built on it, and its entire user-facing documentation was one cell of a generated
grid.

Both have rows now. The two remaining options the table does not carry are correct as they are —
`onOpenRequest` is documented with a worked example in the Dialog Manager chapter, where a
registration-time option belongs, and `clipContainer` is `@internal`.

### Changed — "about 200 lines each" now says which 200 lines, because it was read two ways

Flagged an hour earlier as a claim the code contradicts, on a count of the whole binding folder —
`react/` 442 code lines, `solid/` 492, `vanilla/` 306. That was the wrong count. The paragraph is
the tail of _What a binding actually does_, whose six items are all things one file does, and by
that reading the claim is close to right: `react/use-modal.tsx` is 204, `solid/use-modal.ts` 221,
`vanilla/bind-dialog.ts` 264.

So the defect was never the number, it was that the sentence did not say what it counted — and a
number that can be read two ways gets checked against the wrong one, which is what happened here.
It names the file now, and names the difference too: on the hook bindings the outlet, the provider,
`useLookup` and the two template hooks roughly double it and are surface rather than lifecycle, and
`umbra/vanilla` has none of them, which is why its one file is the largest and its folder the
smallest.

The neighbouring claim — that the two hook bindings "mirror each other file for file" — was checked
at the same time and is sound, though not in the way a line count would show: a whitespace-insensitive
diff of the two `use-modal` files is ~457 differing lines, because the mirror is of export names and
module paths, and that is what `binding-parity.test.ts` gates.

### Fixed — `parseHotkey` was undocumented in the chapter that names its four siblings

API.md's hotkey chapter is titled `Key, formatHotkeyLabel, formatAriaKeyshortcuts, matchesHotkey`,
and `parseHotkey` appeared nowhere in the file — nor in CLAUDE.md's root-export summary, which lists
the other three hotkey functions in a row. A reader of either would conclude the crossing does not
exist and write the unchecked cast `parseHotkey` was added to prevent, which is the same failure
`src/CLAUDE.md` records for `useSlideModal`: a surface can be complete while the documentation says
otherwise, and the honest reading of the omission is "there isn't one".

The chapter now has a `parseHotkey` section — what it is for (a shortcut arriving as _data_: a config
file, a user preference, a value from a server), what it refuses, and the fact that it returns a
member of the union or admits it cannot. Both the heading and the one internal link to it were
updated together.

**Nothing gates this**, which is why it happened: `yarn docs:matrix:check` covers only the
Compatibility chapter, typedoc catches an unexported type in a public signature, and
`api-categories.test.ts` catches a missing playground category — none of them notices a root export
API.md never mentions. Around twenty are in that position, mostly types. Recorded in `HANDOFF.md`
rather than gated, because a gate needs a decision about what it should demand.

### Fixed — the coverage pair is quoted in two documents, and only one was being moved

README.md carried its own copy — 93.2% unit, 92.0% component over 51 files, dated 2026-08-13 — while
CLAUDE.md carried 95.67% / 92.18% over 54, and two README badges are hand-set from the same numbers.
The README's own paragraph says the two numbers must be "re-measured together or not at all: one
number moved without the other is two projects being compared across different days" — and that is
exactly what had happened to it, one document at a time rather than one project at a time.

Both copies now say the same thing, the badges with them, and each names the other so the next
re-measurement has somewhere to look.

### Fixed — `applyStyle`'s custom-property branch was called unreachable, and is not

The doc said "unreachable from TypeScript, deliberately kept … it is why this function is not fully
covered", and the second half followed from the first. The first half is too strong: an object
_literal_ carrying `--dialog-backdrop` is rejected, because `DialogStyle` is a mapped type over
`CSSStyleDeclaration`'s keys — but a `Record<string, string>` is assignable, and that is what a
style assembled at runtime actually is. It is also what `umbra/vanilla` hands over from plain
JavaScript, which is the caller the branch was kept for in the first place.

So the one styling lever the library documents now has a test, both halves of it: the name survives
the hyphenation untouched (`--dialog-backdrop` is already the spelling `setProperty` wants, and the
camelCase rule would leave it alone only by accident), and the clearing pass finds it again — the
half that would otherwise strand a backdrop colour on the element after the style that set it
stopped naming it.

`core/style.ts` 98.4% → 100% statements, 91.7% → 100% branches.

### Fixed — the storage probe re-ran forever in the one environment it was written for

`getStorage()` memoised into `let storage: Storage | null | undefined`, where `undefined` meant
"not asked yet" — and the probe assigned `globalThis.localStorage` straight into it. The DOM lib
types that as a non-optional `Storage`, so nothing complained; at runtime a `window` with no
storage on it answers `undefined`, which the memo then read as "not asked yet" and probed again.
On every log call, forever.

That is precisely the cost the memo exists to prevent, and its own comment says so: Node exposes
`localStorage` as a getter that emits a process warning unless the process was started with
`--localstorage-file`, "nothing throws, so a `try`/`catch` cannot quiet it — only not looking again
can". A jsdom without storage, a WebView, a partial SSR global: each one looks again. The sentinel
and the value were the same variable, and remembering _absence_ is the case that mattered most.

### Changed — Web Storage failure is a decision now, with all three of its failures reachable

`createSafeStorage` (`utils/safe-storage.ts`) takes a probe and returns three methods that cannot
fail: a read answers `null`, a write and a remove are no-ops. The probe is called at most once —
a separate `probed` flag, which is what makes the fix above structural rather than a patch — and is
allowed to throw or to answer nothing, all remembered alike.

It is an extraction for the reason the scroll lock's ledger was one: the rule was welded to
`globalThis`, so **neither project could reach it**. The unit project is Node, so the probe answered
`null` before touching anything and every path behind it was dead; the component project has a
browser, where storage always works, so a storage that _refuses_ cannot be arranged there either.
Between them, three documented real failures had no test and could not have one — a sandboxed
`<iframe>` raising `SecurityError` on the property access, a quota exceeded on write, a permission
revoked between two reads.

Eleven tests, including the regression for the sentinel and the two that say why the write must
stay silent: `setLogLevel('*', true)` has already set the session override by the time the write
happens, so logging is on either way and only its survival across a reload is at stake.

`utils/logger.ts` 94.9% → 100% statements and 78.8% → 97.3% branches; the branch left is the
`typeof globalThis.window` question itself, which is the environment-specific two lines that stayed
behind. Unit coverage 95.30% → 95.63%, branches 94.48% → 96.19%.

### Fixed — `createLogger`'s documentation was on the private helper above it

The block naming the function, its parameter, its return and its four-line `@example` sat on
`resolveColor`, which is a colour lookup that happens to take a `namespace: string` too — which is
how it went unread. `createLogger` itself had no doc at all. Moved onto the function it describes,
and `resolveColor` given the one sentence it actually needs: nearest ancestor, not first, which is
what keeps `modal:lifecycle:deep` on its parent's hue.

### Removed — the lazy `LogData` thunk, which nothing has ever passed

`LogData` had accepted `() => Record<string, unknown>` since it was written and `Logger` advertised
it on all three channels. No call site in `src/`, none in the playground, and no test — and
`createLogger` is `@internal`, so no consumer could reach it either.

Adding a test for it was the wrong move and was reverted in the same sitting. `isNullish` came out
yesterday with the reason written down — "it was reachable only by its own test, which is the shape
a helper takes when it is kept alive by the thing that was meant to check it" — and a test here
would have made this exactly that.

The saving it exists for is real in general and not real here: every call site passes a small object
literal, so deferring one costs a ternary on the emit path to avoid nothing. If a detail worth
deferring ever turns up, the thunk is two lines and arrives with the call site that wants it.

`LogData` is `Record<string, unknown>` now and `emit` prints its argument.

### Added — eight of the fourteen shapes `HotkeyDef` names had never reached `parseHotkey`

`parseHotkey`'s `switch` is a second writing of the union, one arm per modifier arrangement, each
rebuilding a distinct literal from pieces. Six arms were exercised; the other eight — `Alt`,
`Shift`, `Meta`, `Ctrl+Alt`, `Ctrl+Meta`, `Alt+Shift`, `Alt+Meta`, `Shift+Meta` — were strings
nobody had ever read back. A transposed prefix there (`Alt+Meta` answering `Meta+Alt+`) is still a
`HotkeyDef`, so the type accepts it and it fails nowhere: it fails at a keyboard, as a shortcut
matching no button.

The table is **derived from the union rather than listed beside it**. Pinning the key to a single
letter makes the set finite, and an `Extract` over it names exactly the arrangements the union
carries — so a fifteenth shape added to `HotkeyDef` is a compile error in this file until it is
covered, rather than a silently untested arm. Verified by deleting an entry and watching
`type-check` fail.

One assertion per shape, and it is the whole contract: the arm rebuilds the exact arrangement it was
handed. An arm answering with a _different_ valid shape fails that too, so there is no separate
distinctness check — and the spot-check of the three-modifier shapes it replaces has gone with it.

`utils/hotkey-utils.ts` 96.7% → 100% statements.

### Added — `runDeclarationWindow` is the shape of every render pass, and nothing ran it

Four lines with two documented reasons to exist and no assertion under either. Both hook bindings
wrap their `render` in it, so it is how every declaration pass in the library is performed — and
the whole of what it adds over calling `beginRender` and `endRender` in a row is what happens when
the call between them throws.

Two tests. The value comes back and the window opened and closed around it in that order; and a
`render` that throws closes the window anyway — asserted through what a missed close costs rather
than through a flag, since `endRender` is the swap: the interrupted pass's table goes live, so an
action it did not redeclare is retired instead of surviving into a modal whose backdrop click stays
opt-in from a pass that never finished.

### Changed — the scroll lock's ownership is a decision now, so the rule it protects can fail a test

`lockBodyScroll` held an eleven-line comment about a `Set` and no test of what the comment says.
Every line of the rule — a claim is idempotent, the lock applies on the first claim only, it is let
go when the last claim goes, an owner that never claimed releases nothing — sat behind
`typeof document === 'undefined'`, which is the branch the unit project always takes. The only
thing that could reach it was a component test standing up two managers at once, and that test
proves the composite behaviour rather than the rule.

`createLockLedger` (`manager/lock-ledger.ts`) is the rule, beside `stack-order.ts` and for the same
reason: a decision the manager makes, extracted from the DOM that acts on it. It answers one
question — _is this call the edge?_ — because a caller handed the `Set` has to restate the
transition rule to read an answer out of it, and the restatement is what drifts.

Both entry points read the same afterwards and the `wasUnlocked` dance is gone:
`if (typeof document === 'undefined' || !ledger.claim(owner)) return;`. The document guard stays
ahead of the claim, which is a contract of its own — a server render that seeded the ledger would
leave the first real lock in a hydrated page unable to apply.

Eight tests, including the two that had nowhere to live before: a second owner's release is not the
edge (the last-writer-wins defect the ledger exists for), and owners are identity, so two manager
tokens that are both `{}` are two claimants rather than one.

`manager/scroll-lock.ts` 71.05% → 72.92%, `lock-ledger.ts` at 100%, unit coverage 94.88% → 95.02%.
The file it left is still mostly the DOM half, and that is the honest shape: what moved out is the
part that was never about a document.

### Fixed — the Tab recovery could hand focus to a control belonging to a nested dialog

Left open this morning as "argued from the code, not measured", with the one arrangement to build
written into the caveat. Built, and it reproduces on all three engines.

`focusFirstAvailable` — the scan answering a Tab pressed while focus sits on the `<dialog>` element
— walked a plain `querySelectorAll` where every other lookup in `focus-policy.ts` goes through
`queryOwn`. A modal opened from inside another renders its `<dialog>` in that subtree, which is the
documented shape rather than an exotic one, so the scan collected the nested dialog's controls too.

**Invisible forward, plain in reverse**, which is why it survived: this dialog's own first control is
first in document order either way, so `Tab` was right by accident. `Shift+Tab` scans from the end
and reached a nested non-modal panel's button — focus handed to a dialog that did not ask for it and
does not answer for it.

`queryAllOwn` is `queryOwn`'s plural, added to `utils/dialog-scope.ts` rather than written as a
filter at the call site: the rule is _which elements are this dialog's_, and a second copy of it is
how the two drift.

The arrangement is also why the nested panel in the harness is non-modal. A nested **modal** one puts
the top layer over this dialog's dead space, so the click that puts focus on the `<dialog>` element
— the only press this recovery exists for — cannot be made at all.

### Changed — `preferredRestoreTarget` asks for what it reads, and is a unit test now

`isConnected` is the whole of what it looks at, and it asked for two `HTMLElement`s — so a two-line
decision sat in a browser-only file with no test, three lines above the function whose own doc names
it as the thing that got this wrong. `chooseActionRunner` had already taken this exact turn, with the
sentence "the DOM type in the signature was never a DOM dependency" written above it; its sibling
just never followed. Generic over `{ isConnected }` now, no call site changed, five tests — including
the one that pins what it deliberately does _not_ check, so the next reader does not add a second
guard for a hazard `restoreFocus` already answers.

### Removed — `isNullish`, which existed twice and was called nowhere

`src/utils/is-nullish.ts` and `playground/src/shared/lib/is-nullish.ts`, both from the initial
commit, both with no importer in either package. The library copy was not exported from the root
either, so it was not even reachable by a consumer — it was reachable only by its own test, which is
the shape a helper takes when it is kept alive by the thing that was meant to check it. The
playground copy had no test at all, against the rule that `shared/lib` ships tested.

Neither `src/` nor the playground uses a truthiness helper today: strict null checks and a concrete
`X | null` make `=== null` the clearer read at every site that would have wanted one.

### Changed — the lifecycle executor is its own decision, so its two invariants can fail a test

Every framework-free piece of this library is a named function with a test. The one that ran the
lifecycle was not: `createModalDirector` held the diffing loop inline, and the only step table it
could be handed was the real one — DOM to the last line. So the executor was reachable only through
a browser, and its two load-bearing rules were carried by paragraphs describing failures no test
could produce:

- **Detach everything stale before attaching any of it.** Rebuilding each step in place interleaves,
  and listener dispatch follows the order listeners were added — so the steps that survived a pass
  would quietly change places with the ones that did not.
- **`destroy` clears the keys, not just the teardowns.** Otherwise the runner still believes every
  step is attached, the next `sync` rebuilds nothing, and the modal works on mount and is inert
  after a remount — which passes in one React mode.

`createStepRunner` ([core/step-runner.ts](src/core/step-runner.ts)) is that rule, generic over the
pass and the per-pass context, with no idea what a step does. The director composes it and keeps
what is genuinely about modals: which steps there are, what each reads, and the DOM context they
share. Behaviour is unchanged — the table, the order and the `inputs: null` path are the same lines.

A third contract came out of writing the tests and is now stated on `SyncStep`: an `inputs: null`
step must not **return** a teardown, because there is no pass on which the runner would call it. The
real table's only such step returns `void`, so nothing would have noticed the day one did.

`sameInputs` moved with the rule it belongs to and is tested once instead of twice.

Unit coverage 92.75% → **94.75%**, and `attach-focus-containment.ts` joins the one-by-one exclude
list in `.c8rc.json`: with the focus scan gone to `focus-policy.ts` it has no Node-reachable runtime
left, which is the decision that list exists to record.

### Added — the reclaim floor, measured on Solid and on vanilla instead of inferred from the core

The repair is core and every binding reaches it through `createFocusCoordinator`, so the caveat on
the matrix row said there was nothing binding-shaped to suspect. Measuring anyway turned up two
things that inference had got wrong, and one of them is a difference the repo had already decided
was invisible.

**The theft is Chromium's.** On Firefox and WebKit a non-modal `show()` underneath does not take the
keyboard from a modal in the top layer — disable both repair paths and those two engines stay green.
So what the reclaim fixes is one engine's reading of the focusing steps, not a universal law.

**And on `umbra/vanilla` the floor is not the path that delivers it.** `bind-dialog.ts` runs
`focus.sync` _before_ `syncOpenSequence`, where the director runs it after. That is a known
difference — `wiring-order.test.ts` records it and `modal-director.ts` describes adopting the
director as "measured green on three engines and deliberately not taken, because no test noticed".
Something notices now: arming the coordinator's `focusin` listener a beat earlier means it hears the
opening focus `showModal()` places, so vanilla remembers a `lastFocusInside` the hook bindings leave
empty and the reclaim takes its `preferred` path instead of falling to the floor. Both deliver the
same guarantee, which is why nothing failed. The director's doc says so now, so the next reading of
that decision starts from the measurement.

Established by disabling each path alone (green) and both together (red) rather than by reading the
code — which is what turned up the fact that the tests as first written passed on vanilla with the
floor removed entirely.

## 2026-08-14

### Fixed — a raised dialog that claimed no opening focus gets a real floor under it

A panel opening underneath a modal runs the platform's focusing steps and takes the keyboard from the
dialog in front; `reclaimFocus` exists to undo that. With a `focusOnOpen` claim there is something to
aim at and the repair worked. **Without one there was nothing**, and the fallback was `dialog.focus()`
— which an open `<dialog>` refuses. So the modal stayed on screen with focus on `<body>`, where its
keydown listener hears nothing and every hotkey but Escape is dead. The floor is the dialog's **first
focusable** now.

The arrangement is a microfrontend shell's, not a contrived one: a blocking "agent not detected"
warning is already up and a route settles a non-modal panel beneath it.

### Fixed — that floor asked the document who had focus, and a shadow root answers with the host

The scan focuses a candidate and then asks who holds it, which is what lets a wrong guess cost a step
instead of the keyboard. It asked `ownerDocument.activeElement` — the **one** raw read of that left in
`src/`, every other focus check having moved to `activeWithin` when the core learned about roots. In a
shadow tree the document answers with the _host_, so a candidate that took focus perfectly well failed
the check: the scan walked the whole list and left the dialog on its **last** control instead of its
first, then reported that nothing had taken it.

**The wrong element is measured**, by a shadow-rooted copy of the harness the floor arrived with: it
fails on Chromium and passes on WebKit and Firefox, which is why nothing caught it — the shadow-root
tests the three bindings carry all claim `focusOnOpen`, so none of them ever reached the scan.

`focusFirstAvailable` lives in [core/focus-policy.ts](src/core/focus-policy.ts) now rather than in the
containment it was written for. That is the fix rather than a tidy-up: the module's whole subject is
who holds focus, `activeWithin` is the one way it asks, and a focus function in another file is that
question waiting to be asked the wrong way again. It also keeps the dependency edge one-way, which
importing `activeWithin` the other direction would not have.

`focusInside` replaces the same predicate written out three times — the reflexive-`contains` exclusion
that `captureActionRunner` documents as a _truthy_ wrong answer, and which the new floor had just
become the fourth copy of.

### Added — `bindDialog` adopts a dialog the server sent already open

A page can arrive with `<dialog open>` in served HTML — that is what server-rendering a panel means
— and `bindDialog` then met an element that was open while its brand-new store said `closed`.
Measured on all three engines before anything was touched: `open=true`, `phase=closed`,
`display=none`. The DOM reported open, the store reported closed, the user saw nothing, and nothing
warned.

**Adoption is only honest for a non-modal dialog, and that is a platform law rather than a policy.**
The top layer is enterable only through `showModal()` from script, so an `open` attribute in HTML is
by definition a non-modal open — no backdrop, nothing inert. It is the one thing SSR cannot hand a
dialog. A non-modal one is adopted where it stands; a modal one is closed with a warning, because
the caller asked for the top layer and the only way in is to open it again from script.

Stated on `bindDialog`'s own JSDoc, which is what reaches `/api`, and in the README — "can I
server-render this" is asked before installing rather than after. It is `umbra/vanilla`'s alone and
can only be: the other two bindings build their own element.

### Added — shadow-root tests for React and Solid, which had been claiming it on vanilla's

`yarn todo` listed `✓ untested` against both hook bindings for "a dialog inside a shadow root" — the
matrix's word for a cell that says yes with nothing behind it. `umbra/vanilla` had carried the test
since a microfrontend frame found the problem, and the other two rested on it.

Each now has its own, in the shape that binding actually meets the case: React portals the dialog
into the root with `createPortal`, Solid renders the whole app into it. Both assert the two things a
shadow boundary breaks, and **both fail quietly rather than throwing**, which is why claiming them
untested was worse than claiming them broken — `adoptedStyleSheets` does not cross the boundary, so
the dialog falls back to the UA backdrop (measured `rgba(0, 0, 0, 0.1)` against the library's
`0.7`), and `document.activeElement` answers with the _host_, so a focus policy reading it concludes
focus has left the dialog on every check.

### Changed — the playground's layer rule is a gate now, because prose was not holding it

`playground/CLAUDE.md` states that imports run downward only and that a slice is entered through its
public entry. Measured across 222 files, neither was true.

Four imports ran upward, three with the same cause: a context defined in `app/providers/*` that a
lower layer needed. Those contracts move to `shared/lib/{theme-context,code-pane-context}` and the
providers stay in `app`, where owning the MUI theme object and the persistence belongs. The fourth
was `RootLayout` — a _widget_ — wrapping the application in both providers, which it had to reach
into `app` to get; composing the application's providers is `app`'s job by definition, so
`router.tsx` does it and the shell renders the shell.

Thirty cross-slice imports went straight at a `ui/` file whose barrel already exported the name —
`@/entities/example/ui/ExampleLayout` twenty-five times, against an `index.ts` that had exported it
all along. Rewritten to the public entry, no barrel added. `useCodePane` is deliberately **not**
re-exported from the code-viewer barrel after its move: two doors onto one hook is how the upward
import gets back in through the second one.

Both halves are `playground/src/__tests__/fsd-layers.test.ts` now, with its two exemptions written
down as decisions rather than left as silence.

### Changed — the CI matrix shards the unit suite and stops sharding the component one

The component matrix was cut three ways by shard _and_ three ways by engine — nine jobs, each paying
for its own Playwright container and its own `yarn install --immutable`, to parallelise a suite
whose slowest engine already finishes in about three minutes.

The engine split is the one worth having: "which engines disagree" is the question, and `fail-fast:
false` is what protects it. Sharding on top buys wall-clock the setup cost gives straight back, and
triples the number of legs that can flake independently — on a suite whose flake that week was
load-induced. So it is one job per browser again. The unit suite keeps its three shards: one Node
process against pure functions splits into equal thirds and pays nothing but startup.

`test:component:shard` stays in `package.json`. It is the right tool locally, where the full
three-engine run is the long pole and there is no container to build.

### Fixed — `yarn check` did not deny lint warnings, so three had accumulated invisibly

The Stop hook denied them and `yarn check` did not — and the documented pre-commit gate is the one
people run. `check` and `verify:all` deny them now; `lint` stays permissive for interactive use.

The three that had slipped through: two `no-useless-escape` on `<\/script>` in a smoke flow, where
the string is an HTTP response body rather than HTML embedded in a script tag, so the backslash
bought nothing; and `only-export-components` on `router.tsx`, where a module exporting a component
_and_ something else costs Fast Refresh the whole file — `AppRoot` moved to `app/AppRoot.tsx`.

Two non-findings recorded so they are not re-investigated: the three `eslint-disable` comments are
load-bearing rather than dead (removing one makes `typescript(only-throw-error)` fire, so oxlint
honours the eslint-style name), and the stray `eslint*.ps1` shims at the root no longer exist.

## 2026-08-13

### Changed — the order the lifecycle is wired in is a decision the core makes now

**The core shipped decisions and not direction.** `canDismiss`, `orderStack`, `chooseActionRunner`,
`shouldDismissOnBackdropClick` — each named, documented, tested. The _sequence_ those decisions are
asked in was the one thing written three times and asserted nowhere: it existed only as the order of
statements in three binding files. That is the same shape as the WebKit focus bug one layer down, an
ordering nobody named and nothing could test.

It is [core/modal-director.ts](src/core/modal-director.ts) now. Both hook bindings run the whole
lifecycle through **one deps-free call** and one teardown; `MODAL_LIFECYCLE_SEQUENCE` is _derived_
from the table that runs the steps, so there is no second statement of the order to drift from the
first. React's `useModal` lost six dependency arrays and the focus coordinator it used to build.

**Arrived at through two corrections, and both are the reason it is worth reading.**

The first: a single ordered pass keyed on `[phase, isPreparing, …options]` would capture `prepare` at
the last key change and hold a stale closure. React's opening effect has no dependency array
deliberately, and the comment saying why was already in the file.

The second killed the two-tier design that replaced it, and is the sharper one. `focus.sync` carries
state across its own attachment — `wasRunning` is how it recognises an action settling and hands
focus back to the button that ran it. Any shared key contains `onKeyDown`, which callers pass as an
inline arrow, and an action starting _is_ a render: the key moves mid-action, the step is rebuilt
with `wasRunning` back to `false`, and focus is never restored. **So the granularity in React's six
dependency arrays was not redundant** — one of the distinctions was load-bearing, and a measurement
that counted the arrays concluded the opposite.

The design that survives both is vanilla's `attachedFor` generalised from one key to **one key per
step**: React's dependency array, made framework-free. Each step declares what it reads, and only
the steps whose own inputs moved are rebuilt. Granularity is a property of the core now rather than
something each binding remembers.

**Both halves of that are gated, and both were seen to fail.** `modal-director.test.ts` asserts
`focus.sync` reads the phase and nothing else, and a component test drives a modal whose `onKeyDown`
is an inline arrow through an action that re-renders while it runs. Adding `onKeyDown` to that one
step's inputs fails the unit test and fails the component test on **all three engines**, with focus
left on the `<dialog>` — where a `contains` check would have accepted it, which is why the assertion
names the button.

`umbra/vanilla` stays on its own `sync()`. Adopting the director there moves `syncOpenSequence` from
last to first, which is a change measured green on three engines and deliberately not taken: "no
test noticed" is enough to close a contract question between two bindings that owe each other a
mirror, and not enough to move shipped behaviour that owes nobody one. `wiring-order.test.ts` records
the divergence and now asserts the thing that matters instead — that no hook binding wires a step
behind the director's back.

### Fixed — `chooseActionRunner`, and two conventions that were held by memory

Three things the director's groundwork turned up, each shipped on its own.

**The three-read narrowing that decides who ran an action was a `??` chain inside a scheduling
function.** `captureActionRunner(...) ?? lastActivated ?? lastFocusInside` _is_ the policy — who has
focus, else who was pressed, else who had focus last — and a wrong truthy answer from the first read
silently disables the other two, which is exactly what the WebKit bug was. It is
`chooseActionRunner` in `focus-policy.ts` now, with the ordering unit-tested directly; the file came
off the coverage exclude list with it.

**Per-test manager isolation was three different habits and no gate.** React harnesses get a
`DialogManagerProvider` from `playwright/index.tsx`; Solid harnesses wrap themselves; vanilla ones
pass `manager: createDialogManager()`. A new Solid or vanilla harness that forgets does not fail — it
registers with the module-level singleton and leaks across the run. `harness-isolation.test.ts` is
the grep that holds it. Mutation-checking it found a hole in the gate itself: the first version was
satisfied by a _comment_ mentioning `createDialogManager`, so it strips comments before judging.

**Solid asked the lifecycle in a different order from React**, settling focus after focus containment
and click-outside where React settles it before. Nothing can observe either order — both bindings
flush their effects in declaration order within one task — but the hook pair is the same modal
written twice, and an unexplained difference in _when_ it asks is a defect against that contract
whether or not anything can see it.

### `onDismissRequest` — the dismiss key handed to the owner

A surface whose `open` is a prop cannot let its dialog close itself. The boolean upstream would
still be `true`, the next render would put the dialog back, and in between the modal is gone while
its call site believes it is up. The only correct answer to the dismiss key there is to _report_ it
and let the owner lower the prop.

Everything needed to decide **whether** that press counts was already here and is unchanged: which
key, whether an action claimed it, whether a popup inside the dialog answers it first, whether a
`prepare` or a running action forbids it, and — for a non-modal panel — which dialog is actually in
front. What a controlled surface was re-implementing is the last step, and only the last step. So
that is what this option replaces: `store.close(DISMISS_REASON)` becomes a call to the owner.

**Why it belongs here rather than in each wrapper.** Written outside, it is written three times and
differently, because the three cases are not alike. A modal dialog hears the press through its own
`keydown` and through the native `cancel`; a non-modal panel hears it through neither — it is
outside the top layer, so focus is ordinary, and the press is routinely made somewhere else on the
page entirely. That third listener is the one nobody gets right by hand, and it already existed.

**Returning `false` declines the press.** Only the non-modal listener acts on it, and it has to: it
captures at the window, so a press it takes is a press the page never sees. An owner that decided
not to act must not cost the page its keyboard — the same rule the dismissal gate already follows
when it stands down.

**The playground gains the pair it completes.** `/advanced` → _When the open is a prop_ is a
controlled panel where a switch is the only truth: `onDismissRequest` reports Escape, an action
that never calls `close` reports the button, and `reconcileOpen` — which had no demo at all, only
tests — puts the dialog wherever the switch says, so an instruction from outside is undone in front
of the reader. It is **non-modal by necessity** rather than by taste, since a modal dialog's
backdrop would put its own switch out of reach, and that is the constraint a controlled surface
runs into first. Driven in a browser rather than reasoned about: the switch, an Escape pressed with
focus outside the panel, the outside instruction being reverted, the action, and the computed
accessible name.

**It landed on the director, having been written before one existed**, and the meeting is worth a
line because it is the first evidence either way. Three bindings threading an option into three
`keydownOptions` became one field on `ModalLifecyclePass` and one entry in the keydown step's
inputs — so the three listeners re-attach when the handler's identity changes, which they must,
and `focus.sync` does not, which it must not. **Seen to be load-bearing**: dropping that one entry
fails "closes on the press the owner acts on" and "a declined press is left travelling" on all
three engines, because a controlled owner's handler closes over the state that decides the answer
and a stale one keeps giving the previous answer.

### CI — one component job per engine

The component suite is the pipeline's long pole: **951 tests on one worker, 7 min 52 s**, while every
other job finishes between twenty seconds and two and a half minutes. It is three jobs now — one per
engine — on independent runners, which is the part that makes it free of the shared-state risk raising
`workers` would carry.

**Measured on the first run of it**, test step per leg: Chromium 2 min 22 s, WebKit 2 min 40 s, Gecko
3 min 00 s. The whole pipeline went from **9 min 11 s to 4 min 34 s** — the slowest leg is no longer
what the run waits on, `Playground Smoke` and the Gecko leg now finish within a minute of each other.

**The second reason is the one this week paid for.** The engines genuinely disagree: a focus assertion
was green on Chromium and red on WebKit, and in a single job that is one line buried in a 951-test log.
It is a job name now. `fail-fast: false` for the same reason — cancelling the other two legs the moment
one goes red throws away exactly the comparison that makes a cross-engine run worth paying for, since
"which engines disagree" is the question and a cancelled leg cannot answer it.

Raising `workers` above 1 is **not** part of this and should be measured on its own: the tests that
just went flaky are focus and timing tests, which is precisely what a busier machine degrades.

### Fix — the focus restore was relying on Chromium's inertness, and WebKit said so

CI went red on one assertion and flaky on another, both WebKit, both about focus. **One was a test
pinning an engine; the other was a real missing guard.**

**The guard.** `scheduleRestore` — the frame-delayed focus restore after an action settles — never
asked whether its dialog was still the one in front. The rule is stated a few lines below it, on the
reclaim: the user is looking at the dialog on top, and an action settling _underneath_ has no claim on
their keyboard. A save started before a second modal opened lands a frame later and pulls focus out of
whatever they have since typed. **Chromium hides it**: a modal dialog renders everything behind it
inert, so the `focus()` is a silent no-op and the rule looks like it holds for free. WebKit lets it
through. The library was relying on an inertness it never asked for, and the check is explicit now.

**And the new test proves it where Chromium can answer.** The existing one puts a modal in front, so it
passes on Chromium whether or not the library checks anything — which is exactly why it took a second
engine to find this. A sibling test uses **two non-modal panels**: nothing is inert, so a restore that
forgets to ask really does steal the keyboard, on every engine. Seen to fail without the guard and pass
with it.

**The test that was pinning an engine** is `keeps the keyboard when something opens over it`. Its claim
is in its title — the dialog in front keeps the keyboard — but it asserted _which control_ had it, and
that is the engine's answer rather than the library's: after a raise, Chromium focuses the dialog's
first focusable while **WebKit preserves the field**. The position is documented as a known limit, so
pinning `shadow-confirm` was pinning one engine's version of a limit. It asserts the dialog now, with
the split recorded, and the matrix's caret cell carries it.

### Docs — `yarn todo`, and the open question a `✓` was hiding

"Is there anything else to validate" had a real answer and no way to ask it: the matrix's worklist was
printed as a side effect of `docs:matrix`. It is **`yarn todo`** now — one command, generated from the
same data the document is. **A `TODO.md` was considered and rejected**: it would be a second answer to a
question that already has one, and this week was spent removing exactly that.

**Auditing it found a hole in the mechanism itself.** A `✓` cell can be true and still carry an open
question — a claim proven on one binding and not the others, a discrimination that does not reproduce.
Written into the cell's note, as the `reconcileOpen` one was, it reaches a reader of the table and
**not** the backlog, because the enumeration reads the _state_ and the state says done. So it was a
to-do nothing listed. Cells and platform rows take a `caveat` now: rendered into `API.md` as **Still
open**, and printed by `yarn todo` under a `?` prefix with the cell's state in brackets. Seen to work by
putting a caveat on a passing cell — the count went from 8 to 9 and the entry appeared.

That is the whole answer to the discoverability question: **one command, and a `✓` can no longer bury a
caveat.**

### Tests — the worklist worked through, a real Solid defect, and the compiler finally asserted

**Twenty open cells down to seven.** What the pass closed, and what it turned up.

`containFocus`, `dismissOnClickOutside` and a custom `dismissKey` now run through **`umbra/vanilla`**
as well as Solid — each proved to discriminate by removing the option under test. `reconcileOpen`, which
had a unit test over its decision table and **no binding exercising it at all**, is driven through the
controlled-panel pattern its own documentation shows, on all three.

**The `reconcileOpen` tests took two corrections worth recording.** The first version used a modal
dialog, so the buttons driving the prop sat behind the top layer and could not be clicked. The second
passed while deciding on `isVisible` instead of `phase` — the exact mistake the helper's doc warns
about — because `onClose` runs when the exit _finishes_, so a call site that only lowers the prop there
never lands inside the window where the two disagree. A third scenario closes and lowers in one
handler, which does land there, and it fails when the decision is moved to `isVisible`. On the
controller that last discrimination does **not** reproduce and why is unexplained; the cell says so
rather than implying the claim is covered everywhere.

**And the volet found a real defect rather than a missing test.** On Solid, focus after a failed action
lands on the `<dialog>` instead of on the button that ran it — measured, not inferred. It is the race
`attach-focus.ts` documents for `umbra/vanilla` reaching a second binding: Solid writes the action
props' `disabled` getter synchronously when the engine reports running, so the button is blurred before
`captureActionRunner` reads `activeElement`, and the `lastFocusInside` floor that catches this for the
controller does not catch it here. **No test asserts the current behaviour**, because that would
enshrine the defect. The cell is `~` with the diagnosis, and the harness stays because a fix needs it.

**The React Compiler is finally asserted.** `verify:package` checks both halves of the one grep the
docs point at — the built `react/use-modal.js` imports React's `compiler-runtime` _and_ opens with a
`c(n)` memo-cache allocation, since the import alone would survive a build that compiled one trivial
function and bailed on the hook — plus the complement, that the Solid binding contains no
`compiler-runtime`. Seen to fail by restoring the pre-rolldown `react({ babel: … })` wiring, which is
accepted and transforms nothing. That was the gap the repo had already been burned by twice.

Still open from the test half: **a dialog inside a shadow root under React and Solid.** Only the
controller covers it, and a React or Solid root inside a shadow root is a harness of its own rather
than an option to pass — left named instead of rushed.

### Tests — the dismiss key nobody answers was not a bug, and five options Solid had never exercised

**Two items off the worklist, and the first one was mis-named by me.** "Escape can be answered by
nobody" was on the list as a latent bug: put a modal with `dismissKey: false` in front of a non-modal
panel and nothing closes. It is not a bug. The modal was told not to listen and the panel is no longer
the foreground; falling through to the panel would close the one thing the user cannot see. The
composition of two deliberate decisions is the right answer, and the cell moves from `✓ untested` —
where it read as a hazard — to `✗ by design` with the reasoning.

What makes it acceptable rather than a dead keyboard is a **different** question, and that is what the
test measures: the press is not swallowed, so the application can still handle it, while a press the
panel _does_ claim is stopped at the capture phase and never reaches the page. The counter asserts both
directions, because one that only went up would be consistent with a library that swallows nothing and
with one that swallows everything. Checked to discriminate first: with the front modal listening again,
Escape closes it.

**Then the five options only React's suite had exercised**, now run through `umbra/solid`:
`containFocus`, `dismissOnClickOutside`, a custom `dismissKey`, `prepare` aborted by its own close, and
`onOpenRequest` refusing with a reason. None is new behaviour — every one is a shared `attach*`
function — which is exactly why the absence mattered: the claim this binding makes is that it reaches
the same code from its own effects, and until something pressed the keys that claim rested on reading
the source.

**And one of those tests was silently vacuous when written, which is the finding worth keeping.** With
the default 200 ms exit animation a panel that _is_ closing still reports `isVisible` for that window,
so "still open just after the press" matched during a close — the test passed, and so did its exact
opposite when tried. The harness animates instantly now and the assertion reads the close _reason_,
which cannot hold for a panel that closed. Each of the five was then proved to discriminate: three by
removing the option under test, and the `prepare` one by suppressing the library's own
`prepareController.abort()` — the only mutation that could distinguish "the signal is aborted" from "the
callback happened to notice", since `signal.aborted` stays true either way.

### Fix — `docs:matrix` renders through prettier, so a no-op run is a no-op

The script wrote raw markdown while prettier owns the layout of this repository's markdown, so **every
run left `API.md` dirty** and `yarn format` had to follow it. That is not a tidiness point: reaching
for the script to merely _print the worklist_ rewrote the document as a side effect, and the commit
that followed had to be caught by a hook. It formats through prettier before comparing now, so the
first run reports "up to date", and there is a `--list` mode that reads and writes nothing.

**The gate got stricter as a result.** Its comparison was a whitespace normaliser — a workaround for
the unformatted output, and one that would have passed a table whose columns had been re-padded by
hand. It is a byte comparison against what the script produces now, so a passing test means running
`docs:matrix` changes nothing. Seen to fail on a padding-only hand edit, which the normaliser would
have let through.

### Tooling — typedoc's rendering half deleted, and the TS 7 replacement scouted rather than shipped

**`yarn docs:api` is gone, and so is typedoc's whole HTML output.** It wrote `docs/api`, which is
referenced by nothing in the repository, runs in no CI job, and is published nowhere — a script nobody
ran producing an artifact nobody read. `typedoc.json` is now a validation-and-model config, and says so.

That leaves typedoc two jobs, which are the only reason `typescript@6.0.3` still exists: `docs:check`'s
two validations, and the JSON model behind the playground's `/api` page. **The attempt to replace them
on TS 7's own API is recorded here because it half-worked, and knowing which half saves the next
attempt.**

What works, measured against this library's real surface: `typescript/unstable/sync` opens the project,
`getExportsOfModule` returns all 92 exports across the four entry points, aliases resolve through
`getAliasedSymbol` so a re-export carries the doc a reader sees (54 of 55 root exports documented, which
matches the claim that only `Key`'s constants are not), `getJsDocTagsOfSymbol` returns the `@example`
blocks intact, `typeToString` renders signatures, and `emitter.printNode` prints a declaration
verbatim. A declaration handed back by the checker is a **lazy node** over a byte buffer with nothing on
it but `resolve()`, which inflates it — that one call unlocks ranges and printing.

**Three blockers remain, and the middle one is the surprise.**

- **The resolved node exposes no child traversal.** `children` is `undefined` and no `forEachChild` is
  exported, so a syntax-level check — which is what `notExported` is — cannot be written.
- **Walking the resolved type graph instead answers the wrong question.** It reports **0** findings
  against typedoc's 10 allowances, because an alias resolves away: `BaseRenderContext` simply becomes
  `ModalRenderArgs`. A `notExported` built that way is a no-op that reads as a clean codebase.
- **The server panics rather than throwing.** `getTypeArguments` on a non-reference type takes the
  process down with a Go stack trace, so preconditions must be guarded — a `try/catch` cannot save a
  session whose server is already gone.

A validator was written and **not shipped**, because its `notExported` half was seen not to fire:
removing each of the eleven known allowances in turn produced no finding, eleven times. A gate that
cannot be seen to fail keeps nothing, and this repo has spent the week finding out what that costs.

So the useful correction to the earlier plan is that **the `/api` model is the nearer half of this, not
the validator** — the printing and extraction it needs are the parts that work. The compatibility
matrix's `~ nothing in the repo still needs TypeScript 6` cell carries all of it.

### Docs — the agent files put on a budget, and the routing rule that makes it payable

The four `CLAUDE.md` files had reached **15 328 words**, by growing a little at a time with each
addition obviously worth it on its own. They load in full into every session, so that cost is paid on
every task and is invisible at the moment of writing — the shape of failure a gate is for. They are
**12 198 words** now, and `src/CLAUDE.md` alone went from 8 604 to 5 732.

**Almost nothing was deleted.** The rule that made the pass mechanical rather than a matter of taste is
that a fact belongs where it can be checked, in this order: a **test or gate** (it cannot drift), the
**JSDoc of the thing it constrains** (the "why" travels with the code and appears in an editor when it
is needed), and only then `CLAUDE.md` — for what is attached to no single file: the folder rule, the
vocabulary, the commands, and pointers to the first two.

Every passage cut was verified to exist at its owner first. The long narratives about
`scrollbar-gutter`, `adoptedStyleSheets` per root, the UA's `max-width` on `dialog:modal`, the
fractional-pixel hairline and space-delimited IDREFS were each already written on the code that
implements them. The React Compiler section was a **third** copy — the same reasoning is in
`vite.config.esm.ts` and `scripts/vite-plugin-react-compiler.mjs`, where it is configured — so it
collapsed to the four rules an agent writes by, plus the one grep that says which state you are in. And
the historical narration went to the CHANGELOG, which owned it already: the repo's own convention is
that comments never narrate the past, and these files had been exempting themselves from it.

**The budget is a test** ([src/\_\_tests\_\_/doc-budget.test.ts](src/__tests__/doc-budget.test.ts)) —
per-file word limits and a total, with the routing rule in its doc comment so the failure message has
somewhere to point. Raising a limit is a decision to state in the commit that raises it, not a way to
make a failing test pass. Seen to fail on a paragraph over budget and on a **new** `CLAUDE.md` smuggled
in without one, which is why the file list is discovered by walking the repo rather than declared.

**And replacing prose with a pointer trades one failure mode for another**, so the same test checks that
every path these files name exists. It found three broken on the first run —
`react/use-message-modal.tsx` and two siblings, stale since the template hooks moved into
`templates/`. Also seen to fail, on a pointer bent by hand.

### Docs — a compatibility matrix, and the twenty open cells it publishes

**What works with what now has one home**, as data:
[src/\_\_tests\_\_/compatibility-matrix.ts](src/__tests__/compatibility-matrix.ts), rendered into
`API.md`'s new _Compatibility_ chapter by `yarn docs:matrix`. Three axes — every option against every
other, every capability against the three bindings, and the platform facts — with six states rather
than two, because **`✗ platform` and `✗ by design` are not the same fact**: one is a browser law no
implementation would change, the other is a refusal that owes a reason, and neither is a to-do. Without
that split a list of everything that does not work fills up with items nobody can act on.

The gate does three things and says which one it cannot do. It fails when an option in
`UseModalBaseOptions` or `ModalVariant` has no row, when a row names an option that no longer exists,
when a test a cell cites does not resolve to a real file and a real title, and when `API.md` and the
table disagree. It **cannot** check that the cited test proves the cell — that stays human, and the
JSDoc says so rather than letting the green tick imply more than it earns.

**Seen to fail three ways before being trusted**, which is this week's rule: a row deleted from the
table (`Add a row … for: containFocus`), a cited test renamed (`has no test titled …`), and `API.md`
edited by hand (`diverged — run yarn docs:matrix`). It earned its keep during construction too:
**eleven of the test titles written into the first draft did not exist**, and the reference check named
every one.

**And the open cells are the point, so here they are.** `✓ untested` and `~` are declared states
precisely so they enumerate; `yarn docs:matrix` prints the list, and it is the backlog:

- **`~` `portal: true` in `umbra/vanilla`** — places without relocating; the caller owns whether
  `fixed` reaches the viewport.
- **`~` a raise keeps the caret** — restored only for the dialog that held the keyboard. Needs a window
  `raiseDialog` can publish and the focus coordinator can read.
- **`~` installing a policy over dialogs already open re-shows all of them** — seeding the top-layer
  tracking at install time fixes it, and makes the focus restore above dead. A decision, not a tidy-up.
- **`~` one TypeScript** — typedoc is the last thing needing the 6.x compiler API.
- **`✓ untested` on `umbra/solid`**: the focus restore after a failed action, `onOpenRequest`,
  `containFocus`, `dismissOnClickOutside`, a custom `dismissKey`, `prepare` aborted by a close. Fifteen
  capabilities are proven on React and on nothing else.
- **`✓ untested` on `umbra/vanilla`**: `containFocus`, `dismissOnClickOutside`, a custom `dismissKey`.
- **`✓ untested` `reconcileOpen`, on every binding** — exported from the root with a unit test over the
  decision and exercised by no binding at all.
- **`✓ untested` a dialog in a shadow root under React and Solid** — only the controller covers it.
- **`✓ untested` Escape is always answered by someone** — each half is tested; the intersection (a
  non-modal panel standing down while the modal in front has `dismissKey: false`) is not, and in it
  nobody answers.
- **`✓ untested` the React Compiler is verified to have run** — `verify:package` catches only the leak
  into the Solid binding, and the repo already records both the bundle and the component suite being
  uncompiled while the source was documented as if they were not.

### Tooling — one linter, on the same compiler as `tsc`, and three rules that were never running

**ESLint and typescript-eslint are gone.** `yarn lint` is `oxlint --type-aware`, whose type-aware half
runs through **tsgolint** — built on the TypeScript 7 compiler, so the linter and `tsc` are the same
compiler generation for the first time. `eslint.config.js` is deleted; `@eslint/js`, `eslint`,
`eslint-config-prettier`, `eslint-plugin-oxlint`, `eslint-plugin-react-hooks`,
`eslint-plugin-react-refresh`, `globals` and `typescript-eslint` are out of the manifest.

The side-by-side note this file inherited said typescript-eslint was the _binding_ constraint, and it
was: as of today 8.67.0 still peers `typescript-estree` at `>=4.8.4 <6.1.0`. So the way out was not to
wait for it. **`typescript@6.0.3` now exists for typedoc alone** — and TS 7 does ship a JS API
(`typescript/unstable/sync`, `/async`, `/ast`: a client over the Go binary with `getExportsOfModule`,
`getSymbolAtLocation`, `JSDocTagInfo`), so what blocks typedoc is that it uses the _previous_ shape of
that API, not the absence of one. Replacing it is what collapses the pair to one TypeScript.

**Coverage was measured, not assumed.** All **72** rules of typescript-eslint's `strictTypeChecked` set
exist in oxlint's catalogue, and they are **enumerated** in `.oxlintrc.json` rather than inherited from
a preset — a rule that silently stops existing then shows up in a diff. Categories were tried and
rejected: `-D suspicious` alone reports 2 725 findings from rules nobody chose. Two rules are not
carried over, both deliberately: `no-restricted-syntax` (its one use was a glob whose own comment says
it never matched) and `arrow-parens` (prettier's job). Each surviving gate was then **proved to fire**
against planted violations — `no-floating-promises`, `no-misused-promises` in argument position,
`await-thenable`, `no-unnecessary-condition`, `switch-exhaustiveness-check`, `consistent-type-imports`,
`no-explicit-any`, `arrow-body-style`, `react-hooks/rules-of-hooks` — because a linter that reports
nothing looks exactly like a codebase that is clean.

**Which is how three rules were found to have been doing nothing.**

- **`curly` was dead everywhere.** `eslint-config-prettier` sets it to `0`, and it sits last in the
  flat config, so a rule the repo declared as `['error', 'all']` was switched off in every scope. It is
  live now, and the four sites it had been ignoring in `src/` are fixed.
- **The `@example` lint pass linted zero files.** oxlint honours `.gitignore` **unconditionally** —
  `--no-ignore` does not reach it, nor an `ignorePatterns` negation, nor running from inside the
  directory — and `scripts/examples/generated/` was gitignored. The pass ran, reported nothing and
  printed "lint: clean", which is indistinguishable from a clean lint. The directory is no longer
  ignored (`check-examples.mjs` removes it unless you pass `--keep`, and `--fix` no longer implies
  keeping it), and the script now **fails if the pass ever sees zero files again** — seen to fail, with
  the ignore rule put back.
- **`no-restricted-syntax`'s only selector** was already known to match nothing; it is not replaced.

Two real defects the new linter caught that the old one could not:

- **`vite.config.esm.ts` was passing `rollupOptions`**, deprecated under Vite 8 on rolldown, now
  `rolldownOptions` — found by `no-deprecated`, which is in `strictTypeChecked` but not in the
  `recommendedTypeChecked` that config's scope used.
- **`playwright/index.tsx` was in no ESLint scope at all** and had an `async` `beforeMount` with
  nothing to await.

**The untyped-JavaScript scopes keep the syntax rules and drop the type-aware ones, and that is a
statement about honesty rather than noise.** `.claude/**`, `scripts/**/*.mjs` and the microfrontend
demo carry no annotations and are in no tsconfig, so tsgolint infers nothing: it types their values as
the `error` type and then judges them, producing 1 528 `no-unsafe-*` findings that say "this file is
untyped" — plus a handful of confident claims ("value is always nullish") drawn from the same absence.
A finding built on a failed inference reads exactly like a real one, which makes it worse than none.

Unchanged and verified after the swap: the React Compiler still runs (`use-modal.js` opens with `c(78)`
and imports `react/compiler-runtime`), the Solid binding still imports no React, `verify:all` reports
`PACKAGE OK`, and 745 tests pass.

### Tooling — the editor was still wired to the linter that was removed

The swap above changed the gates and left the editor behind: `.vscode/` was not in that commit. So the
workspace still asked for `dbaeumer.vscode-eslint`, still declared `eslint.validate` and
`eslint.useFlatConfig`, and still ran `source.fixAll.eslint` on every save — a code action contributed
by an extension with nothing left to lint, which is a save-fix that silently does nothing rather than
one that fails. Those are now `oxc.oxc-vscode` and `source.fixAll.oxc`, and the two `eslint.*` keys
are gone.

**And the editor was running half the rules.** `--type-aware` was passed by every CLI invocation and by
nothing else; the language server defaults to the syntax half, so the 72 enumerated `strictTypeChecked`
rules — the entire reason the config is 285 lines — reported nothing in the IDE. A file with
`n == 1` and an unawaited promise showed one error where the CLI showed three. `options.typeAware` is
set in `.oxlintrc.json` now, which oxlint's own schema calls the equivalent of the flag and the oxc
extension names as the preferred route over its own `oxc.typeAware` setting — and the config reaches
CI and any other editor, which a VS Code setting does not. Bare `oxlint` on that same file now reports
the promise, in `src/` **and** in `playground/`, where tsgolint resolves the nested tsconfig; the
server and the terminal are finally looking at one rule set. No CLI behaviour changes — every call
already passed the flag — and `yarn lint` and `check-examples.mjs` (45 examples from 27 files) stay
clean.

**oxc's formatter is declined, explicitly.** The extension enables oxfmt by default, and prettier is
this repo's formatter with `yarn format:check` as the gate — so a second formatter in the editor could
only disagree with the gate, over the JS/TS half of what prettier already does for md, json, yaml and
css. `oxc.enable.oxfmt: false` states in the workspace what `.oxlintrc.json` states in prose.

The diagnosis was not the obvious one. "No red in the editor" reads as a dead language server, and it
was not dead: `oxlint --lsp` was running against this workspace the whole time. Checking for the
process before rewriting configuration is what separated "the half that was missing" from "the thing
that never started".

**`typescript@6.0.3` is not quite typedoc's alone**, which the section above claimed. `typescript-7/lib`
ships `tsc.js` and no `tsserver.js`, so `js/ts.tsdk.path` has nowhere else to point and IntelliSense
runs a compiler generation behind the gates that judge the same file. That is the remaining gap, and
type-aware oxlint in the editor is what covers most of what it costs. `typescript.tsdk` and
`typescript.enablePromptUseWorkspaceTsdk` are deprecated as of VS Code 1.133 in favour of
`js/ts.tsdk.path` and `js/ts.tsdk.promptToUseWorkspaceVersion`; the workspace uses the new names.

### Docs — seven defects an inventory found before it wrote a single row

The intent was a compatibility matrix: one place where "X with Y" has one answer, because the facts
are currently spread across `API.md`, two `CLAUDE.md` files, this changelog and a hundred JSDoc
blocks. **Listing the rows found seven defects before any row was written**, which is the argument for
the matrix better than the matrix will make it. Five were documentation contradicting the code; two
were gates that could not have caught them.

- **`API.md` promised the opposite of a limit written the same week** — "the dialog in front takes
  the focus back to the exact element that had it". A raise restores the exact element only for the
  dialog that _held_ the keyboard; one that did not is re-shown by `showModal()`, which focuses its
  own first focusable. The other docs were corrected when the limit was found; the reference one was
  not, so it was left promising an accessibility behaviour the suite already refuted.
- **`portal: true` means less in `umbra/vanilla` than the type suggests.** It selects the placement
  (`fixed` rather than contained) and does **not** move the element — a controller was handed markup
  the caller wrote, and relocating that would take its ids, its stylesheet scope and its listeners
  with it. So `fixed` reaches the viewport only if the caller placed the `<dialog>` outside any
  transformed ancestor. Now documented on the option and pinned by a test that measures the panel
  landing centred in a `translateZ(0)` ancestor rather than in the viewport.
- **Three docs described an implementation the code refused**: the contained wrapper called
  `position: relative` when `CONTAINED_HOST` is `absolute` — and `placement.ts` explains why absolute
  is mandatory rather than incidental (an in-flow `height: 100%` block is laid out _after_ the content
  it should cover and pushes it out of a clipped region).
- **`bindAction` was documented as an export of `./vanilla`** in `CLAUDE.md`; it is a member of the
  returned controller. `API.md` had it right.
- **`template` was documented "carried and never read"**, false since `prioritize` — a policy reads it,
  which is the point: "every drawer under every alert" is a rule about kinds of dialog, and `template`
  is the only thing that names a kind.
- **The count of Solid's differences disagreed with itself** across three files — two subsets of
  {getters, the `useLookup` accessor, `portal` leaving `Modal` null}. It is three.
- **A test title said the opposite of its assertion** (a caller's style "loses to" the placement; the
  assertion is that it wins, which is what the option promises).

The gate that should have caught `bindAction` matched `'umbra'` and `'umbra/react'` only, so every
`umbra/solid` and `umbra/vanilla` snippet in the docs was checked by nothing — and the promise that
each binding re-exports the root wholesale was asserted for React alone. Both widened to all four
specifiers, and an unknown specifier is a failure rather than a skip, so a fifth binding cannot arrive
with its snippets unguarded. Seen to fail on both shapes before being trusted: a typo'd
`umbra/solid` import, and the original `bindAction` defect re-introduced.

### Tests — the four gaps that were named rather than closed, and a prediction that was wrong again

The previous entry left four things stated instead of tested. Instrumenting them was supposed to
delete two of them as dead code. **The measurement said otherwise, and it is worth recording how.**

`raiseDialog` is internal and has one caller, and that caller both filters on `element.open` and
ignores the return value — so the reasoning concluded that its `!dialog.open` guard _and_ its focus
restore were unreachable, and that the two shadow-walking helpers they use could go with them. The
guard's half of that is right: `0 / 16` across the whole suite. The focus restore's half is **wrong**:
`1 / 15`, taken once.

The path the argument missed is a policy installed **late**. Until `prioritize` is called the top
layer is not tracked at all, so the first plan compares the desired order against _nothing_ and lifts
every open modal dialog, bottom-first — and the bottom one is the one that has been up longest, which
is frequently the one being typed in. So a raise really does happen to the dialog holding the
keyboard, and the restore is what makes a caret survive it. Removing it puts focus on the dialog's
first focusable instead; that is now a test, and it fails without the restore.

This is the second time a reachability argument about this file has been wrong. The lesson is in the
JSDoc now, next to the branch.

That same path is the one case where a reorder is **not** minimal, which `API.md` was promising
unconditionally: installing a policy over dialogs that are already open re-shows all of them, each a
native `close` event and a re-run of any CSS keyed on `[open]`. Installing at start-up costs nothing.
Seeding the tracking from the snapshot at install time would make it minimal too and is named as the
follow-up rather than done here — it would also make the restore above dead, which is a decision, not
a tidy-up.

**What the four gaps became.** Two of them close in one vanilla harness — a modal `<dialog>` in a
shadow root and a light-DOM one on a shared manager, which is the composition of two harnesses that
already existed. It asserts the policy is inherited by a binding that is not React, and that a raise
fires the element's native `close` with `dialog.open` already back to `true`: the only way a listener
the caller wrote can tell a raise from a real close, and until now the contract was documented and
unverified. The shadow root also drives `deepActiveElement`'s walk, which was at zero.

`prioritize` through Solid is the third, in the three-file pattern that folder already uses, with the
`false` baseline as a second exported app since `SolidRoot` takes a component rather than props. The
two page probes both suites needed are extracted to `src/__tests__/stack-probe.ts` rather than copied
a third time.

**One known limit is now pinned as one** rather than left to be rediscovered. When a dialog opens over
the front one, the front one takes the focus back — but not to the exact element, because the
newcomer's `showModal()` takes focus first, so the raise cannot see where it was, and the raise's own
`showModal()` fires a `focusin` that overwrites the coordinator's memory before the reclaim runs. The
late-install case does preserve the position, since nothing steals focus there. Fixing the first case
means ignoring focus the library itself moves during a raise; the guard that would need it says so.

Still not covered, and stated rather than implied: `containsAcrossRoots`'s host hop, which needs a
shadow root nested _inside_ a dialog rather than a dialog inside one.

### Fixed — `/api` answered 500, and every gate was green

`isOwnEventTarget` was exported from the root and never added to `CATEGORIES`, so `buildModel` threw
on an uncategorised export exactly as designed — and nothing ran it. `type-check`, `lint`,
`docs:check`, `verify:package` and the whole test suite passed while the reference route was dead and
`yarn playground:build` failed outright, because the model is generated at serve time and at build
time and nowhere else.

The note added two commits earlier telling the next author to remember this step is evidence that the
note is not the fix: the very next commit forgot. `api-categories.test.ts` compares the names parsed
out of `src/index.ts` against the table, three ways — nothing uncategorised, nothing listed twice,
nothing listed that is no longer exported — and needs neither typedoc nor a browser to do it.

### Fixed — five component tests contributed nothing to the coverage report

`ct-coverage.ts` is the fixture that reads `window.__coverage__` off the page before it closes; its
own doc says the price is that every CT file has to import `test` from there. Five of sixteen did
not, so they ran, passed, and were invisible — and they were the wrong five. `raiseDialog`,
`stampZIndex`, `reclaimFocus` and the whole opening-focus decision sit on `.c8rc.json`'s exclude list
too, which means the component report was their only possible measurement and it never saw them. The
number that came out was not low, it was wrong, and it read as "untested" for code that was and
"covered" for code that was not.

`ct-coverage-wiring.test.ts` walks `src/**/*.ct.tsx` and fails on any file importing `test` from the
runner. It asserts a floor on the count too, because a glob that stopped matching would leave the
check passing over nothing — the same failure shape it exists to prevent.

Running it afterwards is what turned four of the gaps below from arguments into measurements: with
the fixture wired, `raiseDialog`'s focus-restore branch reports `0/3`, the two shadow-root hops
report `0`, and `reclaimFocus` landed on the bare `<dialog>` four times out of four.

### Changed — the dialog that needs the focus is the one that asks for it

The reclaim added yesterday worked from the wrong side. A dialog opening _underneath_ another reached
across, asked the manager who was in front, found that dialog **with a
`document.querySelector('dialog[data-modal-id=…]')`**, and settled the focus onto it. Three things
were wrong with that, and they are one root cause — a dialog answering for a dialog it does not own:

- **The lookup is the one this library documents as broken.** `ModalOpenEventDetail.element` exists
  precisely because that query finds nothing when the dialog lives in a shadow root, and this library
  supports one; it can also resolve another manager's dialog of the same id, and two managers on a
  page is a supported arrangement. The contrast was three lines away: `activeWithin`, in the same
  subsystem, was written because `document.activeElement` is the wrong question inside a shadow root.
- **It re-honoured `focusOnOpen` instead of where focus was.** The dialog in front had focus
  _somewhere_ — a caret in a field, the button just pressed — and handing it back to the primary
  button is a second theft dressed as a repair. Measured, and the old test could not see it: it
  asserted "focus is inside the interruption", which was true of the bare `<dialog>` element too.
- **It only ran on an opening**, so every other way the stack moves had nobody in it.

Each dialog now watches the manager and takes the focus back itself when it is in front and has none.
It has its own element, its own memory of where focus was (`lastFocusInside`, which was already
there), and it hears every way the stack can move rather than the one another dialog noticed. The
snapshot changes on dialog transitions and nothing else, which is what makes it safe to act on: a
user clicking the page behind a panel never reaches it.

**Modal dialogs only**, and that is a rule rather than a shortcut. A non-modal dialog does not own the
page's focus and never did — the page under it is live — and it does not need to: its dismiss key
comes from `attachWindowDismissKey`, which answers wherever focus is. A modal dialog has no such
listener, so for that one focus _is_ the keyboard.

**One prediction this replaces was wrong, and it is worth recording as wrong.** The reasoning said a
dialog left behind by a close would never be given focus, since it declined its opening focus and
nothing offered again. The tests written for it passed against the old code. What the reading missed
is that a raise re-records the platform's previously-focused element: `raiseDialog` re-shows the front
dialog while the newcomer holds focus, so that dialog's native close hands the keyboard back into the
one behind it. The tests stay as characterisation — nothing asserted it, and the chain is three
indirections long — but they are not regression tests, and they say so.

### Fixed — the playground smoke test could pass over nothing

Routes are discovered from the running app's sidebar, and the query ran before React had committed
it: `networkidle` is not hydration, and a cold dev server is still regenerating the API model for the
better part of ten seconds. The route loop then walked an empty list and every assertion inside it
passed vacuously — including the one that reports a route answering 500. Measured on this very run:
green against a playground whose `/api` was broken. It waits for the sidebar now, and the existing
"discovered N routes" assertion is the second half of the guard.

### Docs — the modality rule is enforced, and the prose still said it could not be

Separating the two families said in its own commit message that it "turns the rule `prioritize`
documents into one it enforces". It updated the `CHANGELOG` and the two type-level docs, and nothing
else — so `API.md` kept a section titled **"The one thing it cannot do"** describing the thing the
library now does, kept telling authors to order the families themselves, and kept an explicit
"behaves exactly as before" promise that the same commit contradicted in bold. `stack-order.ts`
disagreed with itself eight lines apart; `dialog-manager.ts` said "without a policy the open order
_is_ the stack order" four lines under the paragraph that had just been corrected.

Every present-tense statement of the old rule is now the new one, in `API.md`, both `CLAUDE.md`
files, and the JSDoc on `DialogManagerSnapshot`, `getForeground`, `getOpen`, `isForeground`,
`getZIndex`, `computeSnapshot` and `orderStack`. The `CHANGELOG`'s own older entries are left alone,
for the reason at the top of this file.

Two consequences of that rule were documented nowhere and now are, because neither is a policy
anybody asked for: a non-modal panel stands down from the dismiss key even when the modal in front has
`dismissKey: false`, so Escape can be answered by nobody; and with no policy installed nothing
re-stamps `z-index`, so `data-modal-z` and a dialog's index in `openDialogs` can disagree numerically
after a close. Also corrected: a z-index row in `API.md` crediting `openedAt` for a sort it has never
performed, three copies of "only the topmost non-modal responds" where the code asks for the global
foreground, and a showcase comment calling a modal panel non-modal.

## 2026-08-12

### Fixed — a dialog opening underneath another does not take its focus

Opening a dialog runs the platform's focusing steps, and until now the coordinator settled the
opening focus whatever else was on screen. So a side panel arriving under an interruption pulled
the keyboard off it — reported from an application: a connection error in the top layer, focused on
its cancel button, losing focus the instant a route settled a panel behind it.

The consequence is worse than a misplaced ring. A dialog with no focus inside it hears nothing: its
own keydown listener only sees presses raised within it, so its dismiss key goes dead and the next
Escape is claimed by whatever else is listening — in that report, the panel underneath, which
navigated away.

The opening focus now asks the manager whether this dialog is the foreground, and declines when it
is not. Declining is not enough on its own, because the theft has already happened by the time any
of this code runs — so the focus is handed back to the dialog that _is_ in front, by `reclaimFocus`.
Unconditional rather than guarded on "did we take it": taking it is what opening a dialog does, and
re-reading `activeElement` to confirm would reintroduce the subscriber-order bet the coordinator
already documents.

**`reclaimFocus` is not `settleOpeningFocus`, and the difference is the whole fix.** Settling only
_acts_ on a dialog that claimed `focusOnOpen` and merely reads otherwise, which is right for an
opening — the platform has already put focus somewhere sensible — and useless here, where focus has
been pulled away: on a dialog with no claim it returns nothing and leaves the keyboard on `<body>`.
Reclaiming prefers the claim and falls back to the dialog itself, which is enough for its own
keydown listener to hear a press. Measured in the application before and after, on the reported
sequence: `focus: BODY` with two Escapes doing nothing, against the interruption holding focus, the
first Escape closing it alone, and the second closing the panel underneath.

Nothing changes for a dialog opening with nothing in front of it, which is every ordinary open.

### Fixed — the stack order puts every non-modal dialog under every modal one

`foreground` is not a preference, it is a claim about what is on screen — and between a modal
dialog and a non-modal one the platform has already settled it. Top-layer elements paint above
ordinary ones and no `z-index` reaches between them. The order was sorting by open sequence alone,
so a panel opened half a second after an interruption was reported as the foreground while the
interruption was plainly painted in front of it.

That is not an opinion the library is entitled to hold. It is a false statement, and it had a
visible consequence: `isForeground` decides who answers the dismiss key, so Escape went to the
panel underneath while the user was looking at the dialog above it. Measured in a real
application — a side panel and a connection error raised over it, both known to the same manager,
`foreground` naming the panel.

The two families are now separated before the policy is consulted, which changes `prioritize` from
advising a rule to enforcing one. Its doc already told authors to order modal dialogs against each
other and non-modal ones against each other; a policy that ignored that could ask for a lift across
the boundary that the top layer refuses to perform, and `planRaises` would plan it. Now a large
number on a panel ranks it against the other panels and moves it no nearer the user.

**This changes the default order**, without a policy installed, for anyone with both families open
at once — and only in the case where the previous answer contradicted the screen.

### Added — `dialogManager.prioritize`, because "last one wins" is a race

A dialog's place in the stack is the order its `showModal()` landed in. In an app assembled from
independent features nobody schedules that order: a consent notice raised when a fetch settles, a
slide-over opened by a deep link, a session warning on a timer. Lose the race and the notice is
_behind_ a panel — under its backdrop, inert, dimmed — while the user carries on with exactly the
thing the app was trying to interrupt. Nothing threw. The wrong dialog is in front.

The honest reading of that is not "the app should coordinate its dialogs". Most do not, and the
features that would have to agree are the ones that deliberately know nothing about each other.
So the ordering becomes a policy: one function, installed once, from a dialog to a number, higher
meaning nearer the user, ties keeping open order — so a policy only says where it disagrees.

```ts
dialogManager.prioritize((modal) => {
  return modal.id === 'session-expiring' ? 100 : 0;
});
```

It applies to what is already on screen, not only to the next open, and the whole manager moves
with it: `openDialogs`, `foreground`, `isForeground` and `getZIndex`. That second half is not a
courtesy — `isForeground` decides which dialog answers the dismiss key and which one owns a click
outside, so a version that moved only the paint order would put the visible dialog behind the one
that owns Escape.

**The mechanism is not a number, and that is the whole cost of the feature.** The platform paints
top-layer elements in the order they were added and `z-index` does not apply between them — measured
in Chromium, a dialog stamped `z-index: 9999` still paints under one shown after it. So the only way
to move a modal dialog is to `close()` and `showModal()` it again, and three things follow that no
implementation could avoid:

- **The element's native `close` event fires.** It is queued, so it arrives with `dialog.open`
  already back to `true` — which is the guard for a listener that has to tell a raise from a real
  close. The library's own reporting (`onClose`, `modal:close`, `subscribe`) is store-driven and is
  not involved. It matters most in `umbra/vanilla`, where the `<dialog>` and its listeners are the
  caller's.
- **CSS keyed on the element being shown re-runs** — `@starting-style`, a
  `dialog[open] { animation }`. The library's own entrance is driven by phase, not by `[open]`.
- **Focus has to be put back**, and only for the dialog that ends up in front: `showModal()` runs
  the focusing steps every time, and only the topmost modal dialog is not inert, so restoring focus
  into a dialog that just went under would leave the keyboard somewhere it cannot act.

Since every raise is a real round-trip, the plan is minimal rather than "re-show everything from the
bottom up". `planRaises` keeps the longest **prefix of the desired order that is a subsequence of
the current one** — not their common prefix, and the difference is one round-trip: turning `[a, b]`
into `[b, a]` lifts `a` and nothing else, because `b` is already the lowest and no amount of
re-showing could make it lower.

**Two limits, stated rather than worked around.** A modal dialog always paints above a non-modal one
whatever the policy says — that is the platform's rule about the top layer, and a library cannot
overrule it, so a policy orders modal dialogs against each other and non-modal ones (by `z-index`)
against each other. And it orders the dialogs of _one manager_: two copies of this library in one
page have two registries and two independent stacks, with the `modal:open` / `modal:close` document
events as the only channel between them. The case it does answer is the common one — one app, one
manager, features that never learned about each other.

**Opt-in, and inert until asked.** With no policy the open order _is_ the stack order, `orderStack`
falls through to the sort the manager has always done, and `syncStackOrder` returns on its first
line — so nothing about an app that never calls `prioritize` changes.

**The playground demonstrates the defect before the fix** — `/advanced`, under "Stacking, keyboard
and focus". The warning fires, a deep link raises a panel over it, and the switch is turned on
_while both are open_: the warning comes to the front and the panel stays exactly where it was. The
switch is repeated inside both dialogs, and that is the demonstration rather than a convenience —
a modal dialog swallows every click outside itself, so the only reachable control is one in the
dialog that happens to be in front, which is the whole complaint.

Adding it turned up a second thing worth recording: `/api` returned **500** until `StackPriority`
and `StackModal` were added to `CATEGORIES` in `vite-plugins/api-model.ts`. `buildModel` throws on
an export that belongs to no category, on purpose — an uncategorised one would be unreachable in the
reference — and `yarn check` cannot see it, because the route is generated at serve time.
`scripts/smoke-playground.mjs` is what caught it.

`syncStackOrder(shownId?)` is public for one reason: the manager observes _stores_, and a store
reaching `'opening'` is not a dialog that has been shown. Left to its own clock a reorder would land
a frame late — one painted frame with the wrong dialog in front. `syncOpenSequence` calls it in the
same task as the `showModal()` it follows, which is also what lets the manager know the real
top-layer order instead of guessing it: every show in this library goes through that one seam, so at
most one dialog can have entered between two calls.

### Added — `isOwnEventTarget` is public, beside `isKeyClaimedByPopup`

The rule a listener on a `<dialog>` has to apply before acting: a press raised inside a dialog
stacked above this one bubbles straight through it, and without the check the surface underneath
answers for the surface on top. The library's own keydown listeners have always asked it; it was
`@internal` because nothing outside them did.

Something outside them does now. A control placed inside a dialog by its caller — a button that
carries its own shortcut, say — has no listener of ours to inherit the rule from, and a second copy
of it is a second copy that drifts. That is the same argument `isKeyClaimedByPopup` was exported
under, and this is its sibling: one asks whether a key belongs to a popup that is already answering
it, the other whether it belongs to this dialog at all.

Nothing about the implementation changed. `queryOwn` stays internal — it is a query helper for the
library's own dispatch, not a rule a caller has to share.

### Fixed — `containFocus` answers the one Tab its markers cannot see

Reported from a real panel and reproduced: click the empty area under the last button, press Tab,
and the keyboard is in the page behind — while clicking any control inside first leaves the
containment working perfectly.

Clicking content that is not focusable focuses the nearest _click-focusable_ ancestor, and an open
`<dialog>` is one. That distinction is not the same as being focusable: the element takes no
`tabindex`, and `focus()` on it from script does nothing — measured against a bare `<dialog>`, which
refuses the call. So focus is legitimately on the dialog element itself, and no marker has been
visited.

What happens on the next Tab is where browsers part ways. The component suite's Chromium descends
into the dialog's subtree and reaches the start marker; the Chrome this was reported on skips the
subtree entirely and lands in the page. Instrumented there, the markers' `focus` listeners recorded
nothing at all — they were never given the chance to fire. Containment cannot rest on a step only
some browsers take.

So that single press is answered directly, by a `keydown` on the element that acts only when the
event's target _is_ the element — a nested dialog's press bubbles through with its own target and is
left alone. Focus is then sent inward the same way the markers send it, by asking each candidate
rather than computing which one.

The regression test asserts the destination exactly, not merely that focus stayed inside. Without
the fix this Chromium wraps to the last stop instead of the first, and a Shift+Tab leaves the panel
outright — a "did not leave" assertion would have passed in one of those two cases and guarded
nothing.

### Changed — `containFocus` is two focus markers now, not a computed boundary

The first implementation answered `Tab` on the dialog and compared the focused element against the
last of its tab stops. Twice today that list was corrected — first for `tabindex="-1"` buttons, then
for `visibility: hidden` wrappers — and twice the keyboard still walked out of a real dialog. The
approach was the defect, not its filters:

- **A selector cannot predict the tab order.** A _roving tabindex_ toolbar is made of buttons at
  `tabindex="-1"`; a date field puts `tabindex="0"` on a container the browser skips in favour of a
  span inside it. Counted in one dialog: twenty-one elements matched a careful selector where the
  browser stopped seven times. Each fix handled one component library's arrangement and the next
  one invented another.
- **A press inside an `<iframe>` is invisible.** A rich-text editor is a separate document, so no
  listener here ever hears the Tab that takes focus out of it. Measured: two presses of eight never
  reached the dialog at all.

Two zero-sized focusable markers need neither. The browser walks past the end of the content and
lands on one, which _is_ the boundary — nothing is predicted, and a frame at the end is no different
from a button. Where focus came from decides where it goes: `relatedTarget` inside the dialog means
the user tabbed off the end, so focus wraps to the far end; from outside it means they are coming
in, and it settles on the near one. Without that second half a modal dialog would open with its
last control focused.

Sending focus on is asked rather than computed too — each candidate is focused and checked, so a
guess that cannot hold focus costs a step instead of losing the keyboard.

Nothing is rendered. The markers carry no text, no role and no size, and go on teardown.

### Fixed — `containFocus` let the keyboard out of any dialog holding a toolbar

The wrap compares the focused element against the last of the dialog's tab stops, and the list it
compared against was not the browser's. The selector says `button:not([disabled])`, which matches a
button whose `tabindex` is `-1` — and a **roving tabindex** toolbar, the standard way to build a
toolbar, is made of exactly those: one stop for the whole group, every other button out of the tab
order and reached with the arrow keys.

A rich-text editor's toolbar alone contributes twenty of them, and they sit _after_ the dialog's
real last stop in document order. So "the last one" was an element the user can never be on, the
comparison never matched, the wrap never fired, and the keyboard walked out — while the containment
looked perfectly present in the source. Counted against a real dialog: twenty-one elements matched
the selector where the browser stopped seven times.

`tabIndex >= 0` is one missing half. The other is that bare `checkVisibility()` answers for
`display: none` and **not** for `visibility: hidden` — its options are not optional. Measured in the
same dialog: a hidden file-input wrapper carrying `tabindex="0"` sat last in document order and
passed the bare check, so even with the tabindex filter the comparison still pointed at an element
the browser skips. `visibilityProperty: true` is what makes the check mean what its name suggests;
`opacityProperty` stays off, since an element at `opacity: 0` is still focusable.

The regression test carries both shapes, because no harness made of ordinary buttons can show
either: every ordinary button is a stop, so the list and the tab order agree and the bug hides. Each
half was checked on its own against a broken implementation.

### Added — `isKeyClaimedByPopup`, the question the dismiss listeners ask, now askable

The rule landed earlier today inside the two dismiss listeners: before acting on a key, check
whether an open popup has already claimed it. A dialog is not the only thing that answers a key
over a page, though — a **controlled** surface, one where the key is a request to whoever owns its
`open` prop rather than a dismissal, binds its own listener and inherits none of ours. It needs the
same question answered, and a second copy of the rule is a second copy that drifts.

So the predicate is public: `isKeyClaimedByPopup(dialog, target)`, the same one the listeners call,
with the same two clauses and the same exclusion of the dialog itself.

### Added — `dialogPlacement` answers for the scrim a non-modal dialog draws itself

`show()` gets no `::backdrop`, so a non-modal dialog that wants to block what is behind it has to
put an element there — and the library, having an opinion about where the dialog goes, had none
about where that element goes. Every binding would derive the same pair, and the pair is not
obvious: a `fixed` scrim under an `absolute` dialog covers the viewport instead of the region, and
an `absolute` one under a `fixed` dialog scrolls away from what it is covering.

`DialogPlacement.backdrop` is the geometry — `fixed` beside a viewport-anchored dialog, `absolute`
inside the host of a contained one, `null` for a modal one whose backdrop the browser draws in the
top layer. Its colour reads the same `--dialog-backdrop` the native one does, so a theme moves both
and a non-modal panel is not a different shade from a modal dialog beside it.

Still nothing rendered: this is a table, like the rest of the module. The `z-index` is deliberately
absent — the stack position is `getZIndex(id)`'s answer and depends on how many dialogs are open,
which a static table cannot know — and so is anything about what a click on the scrim means.

### Added — `parseHotkey`, the way back into `HotkeyDef`

Three functions turned a `HotkeyDef` into text — a label, an `aria-keyshortcuts` value, a match
against an event — and nothing turned text back into one. That is fine while every shortcut is
written in the source, where the closed union makes `'Escpae'` a compile error. It stops being fine
the moment shortcuts arrive as **data**: a configuration file, a user preference, a value off the
wire, or another library whose own type is `string`. The only crossings were an unchecked cast —
throwing the union's guarantee away exactly where the input is least trustworthy — or a validator
written again at each call site.

Nothing is asserted: the key is _found_ in `Key`, so it carries that table's type out, and each
modifier arrangement is rebuilt from literal pieces. What cannot be built is refused. `HotkeyDef`
names fourteen shapes rather than every subset of the four modifiers, so `'Alt+Shift+Meta+a'`
parses as far as its parts and then returns `undefined` instead of inventing a type that does not
exist — and so do a repeated modifier, an unknown one, and a key that is not in the table.

### Added — `modal:open` carries the `<dialog>` element

The event announced that a dialog had opened and left finding it to the listener, whose only route
was `document.querySelector('dialog[data-modal-id="…"]')`. That works until the dialog lives in a
shadow root, which this library supports — and then it does not work and does not say so: the query
returns `null` and an integration that measures, observes or annotates the element quietly does
nothing.

`ModalOpenEventDetail.element` is the element, or `null` when the binding that registered the store
supplies no getter. It is on the open event only: by the close the element may already be leaving
the document, and the id is enough to match the pair.

The manager still holds no DOM reference of its own — `RegisterOptions.getDialog` is a getter it
calls once, as it dispatches, which keeps the registry a port rather than a second view of the
tree.

### Fixed — a dialog took the dismiss key from the popup the user was actually looking at

Open a combobox, a select or a date picker inside a dialog and press Escape: the list should
close. It did not — the dialog did, list still on screen, and whatever the user had typed went with
it. Enter had the same shape: it fired an action bound to it instead of taking the highlighted
option.

Both listeners were reaching the press before the control could. The window-level one a non-modal
dialog installs is in the **capture** phase, deliberately, so the key works wherever focus is — and
capture means running before every other handler in the page. The dialog-level one is the reason
the same thing happened to a control that keeps focus on itself, since its press bubbles straight
up to the dialog.

Neither now claims a press that something inside has already spoken for, read from two declarative
signals rather than guessed:

- `aria-expanded="true"` on the target or above it, which is how a combobox reports an open list
  while keeping focus.
- Focus inside an element carrying a popup role — `listbox`, `menu`, `tree`, `grid` or `dialog` —
  which is how a picker that portals its popup elsewhere and moves focus into it can be recognised
  at all. The dialog itself is excluded, and so is anything containing it, or every press inside
  would read as spoken for.

The second rule is a convention rather than a specification: the roles are standard, treating focus
inside one of them as a claim on the key is this library's reading. It errs toward leaving the key
alone, which is the safer direction — a dismissal that does not happen is one press away from
happening, and a dismissal that should not have happened has already taken the dialog down.

### Added — `reconcileOpen`, for wrapping this library in a component driven by an `open` prop

`useModal` is imperative and a great deal of component API is a boolean prop, so anyone building a
`<Panel open={…} />` over this library writes the same reconciliation. It is short, and it is wrong
in two ways that both ship as visible defects.

**Reconciled, not reacted to.** Comparing the prop against the dialog's real state on every pass is
what makes the prop authoritative: a dialog opened or closed from anywhere else — the manager, a
teardown and remount, a restored stack — gets put back, instead of sitting on screen where its call
site believes it is closed and cannot close it.

**It turns on `phase`, never on `isVisible`.** `isVisible` is `phase !== 'closed'` by design and
stays true through the exit — what a renderer wants, the opposite of what a driver wants. A dialog
dismissed by the user reports its close, the call site lowers the prop, and a reconciliation reading
`isVisible` then closes a dialog that was already leaving, part-way through its animation. It
presents as a panel that sometimes glides away and sometimes jumps, because a close driven by the
prop first never reaches the case.

Both rules now live in one exported function instead of in each caller's `useEffect`, with an
exhaustive table of its eight inputs as the test.

### Added — `containFocus`, the Tab wrap a non-modal dialog does not get from the browser

`showModal()` makes the rest of the document inert, so a modal dialog is contained for free.
`show()` does not, and the library said nothing about the difference: a non-modal dialog placed
the opening focus and restored it on close, then let a few tab presses walk the keyboard out into
whatever was behind. That is correct for a toast or a popover — which is why the option is off by
default — and plainly wrong for a panel that behaves like a modal in everything but its stacking.

**Why it answers Tab instead of trapping focus**, since both obvious implementations overreach and
the difference only shows in a page that mixes dialog kinds:

- **`inert` on everything else** takes a subtree out of the tab order _and_ out of hit testing. A
  dialog in the top layer escapes an inert ancestor; one rendered in place does not. So marking
  the page inert around a non-modal panel leaves every ordinary in-page dialog unanswerable by
  mouse as well as by keyboard — the blast radius is not the keyboard, it is the pointer.
- **A `focusin` enforcer** pulls focus back from anywhere, and fights any legitimate focus target
  outside the dialog for the same reason.

The listener sits on the dialog and fires only when focus is already inside it and already at one
of the two ends. A click into something outside is left alone, and a dialog opened over this one
keeps its own keyboard. The deliberate limit is the other side of that bargain: it cannot bring
focus back once it has left by some other route.

Two silent limits are worth knowing rather than discovering. The focusables are found with a
selector, so a control inside a shadow root or an `<iframe>` is not a stop; and visibility is
asked with `checkVisibility()` rather than the usual `offsetParent !== null`, because that idiom
reports `null` for anything `position: fixed` and would drop a pinned footer's buttons.

## 2026-08-11

### Fixed — the exit animation's safety timeout was racing the animation it protects

`runDialogExit` armed its fallback timer at `exitDuration + 50` from the moment it wrote the exit
style, then waited for a `transitionend` — which the browser counts from the style recalculation
that follows. Two clocks, and the gap between them is not a rounding error: measured in a real
application (a form with a rich-text editor in it), **245 ms** passed between writing the exit
transform and `transitionstart` firing, against a 200 ms exit. So the timeout expired while the
slide was starting, finalized the close through the fallback path, and cut the animation at
anywhere from 50 to 150 ms of its 200 depending on how busy that frame was.

Intermittent, and therefore not read as a timeout: what a user reports is a panel that sometimes
glides away and sometimes jumps. The library was in fact saying so all along — the fallback logs
`Animation fallback timeout` at warn level — but a warning that names the timeout does not point
at the animation being the victim rather than the cause.

The timer is now re-armed on `transitionstart` for the primary property, which puts it and the
`transitionend` it backstops on the transition's own clock. The initial arming stays: a dialog
whose transition never begins at all still has to be finalized rather than left hanging, and that
is the case the fallback was written for.

Found while porting `@familiprix/modal-manager` onto this library — a slide panel over a heavy
form is exactly the shape that makes the gap wide enough to see.

### Removed — GitHub code coverage, attempted and reverted the same day

Worth a note only so nobody spends the afternoon again. `actions/upload-code-coverage` takes
**Cobertura XML** and nothing else — the LCOV both suites already emitted is not read — and it
returns **HTTP 404** on this repository: Code Quality is gated on an enterprise owner allowing it,
and `francisdesjardins/umbra` is personal. "Code quality" does not appear under Settings →
Security at all. The setup page does not say so; its prerequisite links to a second page, and the
requirement is stated there.

It was found the expensive way, by the step failing the Unit Tests job on the commit that added
it. The first instinct was to keep the steps wired with `fail-on-error: false` — which is the
wrong instinct. A step that can only 404 is a step to delete, and running the coverage variants to
publish an artifact nobody opens costs the component job roughly 45% more runtime for a number
nothing displays. Coverage stays a local command.

### Changed — the component test report is uploaded only when something failed

It was `if: always()`. The report is worth having on a red run, where it carries the trace
`on-first-retry` recorded; on a green one it is an artifact nobody opens.

**Two reports, not one merged number**, and that is the same argument `.c8rc.json`'s exclude list
makes. The unit project deliberately measures only the framework-free half and excludes every
binding and DOM-only module, because the component project is what covers those. Averaged
together they would describe a codebase neither suite actually runs against, and the one number
would move for reasons nobody could attribute. `code-coverage/unit` and `code-coverage/component`
stay legible on their own.

The unit side needed only `cobertura` added to c8's reporter list. The component side merges its
own `.nyc_output` — so `ct-coverage-report.mjs` gained `--cobertura`, written through Istanbul's
reporter rather than by hand. That is not a reversal of the note at the top of that file: printing
its own table is arithmetic over three maps and `nyc` would have been a framework bought for its
name, but this document is parsed by something outside the repo, and a hand-rolled XML that GitHub
quietly declines is exactly the silent failure this setup has already produced three times.
`istanbul-lib-coverage`, `istanbul-lib-report` and `istanbul-reports` are declared now; they were
installed all along as c8's transitive dependencies, which is not a thing to import from.

Both uploads skip on pull requests from forks, whose token is read-only — a contributor cannot
grant `code-quality: write`, so failing there would fail on something they cannot fix. Naming any
permission on a job drops the rest to `none`, so `contents: read` is restated for the checkout.

### Fixed — the vanilla form modal's bottom border, and a green ring on a field in error

**Two validators were contradicting each other on screen.** An empty Name carries no `required`
attribute, so constraint validation calls it _valid_ — and `.input:user-valid` painted a **green**
border directly above the words "Name is required". It won on order alone: both selectors are one
class plus one pseudo-class, and the native block came second. Email went red in the same
screenshot only because `type="email"` gave the browser an opinion that happened to agree.
`:not(.error)` settles it: whoever says "error" out loud outranks the browser's silence.

**And the layout's bottom border was missing** — the trap `src/CLAUDE.md` already describes, in a
new place. The library's content wrapper is `flex: 1`, so `.formLayout` stretched to exactly the
dialog's height and put its bottom border on the last row of an `overflow: auto` box whose height
lands on a fraction of a pixel. Whatever the compositor does with that fraction it does to the
border, and the bottom edge read as simply absent while the other three were fine. `margin-block:
1px` lifts it off the clip edge. Vertical only — a side margin on a `width: 100%` box overflows by
exactly that margin, which trades a missing border for a scrollbar. The MUI twin never showed it,
because its Paper is not flush with the scroll container.

### Changed — one component owns where a modal's actions sit

`Shared.ButtonRow`, and it exists because three copies of one flex rule had already drifted: the
message footer flexed its buttons to the trailing edge with an 8px gap, the form footer used 16,
and the slide footer had **no `display: flex` at all** — so two actions there sat left-aligned and
touching, and the panel read as a different product from the MUI twin it is paired against. Each
footer renders `ButtonRow` as its own element rather than nesting one, so a template keeps its
chrome and gives up only the placement. All four modals now measure the same: 8px gap, flex-end.

### Changed — the vanilla slide panel says what its MUI twin says

The pair is meant to be read side by side, and only one of them had an Appearance section, a third
notification and a second action. It declared `'close'` where MUI declared `'cancel' | 'save'`.
Same three sections now, same controls, same two reasons — what differs is the markup underneath
and the one line naming the flavour, which is exactly what the message pair already does.

### Changed — the README's moons are drawn from the favicon

They were the characters `◐ ◑ ●`, and they carried the two defects `MoonPhase` was written for —
its comment already states both. A glyph is sized by the font and the geometric block is drawn to
different optical weights in different families, so the disc was never the same size as the
half-disc. And a screen reader announces `◐ Umbra` as "circle with left half black Umbra".

The playground answered that by drawing the moon as an SVG. Markdown cannot call a component, and
GitHub sanitises inline `<svg>` out of it, so these are files under `docs/brand/` referenced with
`<img>` — generated by `yarn build:moons`, which states the geometry once.

**The umbra is transparent, and that is the palette decision.** The favicon is an amber corona
around a `#0f172a` disc, and a near-black disc disappears on GitHub's dark theme. An `<img>` is an
isolated document, so `currentColor` never reaches it either. Painting only the lit limb and the
corona, in the favicon's amber, leaves the shadow to take the page's own colour — which is what a
shadow does — and the mark then reads on both themes with no `<picture>` swap per heading.

Two things measurement caught that reading the file did not. The full moon was **52px across
against every other phase's 58**: a stroke straddles its path, so the ring's outer edge sits half a
stroke beyond the radius the disc was drawn at. And the crescent and gibbous phases were correct
all along — they looked wrong at 28px, and counting lit pixels (31.9% / 44.2% / 56.6% / 64.6%)
settled it where squinting could not.

The footer keeps its shape: `░ ▒ ▓ ● ▓ ▒ ░` was three steps into the umbra and three back out,
which is now the seven phases saying the same thing — in **both** places, because the landing
page's own footer was still shade blocks. `MoonPhase` had named that row as the worse half of the
problem and then never replaced it; it now draws the same falloff, and gained the four phases it
takes to say it. The full-moon radius was wrong there too, so the three link cards had been
disagreeing about how big a moon is. The section markers keep their alternation.
One consequence worth knowing — an `<img>` contributes nothing to a GitHub heading slug where a
glyph contributed a dash, so the coverage badges now link to `#development` rather than
`#-development`. Those badges also read 98% and 93%, which is what the two suites currently
measure.

### Fixed — the microfrontend frame was unusable on a phone, and 200px too tall everywhere

**A modal in an iframe centres in the iframe's viewport**, and that viewport was the whole
document: 1802px at a 390px-wide screen. So a dialog opened 900px below the fold, the backdrop
dimmed a frame nobody was looking at, and a reader on the first panel saw nothing happen at all.
The frame is now capped at `80vh` below `sm` and scrolls itself, which makes its viewport the part
that is actually on screen — the same dialog now lands at y=248 of an 844px phone. A nested scroll
area is the cheaper of the two costs; a demo whose dialogs open out of sight demonstrates nothing.

**The frame's height could only ever grow.** It was measured from
`documentElement.scrollHeight`, which is never less than the viewport it sits in — and that
viewport is the frame, whose height the measurement sets. The two agreed at whatever the tallest
layout had been and stayed there. Invisible for as long as the content only got taller; the moment
a panel got shorter it left two hundred pixels of blank frame below it. Measured from the body now,
which is sized by its content.

**The panels are compact.** Each field's buttons moved beside it rather than under it, and became
icon buttons with a tooltip — the label survives in the tooltip and in `aria-label`, which is the
half that matters, since "Ask Checkout" and "Ask Billing" are the same glyph and _who is being
asked_ is the entire subject. The logs went from eight and a half lines to five and a half, which
still carries a whole exchange. Desktop: 869px → 660px.

Two things that had to be stated once and were not. Every control now takes its height from a
single `--control-h`, because an input's natural box (35px) and a square button's typed number
never agreed, and they now sit on the same line. And Audit — the panel behind a shadow root — was
missing `box-sizing: border-box`, which does not cross that boundary: its input asked for the same
34px as the other three and rendered 48, standing taller than the field beside it while the
stylesheet insisted they were identical. The rule changes no layout of its own; it changes what
every other number means.

### Fixed — the microfrontend frame ignored the theme toggle

It is a separate document, so its `prefers-color-scheme` answers the **operating system** and went
on answering it while the top bar said otherwise — a light frame inside a dark app. The parent now
writes `data-theme` onto the frame's document (same origin, so it can), and the page turns that
into a `color-scheme`. Its palette is one list of `light-dark()` tokens rather than two blocks to
keep in step, and with no attribute — opened on its own, outside the playground — it still follows
the OS.

### Fixed — a hairline beside the sticky jump bar

A highlighted card and `SectionNav` are both the content column's width, but that width is
fractional, so the card's 1px border straddled the bar's edge and half of it stayed lit as the page
scrolled. The bar's _background_ now bleeds two pixels through a pseudo-element. It deliberately is
not the box that widens: negative margins take `borderBottom` with them, and a divider running past
the cards it sits above is far more visible than the hairline it fixes.

### Fixed — `aria-keyshortcuts` was not a conforming ARIA value

Every token of `aria-keyshortcuts` must be a `KeyboardEvent.key` value from the UI Events spec,
and the Control modifier's is **`Control`**. `Ctrl` is what is printed on the keycap; it names no
key value at all, so every button the library had ever written a modified hotkey onto carried a
value assistive technology cannot resolve.

The spacebar is worse and is the spec's own named exception: its key value is `' '`, and the
attribute takes a space-**delimited** list, so `hotkey: Key.Space` produced `aria-keyshortcuts=" "`
— a value that cannot be parsed as one shortcut, let alone as a list. It is `Space` now, in the
label as well, where a lone space was equally useless.

**Hotkey dispatch was never broken by either**, and it is worth being exact about that: the
attribute and the selector that queries it were built by the same function, so the button was
always found. What was wrong is what a screen reader read off it.

**This changes the DOM.** `hotkey: 'Ctrl+s'` now renders `aria-keyshortcuts="Control+S"`, so a
stylesheet, an end-to-end selector or an analytics scrape keyed on the old string needs updating.
Nothing about the input spelling moved — `HotkeyDef` still takes `Ctrl+`, and `'Control+Enter'` is
deliberately _not_ one of its members, because the closed union is what makes a typo a compile
error and teaching the parser a second spelling would make the runtime wider than the type.

### Added — `formatAriaKeyshortcuts`, because a hotkey has two audiences

`formatHotkeyLabel` is documented as a human-readable label and exported for exactly that, so it
keeps `Ctrl+Enter` and now has no caller inside `src/` at all — which makes its own unit tests
load-bearing rather than redundant. The new function produces the DOM form, and the three places
that must agree by construction all read it: the attribute in `action-factory`, the selector in
`attach-keydown`, and `engine.ownsHotkey`. They share one `serialize`, so their modifier ordering
cannot drift apart either.

The end-to-end test asserts the attribute **and** the dispatch in one go, on a _modified_ hotkey.
Neither half is sufficient alone — the attribute assertion passes if the selector was left behind,
and the dispatch assertion passes if both were — and `Enter` and `Escape` serialise identically
under both spellings, which is why a suite made only of them was green against the bug.

`HotkeyDef` ships from the root too. The root's own signatures name it, so a framework-free
consumer could not annotate what they were being asked to pass.

### Added — `aria-busy` on the dialog while `prepare` runs

A dialog is shown on the animation frame after it opens, which is usually well before an async
`prepare` settles — `phase: 'open'` with `isPreparing: true` is the documented normal state of a
loading modal. The element said nothing about it. `aria-busy` is on the `<dialog>` for that window
now, in all three bindings.

It is written as `'true'`/`'false'` rather than present/absent, and that is the whole design:
`setDialogAttributes` **skips** `undefined` rather than removing it, so an omitted off-state would
weld `aria-busy="true"` onto a dialog that had finished loading. `isPreparing` is required on
`DialogAttributeOptions` for the matching reason — a binding that forgot it would ship a permanent
lie with nothing to catch it, so it is a compile error instead.

`setDialogAttributes` is that write loop, lifted into `core/dialog-props.ts` from the two bindings
that own their element. Its skip-on-undefined is a contract, not an optimisation: in
`umbra/vanilla` the element is the caller's markup, and an `aria-labelledby` they wrote must
survive an option they never passed.

### Fixed — the React Compiler had not been running for a while

The source is written under the compiler's rules — no `useMemo`, no `useCallback`, no ref writes
during render — and `src/CLAUDE.md` said `useModal` compiled to 88 memo slots. The shipped bundle
had none. Neither did the component-test bundle. `react({ babel: { plugins: [...] } })` is the
pre-rolldown form: under this project's Vite it is accepted and transforms **nothing**, and it was
written that way in both the library build and `playwright.config.ts`. Only the playground, which
had already moved to `@rolldown/plugin-babel`, was compiling anything.

So the package was written for a compiler that was not there. Not a correctness bug — the
constraints are a superset of correct React — but consumers were getting less memoisation than the
source assumed, and the docs asserted something the artifact did not do.

The library build now goes through `@rolldown/plugin-babel` like the playground. The component
bundle cannot: Playwright's runner bundles a Vite of its own, so it gets
`scripts/vite-plugin-react-compiler.mjs`, a plain Vite plugin in the shape `ct-coverage` already
uses — ordered _after_ the instrumenter, since both are `enforce: 'pre'` and coverage needs the
file as written for its counters to land without a source map. Verified both ways: coverage still
reports (92.99% over the component half), and the compiled `use-modal.js` opens with `c(76)`.

**Two things had to be true for this to be safe, and both were found by measuring rather than
reasoning:**

- **The compiler must be scoped to `src/react/`.** It decides what a hook is by name, and
  `umbra/solid` exports `useModal`, `useLookup` and two template hooks — so unscoped it compiled
  Solid's and wrote `import { c } from "react/compiler-runtime"` into the Solid binding, the one
  thing this package promises never to do. `verify:package` failed on it, which is the gate
  earning its keep.
- **`react/compiler-runtime` must be external.** It is React's own subpath, so bundling it would
  inline React internals into the package; the externals predicate listed `react` and
  `react/jsx-runtime` and would have missed it.

### Fixed — `useLookup` answered from the first render for ever

Found by compiling the component bundle, and invisible before it. The closed branch answers from
`manager.lookup(id)` — a read of mutable state the compiler cannot see into — so it memoised on
`manager` and `id`, neither of which changes when a modal registers. Uncompiled, the call re-ran
every render and the staleness never showed. The snapshot is now passed to the helper explicitly,
which is what it always was: the thing that says _when_ the imperative read may have gone stale.

This is the shape to expect from the rest of the tree: code written while the compiler was
silently off, holding assumptions only an uncompiled render satisfies.

### Changed — `runDeclarationWindow`

Both hook bindings wrapped their `render` call in `beginRender()` / `try` / `finally` /
`endRender()`, so by the rule that decides what is core, it was core. The compiler is what made
the cost visible: it cannot lower a `try` with no `catch` and it bails per function, so those four
lines left the whole of `useModal` uncompiled. Extracted, the hook compiles and the `finally` — a
`render` that throws must still close the window — is stated once instead of twice.

### Added — the library says when a labelling reference points at nothing

Naming twenty-four dialogs by hand taught the failure mode, and it is never "I forgot the option".
It is **the attribute written and the `id` absent** — the dialog stays anonymous while _looking_
named. No type sees it, no linter sees it, `yarn check` does not see it; it took reading Chrome's
accessibility tree to be sure. Nobody using this library is going to do that.

The core can, because at the moment a dialog finishes opening it holds both the element and the
tree to resolve against. `syncLabellingDiagnostics` reports two things, and only things that are
unambiguously broken: an `aria-labelledby` / `aria-describedby` whose ids resolve to nothing, and
a dialog that ends up with no accessible name at all. The rule itself is
`findLabellingProblems` — pure, injected with the resolver, and therefore a unit test rather than
a browser one, IDREFS splitting included.

Three decisions carry it, and two are about not crying wolf:

- **It reads the element, not the options**, which is the difference between working in all three
  bindings and working in two. In `umbra/vanilla` the markup is the caller's, so a check on
  `options.ariaLabelledBy` would call a perfectly named dialog anonymous and miss the ones that
  really are.
- **It waits for `prepare` to settle.** A name may legitimately point at a heading the caller has
  not been able to render yet — the modal that shows a spinner while it loads is the documented
  normal case. `isPreparing` is passed in rather than read behind the function, and that is what
  subscribes Solid's effect to it; a hidden guard would never bring the check back when the load
  finishes. Both bindings have a test that stays silent through that window, and removing the
  guard makes both fail.
- **No frame of slack, after all.** One was written in on the theory that `ModalOutlet` — which
  registers its node a commit late — would need it. Measured, the lag never reaches the check,
  because the phase gets to `'open'` on its own frame, after the outlet has rendered. Removing the
  deferral changed none of the five tests, so it is gone: machinery whose justification turned out
  to be false is not kept as insurance. The outlet test stays, asserting the outcome.

The vanilla binding gets the test the other two have, and it is the one that matters most: there
the `id` and the `aria-labelledby` referencing it are both hand-written, in two places, by someone
who will not see the result — and neither dialog in that harness passes an aria option at all,
which is exactly what reading `options.ariaLabelledBy` would have been blind to. It is also the
only place the "no accessible name" finding is exercised end to end, since the playground no
longer has a dialog that trips it.

Silent until `setLogLevel`, like every other warning here. That is the policy, not an oversight —
a `console.warn` with no dev/prod split is noise in production, and this package has no
dependencies and resolves without a bundler, so there is no `NODE_ENV` to branch on. It is for
someone already asking why their screen reader says "dialog", and it hands them the answer.

### Not done — `role: 'alertdialog'` does not require `ariaDescribedBy`

Worth recording because it is the obvious next tightening and it is wrong. The two options live in
the same object, so unlike `ariaLabelledBy` and the `id` it points at, the constraint **is**
expressible, and `ModalVariant` is the precedent for a mutually-constrained union here.

The APG says to **omit** the description when the dialog's content has semantic structure — lists,
tables, several paragraphs — because it would be announced as a single unbroken string. A type
would turn a conditional recommendation into an absolute rule, in the direction the spec argues
against. And `umbra/vanilla` would contradict it outright: there the body text is the caller's
markup, and `setDialogAttributes` skips `undefined` precisely so an `aria-describedby` already in
the HTML survives an option nobody passed. Requiring the option would force restating what is
already written, in the one binding built to avoid exactly that.

A constraint that cannot hold uniformly across the three bindings does not belong in the model, so
the diagnostic above stays quiet about it too — warning would train people toward the pattern the
spec tells them to avoid. The four alertdialogs in the playground each point at a single simple
paragraph, which is the case the APG does recommend, and the docs now say which is which.

### Fixed (playground) — 24 dialogs announced as just "dialog"

The library's own docs call an unnamed dialog the commonest defect in a dialog implementation, and
`.claude/commands/add-example.md` has required a name since it was written. Twenty-four of the
playground's forty-one dialogs did not have one — including all three _Getting Started_ examples,
the six `ui-integrations` files that are the MUI and vanilla reference people copy, and the
"Source Code" panel that is the most-opened dialog on the site. A defect there does not stay
there; it is pasted into other people's apps.

**The templates were the reason it could not be fixed one file at a time.** Four of the five title
components forwarded `children` and nothing else, so `ariaLabelledBy` was not expressible: the
heading existed and was unaddressable. That is why the three examples that _were_ correct had all
bypassed the template with a hand-written `<Typography id=…>`, and why they read differently from
their neighbours. `Title`, `Heading` and `Message` — MUI and vanilla alike — now take an `id`.

The convention is derived rather than invented, since a modal's id is already unique:
`ariaLabelledBy: \`${MODAL_ID}-title\``. Referenced rather than repeated, because a name written
twice is a name that drifts — which had already happened in `grocery-list`, whose `ariaLabel` sat
next to a heading saying the same words.

`ariaLabel` is kept for the two shapes where a reference would lie, and they are worth naming
because they are the cases a rule would get wrong: the heading **disappears** in some state
(`async-open` renders a spinner while loading, so the reference would dangle exactly when the name
matters), or it **changes** while the dialog is open (`per-action-state` goes from "Ready to
publish" to "Publishing…"; `mui-panel` changes per wizard step — a name that moves under the user
disorients, and the step is content).

**The gate is a browser, not a linter**, and that is a decision rather than an omission. A static
check can see that `ariaLabelledBy` is present; it cannot see whether the id resolves to anything,
and one that only checks for the option blesses `ariaLabel: ''` — the same defect wearing a hat.
So the twenty-four were verified by reading the **computed** accessible name off Chrome's
accessibility tree, dialog by dialog, which is also how the two that mattered were caught: the
code viewer's heading lives in a different file from the hook that references it, and the first
sweep silently measured nothing on two routes because the page had not hydrated yet.

**Two corrections that were not about naming:**

- **The cosmic gate was unnamed on purpose, for a reason that is false.** Its comment read "it is
  non-modal, never takes focus, and is announced by nothing". Not taking focus is not the same as
  being unreachable — a non-modal `<dialog>` stays in the accessibility tree and a screen reader's
  virtual cursor walks straight into it. The playground cannot teach an exception that is not one.
- **`focus-on-open` is a delete confirm and deliberately stays a plain dialog.** It got
  `role: 'alertdialog'` in this pass and lost it again: an alertdialog is announced with its
  description, and everything in that example's body is commentary about where focus went.
  The role travels with a description worth interrupting for, or it is noise.

`role: 'alertdialog'` therefore lands on four — the deployment failure a service raises with nobody
asking, and the three "this action cannot be undone" confirms — each with `ariaDescribedBy` on its
own body text, verified to resolve. Reaching for the interrupting role on every confirm is how it
stops meaning anything, so the deploy confirm, the archive and the hotkey demo stay dialogs.

Also: `eslint.config.js`'s only `no-restricted-syntax` block was scoped to
`playground/src/shared/templates/**`, a directory that has never existed — the templates are under
`entities/modal-template/`. It has matched zero files since it was written. Repointed, it reports
zero violations, which is the good outcome and not evidence it is still dead: the templates already
follow the rule it states.

### Fixed — a vanilla button unbound mid-action stayed disabled forever

`bindAction` writes `type`, `disabled`, `data-loading`, `aria-busy`, `aria-keyshortcuts` and
`data-focus-on-open` onto a button the library did not create. React and Solid unmount theirs, so
the writes go with them; the controller's button is the caller's markup and outlives the
controller. Unbinding retired the declaration and left every one of those attributes in place — so
a button unbound while its action was running was not a stale attribute but a **dead control** in
someone's page, permanently disabled and permanently busy.

The unbind now hands the button back as it found it. **Restored, not cleared**, which is the
distinction a naive fix gets wrong: a button the caller had disabled in their own markup must stay
disabled. And it is the _attribute_ that is captured, not the property — `button.type` reads
`'submit'` for a button that has no `type` at all, so restoring the property would add one.

`destroy()` had the same shape of bug from the other end: it unsubscribes before it tears the
store down, so a controller destroyed mid-`prepare` never received the notification that would
clear `aria-busy`, and the caller's `<dialog>` kept it for good. It writes the attributes once
more on the way out.

Also asserted, finally: `bind-dialog.ct.tsx` checked `data-loading` and `disabled` on a running
action while its own comment named `aria-busy` — the half assistive technology actually reads.

## 2026-08-10

### Added — tests for six paths the suites had never taken

Coverage was read as a map of untested behaviour rather than as a number, and what it found was
one whole feature, two teardowns and a documented promise. Unit 97.41% → 97.86% statements
(functions 95.96% → 99.19%), component 90.01% → 92.73% (branches 79.17% → 81.33%).

Unit _branch_ coverage reads 94.37% → 93.75%, and that is not a regression: c8 only counts
branches in code it executed, so reaching the previously-dead guards enlarged the denominator
faster than the numerator (453/480 → 465/496 — twelve more branches covered, sixteen more
visible). A file nothing calls contributes no branches to miss.

**`bindDialog`'s contained variant had no test at all** — 83.7% → 100% statements on
`vanilla/bind-dialog.ts`. `nonModal: true` without `portal` is the one variant that needs
something from the caller beyond the dialog, because a controller owns no markup and has to be
pointed at a host; all three branches of that resolution are now asserted (the parent by default,
an explicit `host`, and neither, which warns and carries on). Also its `onOpenRequest` forwarding,
and `destroy()`.

**Every uncovered path in the bindings was a teardown**, and the reason is worth writing down: the
CT coverage fixture reads its counters after the test body and before React's cleanup, so a
teardown that only ever runs at unmount is a teardown no assertion has watched. Driving it from a
button on the page is what makes it visible — which is what the Solid suite's unmount buttons were
already doing. That is how `ModalOutlet`'s `unregister` turned out never to run: a modal that
unmounts while open must be dropped from the outlet's map, or the outlet goes on rendering a
`<dialog>` for a hook that no longer exists.

**Solid's live fields reach the hook's return as well as the render args**, and only the render
args were read. The second copy exists for the trigger _outside_ the modal, and on this binding
they are getters over signals — so "reaches the return" and "stays live once there" are two
claims and the type system only checks the first.

**The scroll lock's `Set` of owners now has the test it exists for**: two managers each holding an
open modal, the first to close releasing nothing. The existing story covers the half where the
second manager has nothing open — a shared boolean passes that one and fails this one.

The manager gained the `lookup().isVisible` collection query (distinct from `lookup(id).isVisible`,
and the spelling nothing exercised), unregistering an unknown id, and the guard that keeps a store
notification which moves no phase from re-emitting an open.

**And the scroll lock is asserted with no document**, which this project is: every entry point
guards on `typeof document === 'undefined'` and nothing checked that they do. The manager reaches
all three the moment a modal registers, so a missing guard is a `ReferenceError` on a server
render — and the component suite cannot see it, because a browser always has a document.

What is left uncovered is left deliberately: the lock's padding arithmetic needs a classic
space-taking scrollbar, which headless Chromium has no way to produce (`computeScrollCompensation`
was extracted so it could be unit-tested without one); `applyStyle`'s `--` branch is unreachable
from TypeScript by design and says so; and `logger.ts`'s storage-failure paths memoise the probe
at module scope with no reset seam, so a test for them would pass alone and flake in parallel.

### Fixed — WCAG 2.2 AA: 28 contrast failures, and no keyboard focus indicator anywhere

Measured in a real Chrome across nine routes in both colour schemes, not read off the stylesheets
— which is the point, because the two worst findings were invisible to a careful read of the
theme. The tool is now [.claude/skills/wcag-audit](.claude/skills/wcag-audit/SKILL.md), so the
number can be re-checked rather than re-argued.

**Nothing drew a focus ring.** `ButtonBase` zeroes the UA outline and marks focus with
`.Mui-focusVisible`, and in this theme that class resolved to no visual change at all — outline,
box-shadow, border, background and both pseudo-elements byte-identical focused and not. Every
button, sidebar entry and card link was focusable with nothing on screen to say which had it. One
global rule fixes it, and the selector is `body :focus-visible` rather than `:focus-visible`:
`.MuiButtonBase-root` is the same specificity and is injected later, so the bare selector gave
plain links a ring and every MUI button silently nothing.

**Amber cannot carry white text.** `#d97706` measures 3.19:1 against `#ffffff` and `#f59e0b` only
2.15:1, so a contained button was the least readable thing on the page — worst in dark mode, where
the fill is brightest. Deleting the hard-coded `contrastText` does not fix it: MUI's
`contrastThreshold` defaults to 3, which is AA for large text, so white clears the bar and gets
picked again. The threshold is 4.5 now and the ink is the eclipse's own body, `#0f172a`.

That inverts the hover. Deepening the fill to `flameEdge` under a dark ink lands at 2.5:1 — the
old hover was compensating for the old ink — so primary now **brightens** on hover, which is what
a corona does anyway. The rule was also matched on the `contained` slot rather than on
`color: 'primary'`, so it had been painting the red Delete buttons amber under the pointer.

The rest, each measured and each fixed at its token rather than at its call sites:

- **`primary.main` as text** is a new `palette.accent.onSurface` — the readable end of the ramp per
  mode. The observation was already written down in `KindBadge`; it is a token now, and MUI's own
  text and outlined variants read it too.
- **`text.disabled` was tertiary text**, not inactive controls: 2.68:1 on white across eighteen
  call sites. Raised in both modes. The step it leaves is small because below `secondary` there is
  no room left above 4.5:1 — hierarchy under that line is size and weight, not fading.
- **The syntax themes are corrected to the surface they are painted on.** `oneLight` and `oneDark`
  are tuned for their own backgrounds; on this app's they shipped six failing token colours, the
  worst at 2.58:1, and code samples are most of what this site is. `readableSyntaxStyle` walks each
  token's **lightness** only, so each theme still reads as itself. Line numbers were 1.49:1.
- **The vanilla templates** — the ones users copy — had 1.3:1 input borders (an input that only
  exists once you click into it), a 2.85:1 hint, and the same white-on-amber button. Control
  boundaries are now their own token, separate from the layout's hairline, which stays a hairline.

### Fixed — the new focus ring was being cut in half, and the audit now says so

A ring at `outline-offset: 2px` reaches 4px past a button's border box, and any ancestor that is
not `overflow: visible` clips at its padding box. A modal footer is exactly that: a bounded box
with its buttons flush against the edge, so **Delete** and **Cancel** lost the ring on their right
and bottom sides — measured at a 0.0px gap, which reads as a rendering glitch rather than as the
missing half of a focus indicator.

Three places, three different reasons:

- The MUI message layout reserves the room in the padding it already had, the way the vanilla form
  modal does; `focusRingSpace` is now a shared token so the two agree.
- The vanilla form's own reservation was **2px**, sized for the 1px box-shadow ring it used to be
  the only one to draw. It is 4px.
- A scrolling list needed `scroll-padding`, not padding: tabbing to a row scrolls it into view,
  and scroll-into-view parks it flush against the edge — so the ring was clipped for whichever
  button you had just reached, every time, no matter how much padding was there at rest.

The audit reports clipping as its own finding now, and stops walking at an open `<dialog>`: a
top-layer element is painted outside its DOM ancestors' boxes, so continuing up reported the card
the dialog happens to be declared inside as a clipper. One real clip, one phantom above it.

### Fixed — mobile: a 13×13 checkbox, and the reflow that was fine all along

Audited at 390 and 320 CSS px, both schemes, with every modal, slide panel, toast and form error
state opened — 81 surfaces, 65 of them inside a dialog. Two WCAG 2.2 criteria only bite there, and
only one of them found anything:

- **2.5.8 Target Size** — the vanilla slide panel's checkbox is a native input at 13×13, which is
  a thumb against a fingernail. Sized to 24×24 rather than left to the spacing exception: that
  exception is about crowding, and this is about being able to hit the control at all.
- **1.4.10 Reflow** — clean. `scrollWidth` equals the viewport at 320px on every route. The two
  things that reach past the edge are meant to: the mascot peeking in from the side, and the code
  block scrolling inside its own `<pre>`, which is what the criterion asks for.

### Fixed — four modals were cut off on the right, and only on a phone

A `<dialog>` is capped by the user-agent at `calc(100% - 6px - 2em)` — **337px on a 375px phone**.
A panel sized `width: min(600px, 92vw)` asks for 345 and is clipped by eight pixels, losing its
right rounded corner. Above about 475px the two agree and nothing shows, which is why it read as
deliberate on every desktop.

The panel with steps, the reactivity demo and both form modals were sized this way (the forms
through `min-width: 90vw`, which overflows the same way at 320px). All four size against `100%` —
the dialog's own box — which cannot disagree with the dialog.

**The audit was blind to it, and that is the more important half.** It compared boxes to the
_viewport_, and nothing passed the viewport: the document never scrolled sideways and the reflow
pass called all four clean while the modals were visibly cut. It now measures every painted
descendant against **its own dialog's** box.

Two more the same round: the panel header (`HeaderActionLayout`) gave the title 99px of 345 because
its actions never shrink — it wraps now, with a floor under the content side. And the reactivity
modal's three columns were one non-wrapping row, pushing the third 82px past the edge.

### Removed — the ⏎ glyph on every button that declares a hotkey

Seven of them. A shortcut is announced by `aria-keyshortcuts`, which the action already sets, so
the glyph was a second announcement of the same thing — and telling a reader what key to press is
the application's job, not a dialog demo's.

### Fixed — the cosmic gate lost its top and bottom rim

Measured at DPR 1: the panel's left and right edges land on 41.000 and 334.000 — whole pixels,
crisp — and its top and bottom on 222.4375 and 567.875. A 1px band on a fractional edge is spread
across two device pixels at roughly 56/44, and at the `0.45` alpha it carried each half arrives
near 0.25 against a dark gradient, which is nothing. One declaration, two sides fine and two
apparently absent. The geometry belongs to the ancestors; the alpha does not, so the rim is opaque
and drawn inset. Its buttons are `Enter` and `Close` now — at two words each they wrapped, and a
wrapped button is what made the panel tall enough to land where it did.

### Fixed — the MUI form modal's bottom border was missing a pixel

The trap `src/CLAUDE.md` documents, met in the wild: a `<dialog>` keeps `fit-content` and centres
with `margin: auto`, so its box lands on a fraction of a pixel — measured at `top 300.734,
bottom 599.25` — and this layout shares that rectangle exactly. Its 1px border therefore occupied
the last fractional pixel, and the compositor kept the sides and dropped the bottom. Drawn as an
inset shadow it lands on whole pixels regardless of where the box does. That is the "move the
border inward" remedy, demonstrated where users copy from.

### Fixed — the cosmic backdrop's corona was sliced, then marooned

`radial-gradient(circle …)` with no size means `farthest-corner`: on a 390×844 phone the radius is
about 465px against a 195px half-width, so the ring's band ran off both sides and the halo read as
cut. Sizing the circle to the _closest_ side fits — and is then as small as the narrow dimension,
a collar in the middle of a tall screen with the eclipse marooned in the dark.

The composition is a **ratio**: on a desktop the ring sits at roughly four times the disc's
radius. `farthest-side` takes the half-height instead of the half-width, which restores that ratio
and fills the screen; what leaves the viewport sideways is the soft outer falloff, not the ring.
Scoped to a media query so the desktop shape is untouched — the corona is its own custom property
now, so the phone restates that one layer rather than the whole stack.

The panel is `100dvh` below `md`, with its content centred. `60vh` is a desktop proportion, and on
a 667px screen it put the disc within 30px of the top — where the pulse, a 90px `box-shadow`, was
cut off in a straight line by the `<dialog>`, which is a scroll container and clips at its own
edge. Filling the height gives the glow its room inside the box that clips it.

### Fixed — the corner toast logged a React error every time it expired

`handle.close('timeout')` was called from inside a `setRemaining` updater. React may run an
updater during a render, and closing from there writes to the modal store mid-render — "Cannot
update a component while rendering a different component", on every toast that ran out on its own.
The updater is pure now and the close moved to an effect on the tick that reaches zero, so the
visible number and the actual lifetime are still one thing rather than two timers that drift.

### Fixed — the debug logger was unreadable on a light devtools console

Every namespace colour failed 4.5:1 against a white console — `action` at 2.16:1 — and two failed
on a dark one as well. It cannot be solved by picking better colours: the console follows the
_system_ theme, which the page cannot read reliably, and the two 4.5:1 bars leave an empty window
between luminance 0.183 and 0.237. No single colour is readable on both.

So the namespace label is a filled **badge** now: its contrast is against the colour behind it,
which this library owns, and the console theme stops mattering. The `padding` and `border-radius`
were always there — only the background was missing.

### Changed — the moon glyphs are an SVG, and the decorative ones are marked as such

`◐`, `◑` and `●` were characters, so the page title inherited them at 48px and an `overline` label
at 12px, and the geometric-shapes block is drawn to different optical weights per font — the disc
and the half-disc were never the same size on screen. `MoonPhase` takes a `size` in px, uses
`currentColor`, and is `aria-hidden`, which also stops a screen reader announcing “circle with left
half black Umbra”.

Same reason for the `⏎` on the seven buttons that carry a hotkey: it was inside the accessible
name, so the shortcut was announced twice — once properly from `aria-keyshortcuts`, once as a
stray return symbol.

### Changed — the microfrontend frame is two by two, and its four panels finally agree

Four columns was a decision made against a viewport the frame never gets. Inside the playground's
content column it is **990px wide**, which four tracks divide into 227px: every button wrapped to
two lines, log lines were cut mid-word, and — because a two-line button row is taller than a
one-line one — the four panels disagreed about where their controls ended and their logs began.
Two tracks give 471px, and the rows cost nothing now that the logs are a fixed height.

The labels came down with it, to two or three words each: `Ask Billing`, `Ask Checkout`,
`Open my receipt` / `Open my ticket` / `Open my review`. Parallel wording across four panels is
not decoration here — the panels are read side by side, so a phrase that wraps in one and not
another is the alignment gone. Measured after: all four logs at the same `y` in their row, all
441×182.

**Audit was the one out of step, and the boundary is why.** Its label read `Account` in sentence
case while three others shouted, because the uppercase lives in a `.field > span` rule that stops
at the shadow root. Its own styles restate the host's spacing and label treatment now — which is
the fourth thing this panel has taught the demo about what a shadow root costs, after
`document.activeElement`, the backdrop sheet and event targets.

### Changed — the microfrontend logs are fixed boxes, newest first

Four panels write at once, and every line made its box taller: `.log` was `flex: 1` over a bare
`min-height`, so the panel grew, the document with it, and `host-frame.tsx` — which sizes the
frame by measuring the document inside — grew the frame to match. Reading the page meant watching
it walk downward, and the line that explained what had just happened was the one below the fold.

So the box is a fixed height that scrolls, sized in lines rather than pixels (`8.5`, the half
being the part that says there is more below) so the number survives a change of type. And
`logTo` prepends: the newest line is the one you are already looking at, and scrolling is for the
curious rather than for keeping up. Nothing is scrolled into view — prepending above the viewport
would shove a reader's place down the box, and scroll anchoring holds it instead.

Measured in the frame rather than assumed: through thirteen logged lines the document stays
471px and all four boxes stay 182px, where before both climbed with every click. The
`ResizeObserver` stays — it now answers the question it is actually good for, the frame's width
crossing one of the host grid's breakpoints and re-laying four columns into two.

### Fixed — the component coverage measured nothing at all on Windows

The fourth way this setup has found to fail quietly, and the largest: `scripts/vite-plugin-ct-coverage.mjs`
filtered by `relative(root, id).startsWith('src/')`. Vite hands module ids with forward slashes;
`path.relative` answers in the **platform's** separator. So on Windows every file arrived as
`src\core\style.ts`, the prefix never matched, `instrumentSync` was never called, no page defined
`__coverage__`, nothing was written — and the report said `.nyc_output` was empty, which reads as
"you forgot the flag". Every stage after the first was working perfectly on nothing.

Measured both ways with the coverage cache cleared between, so the cache could not be the
explanation: without the normalisation, 240 tests pass and 0 counter files exist; with it, the
same 240 produce **90.17% of 1210 statements over 46 files**. The 90.13% and 88.81% recorded here
yesterday are within a rounding error of that, so they were real numbers — but they cannot have
been measured on a Windows checkout, because on one the filter matches nothing at all.

The fix is `.replaceAll('\\', '/')` on the one line. The finding is the class: a path predicate
comparing a `path.relative` result against a POSIX literal is broken on half the machines that
will run it, and this repo is developed on one of them.

### Fixed — the report merged the previous run's counters into this one

`.nyc_output/` was never emptied. The fixture writes `ct-<worker>-<n>.json` per test and the
report merges every file it finds, so counters outlive the run that produced them: a full run
leaves 21 files, then a targeted one (`--grep`, a single spec) writes 3 and the report sums all
24 — a coverage nobody just measured, printed as though someone had. The header even reports the
file count as "N tests", so the wrong total is on screen looking ordinary.

A `globalSetup` ([scripts/ct-coverage-reset.mjs](scripts/ct-coverage-reset.mjs)) rather than a
`rimraf` in front of the yarn script, because the invocation that gets this wrong is the ad-hoc
one someone types while chasing a single file's number. It cannot be the fixture's job: workers
are separate processes, and each would delete the others' output mid-run.

The merge is `?? 0` on every counter now, and the "nothing was written" message names all three
causes instead of guessing the first — an empty directory does not say which stage produced
nothing, and that is exactly what made the two failures above cost what they did.

### Changed — the dismiss reservation now holds where the type cannot

`ActionReason<TReason>` is `Exclude<TReason, DismissReason>`, and `Exclude<string, 'dismiss'>` is
`string` — `string` is not assignable to the literal, so there is nothing to remove. The
reservation therefore bound exactly the callers who had already followed the rule it depends on,
and left the modal that skipped it — the one most likely to name a button `'dismiss'` without
meaning what that produces — with no error at all.

Narrowing the type is not available: anything strict enough to reject `'dismiss'` out of a bare
`string` rejects every other reason with it. So `engine.declare` warns instead, once per engine
(React re-declares every pass) and warns rather than refuses, because the button does work — it is
the close it reports that stops being distinguishable from the four the library raises on its own.

And `CloseResult.reason` said the invariant in absolute terms — "carrying it means nobody acted,
**every time**" — while the type delivered it conditionally. It now says which condition, and
that condition is one more thing declaring the union buys.

### Fixed — four claims in the docs and comments that had stopped being true

Each was true when written, which is the only interesting thing about them.

**`solid/use-modal.ts` credited the wrong two mechanisms.** It warned that a forwarding arrow
would drop `isRunning` and be caught by `binding-parity.test.ts` "and not by a type annotation
alone" — both halves backwards. The annotation is exactly what catches it: turning `ActionFactory`
into an object type with a call signature, which the same commit did, makes a bare arrow a missing
required property (`TS2741`, verified). And `binding-parity.test.ts` structurally cannot see it —
it regexes `export {…} from` in the two entry files, and a property of a factory is not an export.
What the checker cannot say is that the property stays _live_ through the wrapper, and that is
what the Solid component test actually pins.

**`src/__tests__/ct-coverage.ts` still credited `vite-plugin-istanbul`** with instrumenting the
bundle, twenty lines above the sentence telling the reader not to swap in `vite-plugin-istanbul`.
Yesterday's doc pass fixed the other stale note in that file and left this one.

**`src/CLAUDE.md` still said an action may be named `'dismiss'`**, four bullets above the one
declaring it reserved. It slipped through for the same reason the type only half-works: the
sentence was about the `TReason` default.

**The README asked for more React than the package does** — `^19.2.4` / `^1.9.14`, which are the
repo's own dev pins, against peer ranges of `^19.0.0` / `^1.9.0`. That one was corrected yesterday
in the README and not in `CLAUDE.md`; both now say the peer range and say which is which. The
coverage chips are re-set from the two commands as they stand today (97% / 90%), and
`package.json`'s description is back to a literal em dash — Yarn rewrites the `—` escape on
any install, so it was never going to survive anyway.

### Changed — breaking: `DialogSnapshot` is `ModalSnapshot`

The vocabulary rule says `dialog` is the element and `modal` is the unit of state, and this type
holds `{ phase, isVisible, isPreparing, hasRunningAction, error }` — no element anywhere. It sat
between two neighbours that follow the rule (`ModalStoreSnapshot` in the core) or are recorded as
an exception (`DialogManagerSnapshot`), and was neither. It slipped through the terminology passes
because `umbra/vanilla` shipped after them.

`DialogController` keeps its name: that one does drive the element.

### Changed — two more signatures narrowed, and a file put where it belongs

Both are the move that `isBackdropClick`, `shouldDismissOnBackdropClick` and `finalizeModalClose`
already made, applied to what the coverage report was still showing as a gap.

**`applyStyle` writes through `setProperty` and `removeProperty`, and nothing else.** Asking for an
`HTMLElement` was the only thing making its clearing logic a browser question — and the clearing is
the reason the function exists rather than an `Object.assign`: a style is recomputed per phase, so
a property named only in the entrance keyframe has to be removed when the exit one omits it. Get
that wrong and a dialog leaves scaled, which reads as an animation bug three layers away.
`StyleTarget` is those two methods; a real element satisfies it and no call site changed.
`core/style.ts` 68.6% → 98.3%.

**`clickHotkeyButton` was the one DOM function in an otherwise pure module**, and hosting it kept
`utils/hotkey-utils.ts` — `formatHotkeyLabel`, `matchesHotkey`, the parser — out of the unit
project's reach entirely. It moved to `core/attach-keydown.ts`, its only caller and already
DOM-only. `utils/hotkey-utils.ts` is at 100% statements now, and left the exclude-list prose that
named it as a partially-covered file.

Unit coverage 96.37% → **97.37%** statements, functions 93.6% → **95.96%**.

**One thing was tried and reverted, and the failure is the finding.** `toCssName` passes a `--*`
key through untouched, but `DialogStyle` — a mapped type over `CSSStyleDeclaration`'s own keys —
cannot express one, so that branch is unreachable from TypeScript. Adding a `` `--${string}` ``
index makes React's `CSSProperties`, which has no such index, stop satisfying `DialogStyle`, and
that assignability is what lets `getDialogAnimationStyles` take a binding's own style type. So the
branch stays for the callers the type does not reach — `umbra/vanilla` is used from plain
JavaScript, and `--dialog-backdrop` is the one lever the library documents — and the reason is
written beside it instead of being rediscovered as an uncovered line.

### Changed — the docs the coverage work left behind

Caught by asking whether they were current, which they were not. `scripts/ct-coverage-report.mjs`
and `src/__tests__/ct-coverage.ts` both still carried the "the line numbers are not sound" warning
— written when it was true, left in place after the fix that made it false, which is worse than
never having written it. Both now describe what the setup does and point at the plugin that makes
positions trustworthy.

Two coverage chips in the README, hand-set from the two commands and labelled as a snapshot rather
than a gate, plus the paragraph that says why there are two numbers at all: neither project can
measure the other's half. And `CLAUDE.md`'s entry-point table gained the `umbra/vanilla` row it had
been missing since that binding shipped — three specifiers listed, four discussed in the prose
directly below it.

### Fixed — the component coverage was pointing at the wrong lines

The experiment reported percentages that were sound and positions that were not, and it took
trying to _use_ one to notice. `vite-plugin-istanbul` runs `enforce: 'post'`, so it instruments
the output after TypeScript has been stripped and remaps through the combined source map. That map
exists and looks healthy — 2760 mappings, the right source, verified with a probe plugin — and the
result is still wrong: on `solid/modal-outlet.ts` every counter below the file's 20-line JSDoc
block lands exactly 16 lines early, `createLogger` at line 12 is attributed correctly, statements
sit on prose, and `export function ModalOutlet` reads as never executed while sixteen tests walk
through it. `build: { sourcemap: true }` changes nothing.

So the remapping is avoided rather than debugged. [scripts/vite-plugin-ct-coverage.mjs](scripts/vite-plugin-ct-coverage.mjs)
instruments at `enforce: 'pre'`, where the file is still the file as written and the positions need
no map to be right — Babel parses the TypeScript and JSX directly, and everything downstream treats
the injected counters as the ordinary JavaScript they are. Totals are unchanged, which is the
confirmation that the counts were never the problem: 88.81% before and after, to the statement.

### Fixed — the CT build cache made the coverage switch a coin toss

Playwright keys its component build on the Playwright and Vite versions and a hash of the
**sources** — not on the plugin list. So toggling `CT_COVERAGE` alone reuses whatever bundle is
already there: a coverage run after an ordinary one produces no counters at all, and the report
says `.nyc_output` is empty rather than that anything is wrong. It cost me two false conclusions in
one sitting, the second after having written the warning myself.

`use.ctCacheDir` is the knob (`viteUtils.js:51`), so there are two caches now — `playwright/.cache`
and `playwright/.cache-coverage`, with Vite's dep cache split the same way. Each build is valid on
its own terms and switching costs one rebuild instead of a wrong answer. Verified by alternating
four runs, clearing nothing: 0 counter files, 21, 0, 21.

One edge survives and is written down beside the setting: the freshness check walks the component
sources, so editing `scripts/vite-plugin-ct-coverage.mjs` alone invalidates nothing, and changing
the instrumenter means deleting `playwright/.cache-coverage/` by hand.

### Added — the four Solid paths nothing was asserting

With positions to trust, the report named them: `teardownModal`, `outlet.unregister`, the
`portal: true` branch and the contained-placement host had **zero** executions in the Solid suite,
while React's covers all four — and React has already regressed on one of them, when `portal` fell
out of the teardown deps and left an orphaned open dialog.

All four pass. No bug: disposal unregisters, the outlet forgets, the portal mounts into
`document.body` and the contained host is built. They are pinned now, which they were not, and that
is the honest result — coverage found unasserted behaviour, not broken behaviour.

`solid/use-modal.ts` 82.5% → 92.2% statements, `solid/modal-outlet.ts` 65.2% → 91.3% (branches 25%
→ 50%), and the project 88.81% → 90.13%.

**The gap it measures is still there**: `use-modal.ct.tsx` has 60 tests, the Solid suite has 20.
`binding-parity.test.ts` asserts the two bindings export the same names; nothing asserts they are
tested to the same depth, and they are not. Closing that is a test-by-test walk, and the four here
were the ones coverage could point at.

Three of the four failed when first written, and all three were the test rather than the library:
twice the top-layer rule (an unmount button outside a `showModal()` dialog cannot be clicked, so it
had to move inside `render`), and once an invented assertion — the contained host is
`position: absolute`, which `dialogPlacement` spells out and its doc explains, not the `relative`
the prose in the root guide had left in my head.

### Added — unit coverage, and the three signatures that were blocking it

93.88% → **96.37%** statements, 92.38% → **94.22%** branches, 88.46% → **93.6%** functions, and
25 new tests. Worth splitting the two causes, because only one of them is testing:

- **The tests alone** take statements to 95.35% and functions to 90%. Everything below is a real
  assertion that did not exist.
- **Classifying two modules** accounts for the rest. `core/dialog-styles.ts` and
  `utils/dialog-scope.ts` have _zero_ reachable runtime in Node — one needs `CSSStyleSheet` and
  `adoptedStyleSheets`, the other `Element` and `closest` — and `dialog-styles` had been sitting
  unclassified since it was extracted on 2026-08-09, which is exactly the state the one-by-one
  exclude list exists to surface.

**Three functions were untestable only because their signatures asked for more than they read.**
`isBackdropClick`, `shouldDismissOnBackdropClick` and `finalizeModalClose` each took an
`HTMLDialogElement` and touched one or two members of it — a rect, or `open` plus `close()`.
Narrowed to what they use (`BackdropDialog`, `Pick<HTMLDialogElement, 'open' | 'close'>`) they
became ordinary Node tests, and **no call site changed**: a real `<dialog>` satisfies both. It is
the move `BackdropClickEvent` in the same file already made for the event, with the same
justification written next to it.

That unlocked the backdrop dismissal chain — four questions, each of which exists for a reason and
none of which had a unit test: a non-modal dialog has no backdrop; dismissal is opt-out without
actions and opt-in with them; the shared gate covers phase, `prepare` and a running action; and
only then does the geometry decide. Plus `isBackdropClick` itself, where the order of its two
questions is the whole subtlety — a keyboard-activated button reports `clientX: 0`, which is
outside a centred dialog's rect and would dismiss the modal on geometry alone.

New `finalize-close.test.ts` for the shared close tail both paths run: the element closed only
when still open (calling `close()` on a closed dialog fires a second `close` event at whoever is
listening), the null element teardown passes, `onClose` before finalize, and a throwing `onClose`
reported rather than lost. The engine gained the action-overlap warning, the idle-state fallback
and `undeclare` mid-pass; `slideDialogStyle` gained the cross axis it was missing — a panel
sliding up from the bottom is aligned left/right, and only the top/bottom pair had a test; the
logger gained its persistence branches and the nearest-ancestor colour walk.

Two tests were wrong before they were right, and both were the code being correct: the overlap
warning goes through the logger, which is silent until a pattern is set, so asserting on it
without `setLogLevel` asserts that the logger is off; and `modal:lifecycle:deep` inherits
`modal:lifecycle`'s colour, not `modal`'s, because `resolveColor` stops at the nearest ancestor
that has one.

What is left uncovered is now honest: `manager/scroll-lock` and `core/style` write to real
elements, `utils/hotkey-utils` has one DOM function among pure ones, and the manager's remaining
gaps are all behind `typeof document === 'undefined'` guards whose _guard_ is the covered branch.

### Added — `action.isRunning(reason)`, the per-action state away from its button

The engine has always known which action is running; only the button was told. `data-loading`
carries it in the props you spread, so a header, a field or a status line — anything not spreading
those props — had `hasRunningAction` and no way to tell two waits apart. Publishing and saving a
draft are not the same wait.

The request that started this was `hasRunningAction.is('save')`, and it is worth recording why it
is not that. **No falsy value in JavaScript can carry a method** — `false`, `0`, `''`, `null`,
`undefined` and `NaN` take no properties, and every object, `new Boolean(false)` included, is
truthy. `if (hasRunningAction)`, `!hasRunningAction`, `disabled={hasRunningAction}` and
`<Show when>` would all have gone silently always-true, with no type error to catch it, and
`Symbol.toPrimitive` does not help: it governs `+x` and `` `${x}` ``, never the truthiness of
`if (x)`.

So the same ergonomics, on the one thing in the render args that is **already an object**: the
`action` factory. `action.isRunning('publish')` reads as it was meant to, and the reason it works
there is the reason it is right there — the argument says whose state is being asked for, which is
why `ActionState.isRunning` is one word while the aggregate has to spell out its scope.

It lives in [core/action-factory.ts](src/core/action-factory.ts), over the same `readState` the
live props already use, so **neither hook binding contributes a line** and both are reactive by
construction rather than by two implementations agreeing. One exception, and it is the interesting
one: Solid re-wraps the factory to attach `undeclare` on cleanup, and a wrapper that forwards only
the _call_ drops what hangs off it. Its component test fails without the re-attach — confirmed by
breaking it on purpose.

`./vanilla` has no factory to hang it on, so the controller carries the noun:
`isActionRunning(reason)`. `bindAction` already keeps the button in step; this is the same fact for
everything that is not the button.

Not `stateOf(reason)`, which would have carried the per-action **error** too. That is a second
feature with its own questions (does the aggregated `error` stay? does an action's error clear on
retry?) and this one does not block it.

### Changed — breaking: `'dismiss'` is reserved, and it is a type now

Asking whether `'dismiss'` belonged in `isRunning`'s union turned up something worse than an
answer. It was reachable — `action('dismiss', handler)` was a legal declaration — and that made it
**two doors producing one reason**:

- the button, which ran a handler and closed with `'dismiss'`;
- the dismiss key, which consults the engine by _hotkey_ and never by name, so it closed the store
  directly and the handler never ran.

Both arrived at `onClose` as `reason: 'dismiss'`, indistinguishable. Every other action is exempt
from this — press Escape with a `'cancel'` button on screen and the close says `'dismiss'`, so the
two paths are legible. Only the name that collides with the library's own was ambiguous. Confirmed
in a browser before changing anything, with a handler that recorded whether it ran.

`'dismiss'` now means one thing: **the modal was dismissed rather than acted on** — the dismiss
key, a backdrop click, a click outside a non-modal panel, or teardown. Actions take
`ActionReason<TReason>` = `Exclude<TReason, DismissReason>`, so no action may be _named_ it.
`Exclude` rather than a doc note, because declaring `'dismiss'` in your own union is legitimate —
it is a reason `onClose` sees either way, and writing it out makes the `switch` honest — and
without the exclusion that declaration also handed you an action you could name.

Nothing is lost. Both halves of what a "dismiss action" bought already have unambiguous spellings,
and one of them is the precedent that raised the question: **a key that should run your handler
instead of dismissing is `action('cancel', { hotkey: Key.Escape, onAction })`** — the dismiss key
already defers to it, and dispatch is a real click, so running state and veto apply. And work that
must happen on _every_ dismissal, including the backdrop click and the teardown that can never run
a handler, belongs in `onClose`, the one door every close passes through. Extending the key's
deference to a name would have given three behaviours where there are two.

**The reservation is enforced by the type system, not by prose.** `'dismiss'` was written as a
bare literal 34 times across 13 source files; it is now [core/dismiss-reason.ts](src/core/dismiss-reason.ts),
and both halves earn their place. The **type** is what makes a change impossible to ignore — every
producer takes `TReason | DismissReason`, so editing that one line stops the library compiling
rather than leaving one path spelling it the old way. The **constant** covers what the type cannot:
the manager's DOM event details type `reason` as a plain `string`, where a literal sat unchecked.
Both ship from the root, so a consumer comparing against it never retypes the string either.

Breaking for three call sites, all of which were saying something they did not mean. The failure
modal's Dismiss button is `action('acknowledge')` — and that hook now declares its reasons, which
it should have all along. The corner toast's Dismiss button became `handle.close('dismiss')`,
joining the ✕ beside it that already did: a control whose whole meaning is "I did not act on this"
is a close you _report_, not an action you declare, and it wanted nothing an action provides.

### Added — a note on the tooling, in the README

Who wrote this, said plainly: Claude typed it, nearly 30 years of doing it by hand directed it.
It sits after "How this repo is run" because it is the same kind of warning — how this repo
works, so nothing surprises you.

The section makes its case out of evidence already in the tree rather than asserting rigour: the
renames in this file, each with the reasoning that produced it, and the entry-point isolation
tests, which exist because someone knew in advance how a framework import sneaks into a
framework-free core. A model writes ten dialog managers before lunch; which of the ten to keep is
the part it cannot judge, and that is the whole of the claim.

### Changed — the README lists the surface that exists

Read against `src/` rather than against the last edit, and four kinds of drift came out.

**The entry-point table named a third of the root and half of `./react`.** `createDialogManager`,
`applyStyle`, `matchesHotkey`, `formatHotkeyLabel` and `setLogLevel` all ship from the root;
`DialogManagerProvider`, `useDialogManager` and `useLookup` from the React binding. The vanilla row
gains `bindAction`, which the paragraph directly under it already documented — the table was the
part a reader skims.

**The peer ranges quoted were the pinned devDependencies.** `^19.2.4` and `^1.9.14` against
`package.json`'s `^19.0.0` and `^1.9.0` — someone checking whether their React 19.1 app qualified
would have concluded it did not. The zero-dependencies bullet was older still: `react` and
`react-dom`, with no mention of `solid-js` as the second optional peer or of `./vanilla` as the
entry point that needs neither.

**Four features had no bullet at all** — `prepare` and the `AbortSignal` it hands out,
`dialogPlacement` with the portaled/contained split for non-modal panels, the stylesheet adopted
per root so a dialog inside a shadow root gets the library's backdrop, and `requestOpen` with the
`modal:open` / `modal:close` events that cross bundle boundaries. The `action` props list was four
fields short of what the factory returns (`type`, `aria-busy`, `data-focus-on-open`, and
`data-loading` was there but the set read as complete).

**The API.md contents list predated two chapters**, `umbra/solid` and `umbra/vanilla`, and had
never mentioned `ModalOutlet`, `dialogPlacement` or the lifecycle events.

Two smaller ones. The typed-close snippet spread `action('submit')` and then re-applied
`disabled={hasRunningAction}` — the same value the spread already carries, which reads as though
the spread needs help; it uses that arg for the button's label instead. And the naming-pass example
was dated to "this week", which is the one phrase in a README guaranteed to expire: it names the
three renames now and leaves the dates to this file.

## 2026-08-09

### Added — the microfrontends get a route of their own

They were one card on `/advanced`, which is where they stopped fitting: four panels inside a frame,
inside a card, inside a column shared with five other sections. `/microfrontends` is the page now —
three sections (the demo, the distribution, the four panels), the frame across the whole column,
and a card per file.

**The frame sizes itself from the document inside it**, which is the part worth keeping. It used
hard-coded heights per breakpoint and every one of them was wrong: MUI's breakpoints key off the
**viewport** while the host's own grid keys off the **frame's width**, and the two diverge by the
sidebar plus the page padding — so a height computed for a 1200px viewport was being applied to a
604px frame that had reflowed to two columns and wanted twice as much. Adding a fourth panel made
most of them wrong at once. Same origin, so it reads `documentElement.scrollHeight` directly and
watches it with a `ResizeObserver`; it adds the frame's own border, because `box-sizing:
border-box` was otherwise leaving the inner viewport two pixels short and growing a scrollbar for
exactly those two. Verified at six widths from 420px to 1600px — no inner scrollbar at any of them.

Audit's `Escalate` button says `(fails)` now. It throws on purpose, since it is the harness for the
focus-restore fix below, and unlabelled it simply read as a broken demo.

Reading `/advanced` back after the move turned up three counts that no longer described anything.
Its own description promised "two showcases" and there are three — wrong since the third was
added, not by the move. The sidebar's comment said seven routes when there were eight, and adding
one made it eight when there were nine. And the **landing page** still said "React and Solid ship
as two bindings", months after `umbra/vanilla` became the third — the most visible sentence in the
playground, and the one nobody re-reads. All three now say what is there, and `/advanced` points at
the new page rather than leaving the topic to vanish.

### Fixed — a failed action handed focus to the dialog instead of the button that ran it

Found by adding a fourth microfrontend on a hunch, and the hunch was wrong in an instructive way.

The demo now carries **Audit**, a web component whose `<dialog>` lives in a shadow root, driven by
the same `bindDialog` call Billing makes twenty lines away. The theory was that a shadow boundary
would break the focus policy, because `focus-policy.ts` reads `document.activeElement` — which
answers with the shadow _host_, so `dialog.contains(active)` is false and every check silently
concludes focus has left. That much was true, and it is fixed: those reads go through
`activeWithin(dialog)`, which asks the dialog's own root (`getRootNode()`) instead of the document.

But the visible failure the probe caught was **not** the boundary. After an action throws, the
modal is supposed to put focus back on the button that ran it — the retry belongs under that hand.
It was landing on the dialog. The cause is subscriber order, in plain markup, in every
`umbra/vanilla` dialog: `bindAction` writes `disabled` from its own synchronous engine subscriber,
and a caller binds actions _after_ `bindDialog` returns, so that subscriber is registered ahead of
the focus coordinator's. The browser blurs a disabled element, so by the time the coordinator asks
who was standing on the action, nobody is.

The coordinator now remembers focus as it arrives, with a `focusin` listener on the dialog scoped
by `isOwnEventTarget` the way the keydown listener is. `focusin` cannot lose that race — it fires
when focus lands, before anything disables anything. The live read is still tried first, so the
hook bindings keep the more specific answer.

Pinned by a regression test in plain markup, with `focusOnOpen` on the _other_ button so a pass
cannot be "focus never moved" — and confirmed to fail without the fix.

The second finding from the same experiment is fixed too: **the library's `dialog::backdrop` rule
now follows the dialog into a shadow root.** The sheet was adopted onto `document`, and
`adoptedStyleSheets` does not cross the boundary — so a dialog inside a web component got the UA's
backdrop, measured `rgba(0, 0, 0, 0.1)` against the library's `rgba(0, 0, 0, 0.7)`, while
`--dialog-backdrop` inherited in perfectly well and had no rule left to feed. The custom property
crossing and the rule not crossing is precisely what made it invisible.

The sheet moved out of the manager into [core/dialog-styles.ts](src/core/dialog-styles.ts) and is
adopted **per root**: the document, plus `dialog.getRootNode()` at every `showDialog`, idempotent
per root through a `WeakSet`. `showDialog` is the one place that knows which tree a given dialog is
in. `BODY_LOCK_ATTR` moved with it, so the selector and the `setAttribute` that has to match it now
share one constant instead of agreeing by memory.

Both findings are pinned by component tests that fail without their fix — one in a shadow root, one
in plain markup.

### Fixed — the `type` badge was drawn in the page's own background colour

On `/api` in dark mode the `type` chip was invisible, in the rail and in every symbol header.
Measured rather than eyeballed: **1.00:1** in the rail, 1.11:1 on a card — not "hard to read",
literally the same colour as what is behind it.

`KindBadge` asked for `secondary.main`, and `secondary` in this palette is the mascot's **body** —
the theme says so beside it, "not a second accent" — which in dark mode is the exact value
`background.default` takes. A fill colour used as a foreground.

Two accents and a neutral now. A type is the quietest of the three kinds, so it reads as the
absence of an accent rather than as a third one the palette does not have. The other half of the
fix is the ramp: `main` is tuned to sit _under_ `contrastText`, and as 11px bold text on the page
it was the wrong end — `fn` measured 3.19:1 in **light** mode, under the 4.5:1 that size needs, a
second failure nobody had reported. Light mode takes `dark` and dark mode takes `light` now, which
is the pair MUI ships for this. All six badge/mode combinations measure 5.7:1 or better.

The `opacity: 0.9` went too: it multiplies whatever contrast was just measured, and a badge this
small has none to spare.

`playground-smoke`'s `--theme dark` was also testing `backgroundColor === 'rgb(0, 0, 0)'`, which
no longer describes anything — dark mode is `#0f172a`. It compares luminance now and fails loudly
if the toggle does not land, so the one switch that would surface this class of bug stops silently
reporting every page as light.

### Added — `umbra/solid` and `umbra/vanilla` chapters in `API.md`

The generated reference grew two bindings; the handwritten one still opened with "every snippet
below imports from one of two specifiers". Both now describe four.

The two chapters are shaped by what each binding actually is. **`umbra/solid`** is short on
purpose: the hook bindings share a surface deliberately, so the page says so once and documents
only what differs — the live values are getters (with the destructuring trap spelled out, because
it is the one that bites), `portal: true` returns `Modal: null`, `useLookup` returns an accessor
because `ModalInfo` is a discriminated union, and `fromStore` is the adapter React does not need.
**`umbra/vanilla`** is long, because it is the one chapter that cannot be read as a delta: it does
not render, so `render`, `Modal` and the outlet have no counterpart, and `bindDialog`,
`DialogController`, `bindAction` and the `subscribe`/`getSnapshot` pair are documented in full.

Also: `Reading a store` now names Solid's adapter and the no-framework case beside React's
`useSyncExternalStore`, and every internal anchor in `API.md` and `README.md` was checked to
resolve against a real heading.

### Added — `umbra/solid` and `umbra/vanilla` in the generated `/api` reference

The reference documented two of four entry points. The blocker was recorded rather than fixed:
the projection keyed every declaration by bare symbol name, and three bindings deliberately
export the same words — `useModal`, `UseModalOptions`, `DialogManagerSnapshot` — so a third
entry point collided silently and showed one binding's signature under another's specifier.

Keyed by `specifier#name` now, and two things that were not obvious came out of doing it:

- **A shared type is one reflection.** `ModalHandle`, `ActionOptions`, `SlideDirection` and the
  rest of the framework-free vocabulary are named by every binding but declared once, so typedoc
  materialises them under the first entry point that names them and emits references from the
  others — which the kind filter drops. `declarationFor` falls back to that single declaration,
  and only when exactly one exists: two declarations of a name are two different types, and
  picking one is precisely the failure this rename exists to prevent.
- **Cross-references resolve against the category table, not the declaration.** A link out of the
  Solid chapter lands in the Solid chapter — `UseModalOptions` to Solid's page, `ModalPhase` in
  the same signature to the core's — whichever module typedoc happened to walk first.

Six new category pages (Solid's `useModal`, templates, actions and manager; vanilla's
`bindDialog` and actions), the index grown from two entry-point sections to four with a blurb
each, start-here rows qualified by specifier because three of them are called `useModal`, and
search results carrying theirs for the same reason.

Asserted in a browser rather than assumed: Solid's `useModal` page prints `JSX.Element` and
never `ReactNode`, React's prints `ReactNode`, the vanilla page advertises no `render` callback,
and a `UseModalOptions` link on a Solid page resolves to a Solid page while a core type on the
same page resolves to the core's.

### Changed — a core terminology pass, and the vocabulary written down

A third naming sweep over the framework-free core. Two of the four findings are the previous two
passes finishing their own work, which is the argument for writing the rules down rather than
re-deriving them: `src/CLAUDE.md` now opens with a **vocabulary table**, so the next pass has
something to check against instead of a memory of what was decided.

**`modalType` → `template`**, and it was a word contradicting itself. `data-modal-type` on the
element is `'modal' | 'non-modal'` — the variant, the library's, two values. `ModalInfo.modalType`
was a free-form label the library carries and never reads, and it defaults to `'modal'`. So a
`nonModal: true` dialog naming no template registered `modalType: 'modal'` while carrying
`data-modal-type="non-modal"`, and both were correct about different things. `template` is what
the field actually holds: `useMessageModal` reports `'message'`, `useSlideModal` `'slide'`, and a
template you write names itself. Renamed on `UseModalBaseOptions`, `RegisterOptions`,
`RegisteredModalInfo`, and both DOM event details — public, and breaking.

**`blocking` / `non-blocking` is gone.** 2026-08-08 removed it from a `getOpen()` filter argument
as "a third vocabulary for a distinction that already had two agreeing ones", and left it standing
in `hasBlockingOpen`, in both `ModalVariant` branch summaries, in `scroll-lock.ts`'s header, in a
story file, its harnesses, six test ids and four doc pages. A vocabulary retired in one place and
not the rest is a vocabulary that comes back. `blocking.story.tsx` → `modal-variant.story.tsx`;
the word survives only where it is a verb (a modal dialog blocks the page).

**`resolveOpen` → `finishPreparing`, `openSignal` → `prepareSignal`.** The `onOpen → prepare`
rename claimed the pair "teaches itself"; these two were the counterexample, and `openSignal` read
as a signal that fires on open when it is one that aborts on close. Named for the cause now, with
`prepareController` behind them. Internal — neither is on the `RegisteredStore` port, so no
binding author is affected.

**`dismissKeyIsOwnedByAction` deleted.** Unreachable: nothing imported it but its own test, while
`attach-keydown.ts` asked the same question through `engine.ownsHotkey`. Three names for one
question, one of them dead. `action-engine.test.ts` already pins the label-comparison behaviour
its test was covering.

Also in this pass, internal only: `resolveModalConfig` → `resolveModalOptions` (with
`UnresolvedModalOptions` / `ResolvedModalOptions` — "config" appeared in one file and "options"
everywhere else), `openSequence` → `syncOpenSequence` so the lifecycle pair reads as siblings and
does not shadow the manager's open counter, `ModalDomContext.dm` → `manager` (the one abbreviation
among `store` / `getDialog` / `modalId` / `phase`), `primaryProp` → `primaryProperty`,
`EngineSnapshot` → `ActionEngineSnapshot`, `FocusManagementOptions` → `FocusCoordinatorOptions`,
`RegistryEntry.openSeq` → `openSequence`, `toDefaultModalInfo` → `toUnregisteredModalInfo`,
`updateBodyOverflow` → `syncBodyScrollLock`.

Two deliberate non-renames, recorded so they are not re-opened. `DialogManagerSnapshot.openDialogs`
holds `RegisteredModalInfo` and so breaks the dialog/modal rule — applied consistently that rule
renames `DialogManager` itself, which is the package's front door, so the rule is written down and
the exception named rather than 59 public sites churned. And `ModalRenderArgs` / `BaseRenderContext`
stay two words for one shape: the alias is the seam `SlideModalRenderContext` intersects, "args" is
right for a callback parameter and "context" for what a template hands its render.

Comments naming things that no longer exist went with it — `useDialogLifecycle`, `useDialogKeydown`,
`useClickOutside`, `root-react-free.test.ts`, the action "marker" and its "config key", and a
`requestOpen(onOpened?)` still documented on the store in `src/CLAUDE.md`, which the rename to
`beginOpen` the day before had not reached.

534 tests, `yarn check`, `yarn verify:all` (the built `.d.ts` included — it caught a `modalType`
left in `verify-package.mjs`'s own fixture) and a playground build, which caught the other one: a
`{@link RegisteredModalInfo.template}` typedoc cannot resolve through an intersection, and the
`/api` plugin treats warnings as errors.

### Fixed — a `<dialog>`'s last fractional pixel, and the border that lived in it

Checkout's modal in the microfrontend demo was missing its right border. Only that one, in every
theme, in every browser session — which read as a bug in the React binding, and is not one.

A `<dialog>` keeps the UA's `fit-content`, so its box lands on a fraction of a pixel, and
`margin: auto` puts both edges off-pixel. The panel's 1px border occupies the box's _last_ pixel,
so whatever the compositor does with that trailing fraction it does to the border. The three
dialogs on that page measure 154.844px, 243.094px and 252.266px wide, keeping 16%, 91% and 73% of
their right border — the first reads as missing and the other two look fine. Identical markup and
identical computed styles: diffed open, property by property, across the dialog, the content
wrapper and the panel, the only differences were the colour from `--own` and the width with the
values derived from it.

Fixed where the border is: `.panel` is inset a pixel, so it ends inside the box's whole-pixel part
whatever the fraction. Documented where it will be met again — the `style` option's JSDoc and
`src/CLAUDE.md`'s styling surface — because every binding is exposed equally and the symptom
misleads twice over: the border is correct on the first draw and gone after, and toggling any
property in devtools brings it back.

Three earlier explanations were wrong and are recorded here so they are not re-tried: it is not
the identity `transform` the default animation leaves at rest (removing it changes nothing, and
writing `transform: 'none'` into the entrance keyframe would break the animation outright —
`scale(0.95) → none` snaps rather than interpolating); it is not the wrapper's `display: flex`
(flex, block and flow-root all produce the same 154.8438px); and it is not contrast, though that
was independently too low at 1.67:1 and is now 4.56:1.

### Added — `umbra/vanilla`, a third binding of a different kind

`binding.js` in the microfrontend demo was forty hand-written lines driving a `<dialog>` from the
manager, and it was the demo's way of saying a binding is cheap. Looked at squarely it was
evidence of a gap instead: the root exports **no** part of the modal state machine, so anyone
doing what it did had to hand-roll a store — and got a degraded dialog for it. No `opening` /
`closing` phases and therefore no animation at all, no `prepare` or `AbortSignal`, no dismiss key
beyond the native `cancel`, no click-outside or backdrop hit-testing, no focus handling, no
actions and so no loading state, error capture or hotkeys. Silently, in every case.

So the binding ships. `bindDialog({ id, dialog })` takes a `<dialog>` you wrote and drives its
whole lifecycle — the same calls into `core/` that `umbra/react` and `umbra/solid` make, in the
same order. Nothing in it is a new decision; it is ~250 lines of wiring, which is the architecture's
claim cashed by a consumer that is not a framework at all.

**It is deliberately not the hook bindings' surface**, and that is the interesting part. React and
Solid render a dialog _and_ its contents from a `render` callback; a vanilla binding that did the
same would have to ship a renderer, which is the one thing this library refuses to do. So it has no
`render`, no `Modal` and no outlet, and it gains `bindAction(button, reason)` — which attaches the
handler _and_ keeps `disabled`, `data-loading` and `aria-busy` in step, the half a renderer does
elsewhere. Its unbind retires the action's declaration, which is the controller's answer to React's
render pass and Solid's `onCleanup`.

Two smaller consequences worth naming. There is no context to read a manager from, so an isolated
instance is _passed_ (`manager`) rather than provided — the vanilla answer to
`DialogManagerProvider`. And the store is its own clock: attachments rebuild when the phase or
`isPreparing` changes, which is safe here precisely because there is no commit timing to race with.

`binding-parity.test.ts` learned that there are two **kinds** of binding: the hook pair must mirror
each other down to the file names, while the controller is asserted separately — it must export
`bindDialog`, and must **not** export `useModal`, `ModalOutlet` or the template hooks, so "fixing
the inconsistency" fails loudly. `entry-isolation.test.ts` and `verify:package` both assert that
`./vanilla` reaches no framework at all, in the source graph and in the built artifact.

The microfrontend demo is now one microfrontend per binding — Checkout on React, Support on Solid,
Billing on vanilla over the `<dialog>` in `host.html`. `binding.js` is `log.js` now, holding only
the log helper: the argument that a binding is cheap is better made by one you can install than by
one you have to copy.

### Added — `umbra/solid`, a second binding, and the answer to what a binding actually is

The claim "React is one binding, not the library" was a comment with a test behind it. It is now
two bindings with the same surface: same hook names, same options object, same return shape, same
typed close. A team running both frameworks writes the same modal twice with the same words.

Two differences, and both are the renderer's rather than a choice. Solid's live values
(`isVisible`, `isPreparing`, `hasRunningAction`, `error`) are **getters over signals**, so
`modal.isVisible` reads identically but subscribes one expression instead of re-rendering a
component — which means **do not destructure the render args**, exactly as you would not
destructure props anywhere else in Solid. And `portal: true` mounts the dialog itself, leaving
`Modal` as `null`: React's `createPortal` returns a node you still have to render, while a Solid
modal owns its element.

Solid is an optional peer, on the same terms React is. `fromStore` ships with it — six lines
bridging the library's `subscribe`/`getSnapshot` contract into a signal, public because the
alternative is every Solid app writing it.

### Changed — what moved out of the renderers and into the core

Writing the second binding is what settled the question the first one could only assert. The test
turned out to be mechanical: **if adding something to one binding would mean adding it to the
other, it is core.** By that measure the following were never React's, and had to move before
`umbra/solid` could exist without copying them:

- **The DOM wiring**, as `attach*` functions returning their own teardown: `openSequence` /
  `syncCloseSequence`, `attachDialogKeydown` / `attachDialogCancel` / `attachWindowDismissKey`,
  `attachClickOutside`, and `createFocusCoordinator`. The four hooks in `src/hooks/` are now
  ~20-line wrappers that call them from `useEffect`; Solid calls the same functions from
  `createEffect` + `onCleanup`. The bodies moved unchanged, which is why the existing component
  suite was the proof the extraction changed nothing.
- **The action factory** (`core/action-factory.ts`). Its three live fields are getters, and that
  is what lets one factory serve both: a virtual-DOM renderer spreads the object during render and
  reads them once — the snapshot it wanted — while a fine-grained one spreads it inside a tracking
  scope and subscribes each attribute individually. Nothing is duplicated, and neither binding is
  compromised.
- **The `<dialog>`'s attributes and the backdrop-click test** (`core/dialog-props.ts`). Two
  bindings answering "is `data-modal-type` called that" separately is how a documented styling
  contract quietly becomes two.
- **The slide panel's geometry** (`templates/slide-geometry.ts`) and the default modal animation.
  Which edge a drawer is pinned to is not renderer work, and two `useSlideModal`s that disagreed
  about it would be two templates wearing one name.

### Fixed — the root's published types no longer require `@types/react`

`dialogPlacement` is a root export, and `dist/esm/core/placement.d.ts` opened with
`import type { CSSProperties } from 'react'`. Type-only, so the React-freedom guard passed by
design — and it walks _runtime_ imports, which is the right thing for it to walk. But the promise
`peerDependenciesMeta` makes is about resolving the package, and a Solid-only consumer reading
`DialogPlacement` needed React's types in their tree to do it.

The fix is `DialogStyle` (`core/style.ts`): a mapped type over the `string`-valued keys of the
DOM's own `CSSStyleDeclaration`, so the property list grows with the platform rather than with an
edit here. React's `CSSProperties` is assignable to it, which is what lets
`getDialogAnimationStyles<TStyle extends DialogStyle>` take a binding's own style type and hand
back an intersection React's `style` prop accepts with no assertion. `applyStyle` ships beside it
— the one way to write a style object onto an element, clearing what the previous one set, for a
binding that owns its DOM node instead of describing it.

`core/types.ts` became generic over exactly two things, because exactly two differ between
frameworks: the style type and the node type. `react/types.ts` and `solid/types.ts` pin them and
re-export the four resulting types under their ordinary names, so no consumer sees a type
parameter.

### Added — `engine.undeclare`, and the bug it exists for

Actions are declared by being rendered, and React expires a declaration by re-running `render`
wholesale. Solid never re-runs the parent: a button removed by its own `<Show>` has to retire its
own declaration, which the Solid factory does from `onCleanup`. Without it the consequence is
worse than a stale hotkey — `hasActions()` decides whether a backdrop click dismisses, so a modal
that had drawn its last action would silently stay opt-in. Pinned by a Solid component test that
toggles the only action away and asserts backdrop dismissal comes back.

### Changed — the microfrontend demo is three microfrontends, across three frameworks

Checkout (React) asks Billing (no binding at all) to approve a charge; over the limit Billing
refuses _and_ hands the refusal to Support (Solid), which opens a ticket and answers back. One
request crossing three frameworks in a single trip, with typed payloads travelling home, because
what the three share is the manager and not the renderer.

The host's import map went from three names pointing at one file to eight naming the package's
real specifiers — `umbra`, `umbra/react`, `umbra/solid`, `react`, `solid-js` and friends. They are
one rolldown build, not eight: code-splitting hoists everything shared, the manager included, into
a chunk each entry imports. Separate builds would give separate registries, which is the failure
the demo exists to rule out.

### Changed — `root-react-free.test.ts` is now `entry-isolation.test.ts`

It asserts more than it did. The root reaches no framework; `./react` reaches React and **not**
Solid; `./solid` reaches Solid and **not** React. That last pair is the new guarantee — without
it, installing one binding's peer could quietly become a condition for using the other.
`verify:package` makes the same three assertions against the built artifact.

### Changed — the React binding lives in `src/react/`, and the folder names stop lying

Adding a second binding made the first one's filing visible: `useModal`, the outlet, the provider,
the manager hooks and both templates were React-only files sitting in `core/`, `manager/` and
`templates/` — folders whose names are the architecture's documentation. They moved, along with
their tests, so `react/` and `solid/` now mirror each other file for file. No behaviour changed;
the 478 tests and `verify:all` are the proof.

Doing the move is what surfaced the rest of the friction, which was the point of doing it:

- **`story-styles.ts` was in `core/__tests__/`** and imported by four folders' stories. A shared
  harness helper belongs to none of them — it is `src/__tests__/story-styles.ts` now.
- **The playground reached into the library's tests with `../../../../../src/…`**, fifty-odd times
  across two files, and broke on the first move that came along. They go through the `umbra/*`
  alias now (`umbra/react/__tests__/use-modal.story`), which the playground already had for
  everything else, so the next move inside `src/` is a one-line change instead of fifty.
  `playground/tsconfig.json`'s `include` had two stale story globs for the same reason.
- **`react/hooks/` has no Solid counterpart**, and will not get one: its four files are
  `useEffect(() => attachX(…), [deps])` and nothing else, because `createEffect` reads its
  dependencies rather than being told them. That is React's cost, not a missing abstraction, and
  it is now written down rather than rediscovered.
- **A test stays next to what it tests, whatever framework its harness uses.**
  `core/__tests__/apply-style.ct.tsx` drives a core function through React and belongs where it
  is; so do the manager's and the action engine's CT tests. Only tests of a binding's own surface
  moved.

`src/templates/` now holds two framework-free files (`shared.ts`, `slide-geometry.ts`). Folding it
into `core/` was considered and declined: "template" is vocabulary a reader of this library
already has, and `core/` is not improved by absorbing it.

### Fixed — `umbra/solid` looked like it was missing a slide modal, and the folders were why

It exported `useSlideModal` all along. What it did not have was a file called `use-slide-modal`
next to `modal-outlet`, because both templates sat in a combined `templates.ts` — and the honest
reading of that folder was "Solid does not have one". The same was true of `useLookup`, folded
into `use-dialog-manager.ts`.

Both are split out, and the two bindings now mirror each other file for file. The rule is enforced
rather than remembered: `__tests__/binding-parity.test.ts` diffs the two entry points' export
**names** and their module **paths**, so a hook added to one and forgotten on the other fails, and
so does putting it at a different depth. One asymmetry is allowlisted, with its reason:
`fromStore`, which React does not need because `useSyncExternalStore` takes the library's store
contract unadapted.

### Changed — a `templates/` folder in each binding, and no `hooks/` folder in either

`useMessageModal` and `useSlideModal` are built _on_ `useModal`, not peers of it, and the
framework-free half of them already lived in `src/templates/`. They now sit in
`react/templates/` and `solid/templates/`, which says both things.

React's four internal effect hooks are gone the other way — inlined into `react/use-modal.tsx`.
Their whole content was a dependency array, and a folder holding `use-click-outside.ts` reads as a
feature list Solid is missing, which is exactly how it was read. The three dismiss-key listeners
collapsed into the single effect Solid already used, since they shared a dependency list to the
letter. Both bindings now wire the same `attach*` functions inline, in the same order.

### Changed — the duplication between the two bindings, measured and removed

`core/modal-runtime.ts` takes the parts that were written twice and were identical both times:
`resolveModalConfig` (the defaults **and** the variant narrowing — reading `dismissOnBackdropClick`
without checking `nonModal` first is a type error in the core and a silently-ignored option in a
binding that got it wrong), `createModalRuntime` (store, engine, `open`, `openAndWait`, `handle`),
`shouldDismissOnBackdropClick` (the whole four-step chain), and `teardownModal`.

`animation` is deliberately not resolved there: its fallback is a concrete literal that a function
generic over the binding's style type cannot return, so each binding keeps the one annotated line —
which is also where the comment explaining the annotation belongs.

What is left in each `use-modal` is renderer work: create a node, schedule an effect, bridge a
store to whatever that framework calls reactive. The two files are ~390 and ~360 lines and no
longer share a decision between them.

### Added — unit tests for the framework-free logic that only React had ever exercised

Coverage of the unit project read 43%, and the number was mostly an artifact — type-only modules
and component-tested bindings counted as zero. Under it were three real gaps, all of them core
logic both bindings now depend on:

- **`actions/action-engine.ts`** had no unit test at all. Everything it does was reached through a
  React component test, a browser and a render pass away from the question. It is a store and a
  handler runner with no DOM in it: the declaration window, `undeclare`, the hotkey table
  (including that `ownsHotkey` compares _labels_, so `'Shift+s'` and `'Shift+S'` are one hotkey),
  the aggregation and the error capture are all decidable in Node. 81% → 99%.
- **`core/action-factory.ts`** likewise. The design under test is the `readState` parameter: the
  factory reads engine state through a callback the binding supplies, which is what lets React
  hand it a snapshot and Solid a signal. Asserted with neither framework present.
- **`templates/shared.ts`** — the two rules that fail silently in one direction only: a caller's
  structural style merges _over_ the template's (a replace would unposition a drawer that only
  asked to be 380px wide) while a caller's animation replaces it outright.

Solid's own suite grew from 11 to 15: the slide and message templates, and the manager hooks. The
slide test is the interesting one — `useSlideModal` composes its context with `mergeProps`, and a
spread would hand the template a frozen copy where `isPreparing` goes in and never comes back.

Three test helpers moved to `src/__tests__/` on the way (`fake-frames`, `fake-events`,
`story-styles`): each was private to one file and needed by another, and a second copy of a fake
that forgot `metaKey` would make a hotkey look like it matched.

### Fixed — the logger stopped warning where there is no `localStorage`

Every log call read `globalThis.localStorage`, and Node answers that with `undefined` **and** an
`ExperimentalWarning` unless started with `--localstorage-file`. Nothing throws, so the existing
`try`/`catch` could not quiet it — the unit suite printed it once per worker, and so would a
worker, an SSR render or any Node consumer of the root.

`localStorage` is a `Window` API, so the fix is to ask whether there is a window at all — in a way
that never touches the getter — and cache the answer. Reading the pattern per call is kept, which
is what makes setting the key in devtools take effect without a reload.

### Changed — the coverage exclude list says what the unit project can reach

It still named four files deleted months ago. Now it is three deliberate groups: type-only modules
(no runtime, 0% forever), both bindings and the entry barrels (component-tested, globbed), and the
DOM-only core modules — those **listed one by one**, so a new module in `core/` is not silently
excluded but shows up as a gap until someone decides which kind it is. 43% → 94%, and every file
still under 100% is a DOM branch the component suite covers.

### Known gap — the generated API reference covers `umbra` and `umbra/react` only

The playground's `/api` projection keys declarations by bare symbol name, and the two bindings
deliberately export the same names, so a third entry point would collide silently and print one
binding's signature under the other's specifier. The plugin now passes its own `--entryPoints`
rather than taking typedoc's, so the omission is deliberate and visible rather than a silent
mis-render. Documenting `umbra/solid` there needs the model keyed by `specifier:name` first, which
reaches the category table, the anchors and the search index.

## 2026-08-08

### Added — `openAndWait()`, because the call order was load-bearing and undocumented

`waitForClose()` waits for the **next** close, by design: replaying a previous one would be a
wrong answer rather than a late one. The consequence nobody had written down is that
`await open()` followed by `waitForClose()` can lose the only close there is — `prepare` opens
the window, a dismissal lands inside it, and `finalize` flushes the open resolvers defensively so
`open()` returns as though nothing happened. The next line then waits forever. No error, no
timeout, no log.

Both halves are pinned by tests written before the fix, in a real browser: one asserts
`openAndWait` settles when the close lands during `prepare`, and one asserts that the old pair
does **not** — a guard that only checked the good case would pass over the very bug it exists
for. Every playground example moved across, and `types.ts`'s own `@example` was teaching the
losing order.

### Removed — breaking: `waitForClose()`

It went with the migration, and the count is the argument: every one of its call sites used the
losing order, and after the sweep it had none left. An API whose correct use is a rule the docs
have to state, and which nothing in the repo used correctly, is a trap with a happy path rather
than a primitive.

Nothing it did is gone. `openAndWait()` covers opening and awaiting; `onClose` covers observing a
close you are not causing, as a callback, with no ordering question at all; and
`requestOpenAndWait().closed` covers awaiting a dialog you do not own. `addCloseResolver` stays on
the store, internal — which is the point: the surface no longer lets a caller choose the order.

**`WaitForCloseResult` is renamed `AwaitedClose`.** It named a method that no longer exists, and
it is now returned by two different things (`openAndWait`, and `OpenRequestOutcome.closed`), so it
is named for what it is rather than for who hands it back.

### Added — `requestOpenAndWait`: the ask, and the answer

`requestOpen` told the owner and walked away. Across an ownership boundary that is a dead end:
the microfrontend demo below refuses a payment over its limit, and until now the microfrontend
that asked had no way to tell its user why nothing happened.

- **`request.refuse(reason)`** on the handler's envelope. Refusal is explicit; acceptance is the
  default. The manager cannot infer acceptance — the React binding's open is asynchronous, so a
  phase read when the handler returns would report a successful accept as a refusal.
- **`requestOpenAndWait(id, request)`** returns an `OpenRequestOutcome`: `{ accepted: false,
reason }`, or `{ accepted: true, closed }` where `closed` resolves like `waitForClose()`. Two
  questions with two lifetimes — the decision settles in milliseconds, the close when the user is
  done — so the decision _carries_ the close rather than being folded into it. Awaiting the second
  half is opt-in.
- The two declines the manager makes itself are reasons now (`'not-registered'`,
  `'accepts-none'`) instead of console warnings only, which was the original complaint the warns
  were a half-answer to.
- **`onOpenRequest` may be `async`**, and the manager awaits it, so an owner that validates
  against a server can still refuse before the caller is told anything.
- `requestOpen` is unchanged and still returns nothing: adding the reporting door cost no
  existing call site a `void`.

`OpenRequestDispatch` is `OpenRequest & { refuse }` — what a caller builds and what a handler
receives are genuinely different shapes, so one derives from the other rather than copying it.
`useModal`'s `onOpenRequest` option now _is_ `OpenRequestHandler` instead of restating its
signature, which is how it silently kept the old one through this change.

`RegisteredStore` — the manager's port — gained `addCloseResolver`, erased at `unknown`: a
callback in a parameter position is checked contravariantly, the same trap `runOnClose` exists to
avoid, and the registry is keyed by string so `unknown` is the honest type anyway. The vanilla
binding in the microfrontend demo implements it in six lines, which is the whole cost of the port
growing.

### Changed — breaking: one act, one word

A terminology pass, mechanical rather than by eye. Four names were doing a job another name
already had.

- **`store.requestOpen` → `beginOpen`.** The deepest one, and it made a documented claim read as
  a contradiction: `dialogManager.open(id)` is _unconditional_, and its body called a method
  named `requestOpen` on its own store. Two different acts wore one verb — the store's is a state
  transition nothing can refuse, the manager's asks an owner who may. The manager keeps
  `requestOpen`, because that one really is a request. `RegisteredStore.beginOpen` is a breaking
  change for a binding author; the vanilla binding in the microfrontend demo is the one-line
  proof of what it costs.
- **`lookup().getOpen('blocking' | 'non-blocking')` → `('modal' | 'non-modal')`.** A third
  vocabulary for a distinction that already had two agreeing ones — the `nonModal` option and the
  `data-modal-type` attribute — hiding in a single filter argument.
- **`decline` → `refuse`** throughout the prose. The method is `refuse`; `decline` was a synonym
  describing the same act in twelve places. The exception is deliberate and now says so in the
  code: Billing's **Decline** button is a _user_ turning down a charge, which is not a dialog
  refusing to open, and collapsing the two would hide the difference the demo exists to show.
- **`open-await*` → `open-and-wait*`** across four story files and their harnesses, sample keys
  and page entries. Two naming schemes had grown for one method.
- **The aggregate is `hasRunningAction` internally too.** It had three names for one concept —
  `isRunning` in the engine, `isActionRunning` in the dismiss gate, `hasRunningAction` on the
  public surface — and the collision was worst where it mattered: in the action factory,
  `state.isRunning` (this action) and `actionSnap.isRunning` (any action) sat on adjacent lines,
  spelled identically, meaning opposite things. `ActionState.isRunning` keeps its name, and the
  type now says why: the object it hangs on states the scope, while a bare flag has to state its
  own.

Also audited and clean: no unreferenced code samples, no unmounted harnesses, no uncategorised
public exports, no docs pointing at files that moved.

### Removed — breaking: `loading` on an action's props

`action.dom()` shipped earlier today as the door for bare `<button>` markup, and was gone by the
evening. One question settled it: **the core is agnostic of the UI put into it.** Under that,
`loading` was never the awkward-but-necessary member of `ActionButtonProps` — it was the only
field that broke the rule. It is a prop name borrowed from one family of component libraries. MUI
and Mantine say `loading`; another design system says `busy` or `pending`; a headless one has no
such prop and wants you to render the spinner yourself. The library was guessing a name it has no
way to know.

So the guess is gone. `ActionButtonProps` is now **entirely DOM props**, and with nothing left to
distinguish, `action.dom()` went with it — one door again. The running state travels as
`data-loading`, which was already there: CSS reaches it with `[data-loading='true']`, and a
wrapper reads it as a boolean and maps it to whatever its own system calls that. That one line
lives in `MuiButton` and `VanillaButton` in the playground, which is the point — the mapping
belongs in the only place that knows the answer.

The honest cost: someone spreading `{...action('ok')}` straight onto MUI's `<Button>` with no
wrapper loses the spinner, and nothing says so. That silence was the argument for keeping
`loading`, and it does not go away — it is the price of a core that ships no UI opinions, paid
once per codebase rather than at every call site.

`VanillaButton` also stopped dropping `data-focus-on-open`: it destructured a fixed prop list and
never forwarded it, so `focusOnOpen` did nothing through that wrapper. The test asserts both
halves now — nothing React refuses on an element may reach it, **and** nothing else may be
missing, because a guard that only checks the first is how a trimmed set disables the hotkey and
the opening focus in silence.

Every documented snippet that spread an action onto a bare `<button>` was already correct as a
result: there is one spread again, and it fits everywhere.

### Changed — the payload crosses in both directions, and neither side trusts it

`requestOpen`'s payload was always `unknown` on arrival. The answer coming back is too, and the
examples now say so: Billing closes with `{ transactionId, amount }` rather than a bare reason,
and Checkout runs it through its own guard before believing a word of it — the same check the
owner ran on the way in. The playground's `open-request` example pairs a parse-or-null for the
request with a `data is ArchiveReceipt` predicate for the response, so one `if` narrows it for the
rest of the block.

A binding's own `close(reason, data)` is the door that can carry one. `dialogManager.close(id,
reason)` still cannot, and still should not: the registry is keyed by string and knows no modal's
`TData`.

### Added — a microfrontend demo that is not staged

`/advanced` gains a **Microfrontends** section: an iframe over `public/mfe/host.html`, a page
this app does not build. Plain HTML, an import map, two `<script type="module">`, no bundler.
That constraint is the demonstration — a build step that resolved `umbra` for both sides would
have proved nothing about the import map.

- **Checkout** is React (`createRoot`, `useState`, `useModal`) and owns `checkout:receipt`.
  **Billing** is plain JavaScript, owns `billing:confirm`, and binds its own `<dialog>` to the
  store engine in about forty lines — `public/mfe/binding.js`, a second binding written to show
  what one costs when nothing about the job is React's.
- Neither imports the other. Each asks the other with `requestOpen`, and the owner decides:
  above Billing's stated limit the request is refused and nothing moves — no flash, no
  open/close pair for anything watching.
- `dialogManager` is a module-level singleton, so the import map naming `umbra` once is the
  whole mechanism. Two bundles would be two registries and the requests would find nothing.
  `vite-plugins/mfe-umbra.ts` bundles `mfe-src/shared.ts` with rolldown into that one module —
  minified, but still React's development build, because its warnings are part of what the demo
  teaches.
- Each microfrontend has a colour, and the dialog it renders wears it: Billing can ask for
  Checkout's receipt, and the modal that appears still looks like Checkout's. A dialog belongs
  to whoever registered it, not to whoever asked.

Two things the demo settles that a screenshot would not. The `<dialog>` a caller styles from a
stylesheet comes out **invisible**, because the library writes `background: transparent;
border: none; padding: 0` inline on the element it owns — headless-first means the box is
yours to fill, and the surface belongs on the content inside `render`. And an action's props
spread onto a bare `<button>` need `loading` destructured off first: it is the one field React
will not forward to a DOM element.

### Added — `chrome-cdp`, a skill that answers "which rule won"

`.claude/skills/chrome-cdp/` drives a real Chrome over the DevTools protocol with no
dependencies. `dom-probe` reports **computed** values, and a computed value looks the same
whether your rule produced it or something outranked you — so `--probe css:<selector>` prints
every matching rule in cascade order with each property's winner marked and every loser
labelled with what beat it. It named the transparent-dialog cause above in one command, after
three sessions had rediscovered it by guessing.

## 2026-08-07

### Changed — breaking: the state vocabulary says what it means

Four names were carrying more than one meaning, and the cost was paid by whoever read them.

- **`isOpen` → `isVisible`.** It was `phase !== 'closed'`, so a dialog reported `isOpen: true`
  through its entire exit animation. The semantics were right — a trigger must not flash back
  while the panel is still sliding away — and the name was the lie. `isVisible` says what the
  flag actually answers; `phase` remains the finer question, and the doc now pairs them
  explicitly. Renamed on `UseModalReturn`, `ModalInfo` and `ModalLookup`, and in the test ids
  that mirrored it.
- **`isRunning` → `hasRunningAction`** on the render args and the hook return. Three flags
  describe "busy" at three scopes and none of them named its scope: an action's `loading` is that
  button, this one is the whole modal, and `isPreparing` is the `prepare` callback, which has
  nothing to do with actions. The per-action `ActionState.isRunning` keeps its name — the object
  it hangs on already says whose it is.
- **`OpenRequest.data` → `payload`, and the handler takes it first.**
  `onOpenRequest: (payload, { context }) => …`. Two reasons. `data` was the word for the payload
  _this_ modal declared and the type system checked (`CloseResult.data`); reusing it for whatever
  crossed an ownership boundary put two levels of trust behind one noun. And the payload is what a
  handler almost always wants, so it comes first, with the envelope behind it for the handlers
  that also care who is asking — the shape every message bus already uses.
- **`createOpenRequest(payload?, context?)`** builds that envelope. `requestOpen(id, { payload,
context })` still works; the builder exists because the call site is a boundary, which is the
  worst place to be remembering key names by hand — and because it is the one seam where a
  protocol field (a version, a correlation id) can appear without every caller being edited. It
  validates nothing and cannot: only the receiving dialog knows what a good payload looks like.

`open()` is untouched and stays. A verb and a state can share a root without lying — `open()` is
an instruction, `isVisible` is an observation — and the DOM vocabulary it mirrors (`show()`,
the `open` attribute) is the one a reader already knows.

### Changed — the DOM events say why they exist

`modal:open` / `modal:close` were sold as "integrate with analytics without importing React",
which `dialogManager.subscribe` also does, since the root has never needed React. Sold that way
they read as duplication. The actual reason is reach: `subscribe` binds to one manager instance,
while these are dispatched on `document` and are heard across a **different copy of the library**
in another bundle. That makes them the observation half of what `requestOpen` opens on the way
in — a shell can ask a dialog it does not own to open and watch what came of it, with neither
side sharing a module. Inside one app, `subscribe` is still the better tool, and the docs now say
so.

### Added — `requestOpen`: an open a dialog is allowed to refuse

`dialogManager.open(id)` is an instruction, and there was no other door. That is the right shape
for code that owns the dialog, and the wrong one for everything else — a shell, a deep link,
another microfrontend. It is worst against a **controlled** dialog, the shape most of a component
library's call sites take: `open` belongs to the component that renders it, so an instruction from
outside opens it for a moment and its own reconciliation puts it back. Measured in the single-spa
harness, that is a flash on screen, an open/close pair through `subscribe`, and a stack entry that
appears and vanishes for anything watching.

So there is a second door, and it asks:

- **`dialogManager.requestOpen(id, request)`** hands the request to the dialog and moves nothing
  itself. `request` is `{ data?: unknown, context?: { source?: string, … } }` — both halves crossed
  an ownership boundary, so both are untrusted and the receiver validates. That is the answer to
  the objection `close(id, reason)` raises against payloads: this one is not pretending to be
  typed.
- **`useModal({ onOpenRequest })`** is what makes a dialog reachable that way. Nothing opens by
  itself: accept by calling the modal's own `open()`, decline by returning.
- **A dialog that declares no handler declines**, and says so in the log. Not "opens anyway" — the
  request reached a dialog that never agreed to be opened from outside.
- **`open(id)` is untouched.** The two doors are separate on purpose, so this adds a capability
  without changing what a single existing call does — including a dialog's own `open()`, which
  never routes through its handler and therefore cannot ask itself in a loop.

`register(id, store, options?)` replaces the two trailing positional arguments with
`{ modalType?, nonModal?, onOpenRequest? }`. Internal — the binding calls it, not an application —
and a shape a third argument can grow into, which two more positionals could not.

### Fixed — the playground was measured, and it disagreed with itself

The playground is the public shop window (`francisdesjardins.ca/playground/dialog/`), and a pass
over it with a browser rather than a type-checker turned up defects no gate could see.

- **A contained dialog displaced its host's content instead of covering it.** The host the
  library renders was a `height: 100%` block _in the flow_, so it was laid out after whatever it
  was meant to slide over and pushed it out of a clipped region — measured at exactly the host's
  height. It is `position: absolute; inset: 0` now: same box, no place in the layout. Pinned by
  `contained-overlay.story.tsx`, whose first version passed and proved nothing until the harness
  was matched to the real condition (a sibling sized `height: 100%`).
- **Focus after a failed action went to the wrong button.** It returned to whichever button
  claimed the opening focus, even when the user had tabbed to a different action and run _that_
  one. The retry is under the hand of the button that was pressed, so that is where focus goes;
  the opening button is the fallback for an action run from the pointer. Two older tests encoded
  the previous rule and were rewritten rather than worked around.
- **A toast that took the focus it promised not to take.** The dialog focusing steps run on
  `show()`, not only on `showModal()` — measured: focus landed on the toast's Dismiss button
  within 50ms, while the example's own prose claimed a non-modal dialog never receives focus.
  The example now remembers where focus was and puts it back in `onOpen`, and says so.
- **The mascot did not hide all the way.** Its glow is painted well past its own box (`r=112` in
  a 200 viewBox, breathing to 1.035) and the exit rotates, so translating by exactly its size
  left the halo burning on the edge. It also fled from 140px away — reduced to 45px, because the
  joke only lands if you almost had it.
- **Four dialogs overflowed a 390px screen**, and the shell let them: `main` is a flex item, so
  its default `min-width: auto` let one unwrappable line stretch the whole page. `minWidth: 0`
  there means no future page can reproduce it.
- **The code block's background stopped where its scroll started** — the highlighter painted its
  own colour on the `<code>` while the container painted another, so scrolling a long line slid
  the code off its own surface.
- **Two demos failed a third of the time by design.** The hotkey card and both form cards ran
  through the 30%-failure mock; on cards whose subject is the keyboard and the markup, that
  teaches the wrong thing and made the smoke gate cry wolf. The random failures stay where they
  are the subject: the Delete card on Modal Actions.

### Changed — the playground as a shop window

- **A landing page at `/`**, which used to redirect straight into a card grid. It says what this
  is, how to get it (clone and read — the library is not published), links the repository, and
  opens one live modal whose focus starts on the button the action asked for. The brand in the
  top bar is the way back to it.
- **The Slide Modal Configurator is gone**, replaced by four preset shapes — drawer, sheet,
  palette, contained panel — each its own hook, each printing its own options on the panel it
  opens. One hook whose `direction` mutates between opens is a panel that leaves by one edge and
  returns by another; that was a demo artefact, and the shapes are what a reader came for. Each
  is a tile showing the edge it arrives from, because a row of buttons over a line of monospace
  reads as a status bar.
- **~2,000 lines cut** across five examples that taught nothing the rest did not (a 702-line
  pharmacy showcase, a 495-line Zod form, three smaller duplicates), and `zod` left the
  playground's dependencies with them. The end-to-end flow returns as a 170-line grocery list:
  panel → nested confirm → async action that fails → typed payload back.
- **The dead API vocabulary is gone from what a visitor reads.** `defineAction` was rendered
  _inside a live modal_; `useModalActions` and "controller" named a hook and a concept the
  library has not had since actions became declared by use — in page copy, in card descriptions,
  and in fourteen code-viewer keys.
- **`/stories` stays raw and says so.** The harnesses are test fixtures, deliberately unstyled,
  and dressing them up would be a promise the content does not keep; they are grouped by symptom
  now (focus, keyboard, dismissal, layering) rather than by symbol name, and seven that had never
  been reachable — including both of this week's features — are registered. Curated, styled demos
  live in the sections instead.
- **The corner toast pauses on focus as well as hover**, which is what WCAG 2.2.1 asks for once a
  toast carries anything actionable, and its doc says what changes when it does.
- **The result panel and the vanilla disabled button stopped being fuchsia** — both were literals
  left over from the palette before the mascot's, sitting inside amber borders. They derive from
  the palette now, so they cannot drift again.

### Changed — hooks give their DOM policy back to the core

`use-focus-management` had accumulated decisions that are not React's: which button claimed the
opening focus, who ran the action that just settled, where focus goes back, and what to do when
the answer refuses focus. They are `core/focus-policy.ts` now — four plain functions over a
`<dialog>` — and the hook is left with scheduling. A second binding (Solid is coming) calls the
same functions at its own moments instead of re-deriving them, which is the only way the two can
stay in agreement.

## 2026-08-06

### Fixed

- **Unregistering an open dialog now reports the close.** A modal whose component unmounts under it
  never calls `close()`, so the phase never reaches `'closed'` — and the subscription that emits on
  that transition is torn down in the same breath. Anything counting opens from the outside was
  left one open ahead for the life of the page: a coexistence bridge pushing onto a shared stack, a
  shell disabling its shortcuts while a modal is up, an overlay guard. Nothing on screen explained
  it, and nothing ever brought the count back down.

  `unregister` now emits `{ type: 'close' }` and dispatches `modal:close` when the store's phase is
  not `'closed'`, with `reason: 'dismiss'` — the same word the store gives a `waitForClose` caller
  torn down while open, because in both cases nobody answered. A dialog that closed before
  unmounting is unaffected: it was already reported, and a second close would put the same
  observers one _behind_.

  Found by a component suite going flaky rather than by reading: Playwright reuses the page between
  tests in a worker, so one test's leftover entry broke the next one's. That is the same page a
  user has.

### Added

- **`onOpen` is handed an `AbortSignal`** that fires when the modal closes, so work it started can
  be dropped when nobody is waiting for it any more. A dialog dismissed while it is still loading
  is the ordinary case, not an edge one: without this the request outlives the thing that asked for
  it, lands on a closed modal, and a slow one can still be in flight when the next open starts its
  own — which is how a reopened dialog ends up showing the previous attempt's answer. Additive: a
  `() => …` callback is assignable unchanged, so it costs nothing until a call site wants it.

  The controller lives on the **store**, not on the React binding. The three moments it turns on —
  an open starting, a close starting, a teardown — are the store's own transitions, so a second
  binding inherits the behaviour instead of re-deriving it, and it is unit-testable without a
  browser (four cases in `modal-store.test.ts`). The abort fires as the exit _begins_ rather than
  when it finishes: nobody is waiting for that request for the 200ms the animation takes.

### Changed

- **The close sequence moved out of the React effect** into `runCloseSequence` in
  `core/dialog-lifecycle.ts`. Which of three ways a dialog ends — already closed natively by the
  ESC cancel race, transitions disabled so `transitionend` will never fire, or animated — is a
  property of `<dialog>` and of the declared animation, not of React. A binding knows _when_ a
  modal entered `'closing'`; what happens next is now inherited rather than re-derived, guard
  against double-finishing included. `useDialogLifecycle` is 124 lines from 146.

### Changed (playground)

- **The theme is the mascot's.** `UmbraMoon` draws an eclipse — a dark slate body with the corona
  escaping around its rim in ambers — and the page around it was fuchsia, which read as two brands
  sharing a screen. Every palette value now comes from one of the five the mascot already uses
  (flame, flame edge, body, body edge, ink), so the two cannot drift. Dark mode sits on the
  mascot's own body colour rather than pure black: amber on `#000` is a warning label, amber on
  slate is dusk. `secondary` is the body rather than a second accent — an eclipse is one fire
  against one shadow, and a palette with two warm accents has nowhere left to put emphasis. The
  two vanilla templates that hard-coded the old accent follow.

### Added

- **The `dom-probe` skill** (`.claude/skills/dom-probe/`) — one script that drives installed Chrome
  through ordered steps and answers ordered questions about what the browser actually produced:
  what is under a point, what a click really hit, whether a dialog is in the top layer, what a box
  measures once transitions settle. It exists because "let me check in the browser" kept meaning
  writing, debugging and discarding a throwaway script, and because two of this project's worst
  diagnoses came from reasoning about rendering instead of measuring it.

### Fixed — a modal answered for the modals above it

Stacking is nested, not sibling: a dialog in the top layer swallows every click outside itself,
so the documented way to open a second modal is from inside the first one's `render` — and a
component used there brings its own `useModal` with it. The second `<dialog>` therefore renders
in the first one's subtree, and **every event raised in it bubbles through every modal
underneath**. Three defects followed from that, all found by building the stack the docs
describe (non-modal slide → modal → message modal) and driving it:

- **One Escape unwound the entire stack.** Each dialog's keydown listener saw the press as its
  own, so all three dismissed on a single key. A stack now unwinds one modal per press, front to
  back.
- **A hotkey fired at every level it passed.** With `Enter` declared on all three, acknowledging
  the message modal also ran the middle modal's save. A hotkey now only reaches the dialog it was
  raised in.
- **Hotkey dispatch could click a nested dialog's button.** `clickHotkeyButton` took the first
  `[aria-keyshortcuts]` match in document order, which is the inner dialog's when that one is
  rendered before the outer modal's own button — so pressing the outer modal's hotkey ran the
  inner panel's action. Reachable because a non-modal child blocks nothing: focus can be in the
  modal underneath it.

`utils/dialog-scope.ts` is the shared answer: `isOwnEventTarget` drops an event raised in a
nested dialog, `queryOwn` keeps a lookup inside the dialog's own content. Both are pinned by
red-first tests — `stacked-modals.story.tsx` and `nested-hotkey-scope.story.tsx`, with the
scoping removed to watch each one fail first.

The related race was already handled: the stack sorts by `openSeq`, a monotonic counter, because
two modals opened in one synchronous block land on the same `openedAt` millisecond. Verified,
not changed.

Two further hypotheses were **not** confirmed, and the tests written to chase them are kept
because a stack scenario nobody had covered is worth pinning either way:

- The browser's own `cancel` (the Escape path taken when focus is outside the dialog, which is
  ordinary) does not bubble, so it cannot unwind a nested stack the way `keydown` did.
- A modal restoring focus when its action settles cannot steal it from a modal opened over it:
  focusing an element outside the topmost top-layer dialog is a silent no-op, so the browser
  already refuses. A foreground guard written for this was reverted — it passed with and without,
  which makes it a change with no failing case behind it.

### Added — `focusOnOpen` on an action

`action('cancel', { focusOnOpen: true })` gives that button the modal's opening focus instead of
the first focusable element. `showModal()` focuses the first thing it finds, which for a form is
its first input — rarely what a confirmation dialog wants, and never what a destructive one
wants. It is also where focus returns after an action fails, since that is where the retry lives.

Carried as `data-focus-on-open` rather than React's `autoFocus`, because a probe settled what the
mechanism actually is: React 19 does **not** put the native `autofocus` attribute in the DOM, and
`showModal()`'s focusing steps read exactly that attribute — a `<button autoFocus>` inside a
dialog loses the focus to the first input. Emitting a lowercase `autofocus` prop instead is a
type error the moment the props are spread onto a `<button>`. So the library applies the focus
itself, once the dialog is open. Custom button wrappers must forward the attribute, exactly as
they must forward `aria-keyshortcuts`.

### Documentation (a full pass over what a reader is told)

- **`API.md` documented an API that no longer exists.** Three of its examples still passed
  `actions: state` into a hook and spread `state.confirm(…)` — the `useModalActions` design that
  went away when actions became declared by use. Anyone copying them got code that does not
  compile. They are now the `action` factory, with the reasons declared on the hook.
- **What the page never gained when the library did.** The render-args table listed two of the
  five fields (`action`, `isRunning` and `error` were missing, though a later section described
  them); the options table was missing `style`, `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy`,
  `role` and `modalType`, and still typed `onOpen` as `() => …` after it started receiving an
  `AbortSignal`; `ModalInfo` was missing `isPreparing`; the return was missing `dialogManager`.
  `dialogPlacement`, `createDialogManager`, `DialogManagerProvider` and `matchesHotkey` were
  exported and documented nowhere.
- **Wrong in a way a reader would trust**: `useMessageModal` was said to report
  `modalType: 'modal'` (it reports `'message'`), backdrop dismissal was said to default off "when
  `actions` are provided" (it keys off whether the render pass _drew_ any action), the
  `ModalOutlet` example rendered a nested `<dialog>` inside `render` — the library owns that
  element — and the `createStore` context example used `update((d) => { d.x = 1 })`, a draft API
  this store has never had.
- **The snippets were compiled before being believed.** Every example rewritten here was put
  through `tsc` in a scratch module against the real entry points, with a deliberate error added
  at the end to prove the file was actually being checked. Nothing type-checks a `.md`, so the
  check has to be staged.
- **Source JSDoc, which ships in the `.d.ts` and generates the playground's `/api` page**: the
  root entry point still advertised `useModalActions` twice, `ModalHandle` contrasted itself with
  it, and two dismissal docs cited an `actions.isRunning` that no longer exists. The template
  `@typeParam` docs still claimed `TData` is inferred "from `actions` … see `defineAction`".
- **The store docs described a folder that is not there.** `src/store/CLAUDE.md` and
  `src/CLAUDE.md` documented `useStore` / `createStoreContext` living in `src/store/react/`, with
  a runnable-looking import from it, and listed `watch` / `shallowEqual` as module exports. The
  module is `create-store.ts` and a barrel; those four are playground reference code. The root
  `CLAUDE.md` entry-point table advertised two of them on `umbra/react`.
- **Agent-facing docs too**: `.github/copilot-instructions.md` pointed at `src/store/watch.ts`,
  `src/store/mutex.ts` and `src/store/single-flight.ts` (all user-land now), described hotkeys as
  declared on `defineAction`, and claimed `CloseResult<void>` drops `data` "via conditional type"
  — the opposite of the decision the type model rests on. `.claude/commands/` and the playground's
  own instructions listed routes (`/modal-controller`, `/lab`) that no longer exist.
- `API.md` now says where it stands relative to the generated reference: `/api` is typedoc over
  the real entry points and cannot drift, so it wins on any disagreement; this file is the
  narrative one.

## 2026-08-05

### Added

- **`ModalInfo.isPreparing`** — `lookup(id)` and `useLookup(id)` now report whether a dialog's
  `onOpen` is still running, alongside `phase` and `isOpen`. The information already existed on the
  modal's own store and the manager already subscribed to it; it simply stopped at the boundary, so
  the only code that could see it was the code rendering the dialog.

  What made that a gap rather than an omission: **`phase` cannot answer "is it ready".** It
  describes the `<dialog>` element, and reaches `'open'` on the animation frame after the dialog is
  shown — so `'opening'` is one frame wide however long the modal actually takes to prepare, and a
  watcher polling `phase` gets `'open'` immediately every time. That asymmetry is easy to read as a
  bug (`'closing'` is held for the whole exit animation, so it looks like the only transient state
  there is) and it is not one: preparation is a second axis, not a phase.

  It matters most exactly where the manager is supposed to earn its keep — something elsewhere in
  the app deciding whether to let an action through while a dialog it does not own is up. That
  watcher could see "open" and not "not ready yet". Now it can see both.

  Additive for anyone reading a `ModalInfo`; only code that _constructs_ one (the library itself)
  had to change. Pinned by two cases in `use-lookup.ct.tsx`, including a modal closed while still
  preparing, which must not come back reporting itself ready.

### Fixed

- **A hotkey went dead once its action failed.** An action's button is `disabled` for as long as
  the action runs, so focus falls to `<body>` in the meantime. `useFocusManagement` restores it
  when the action settles — but it ran in the same tick the engine reported the failure, before
  React had re-rendered the button as enabled, and focusing a `disabled` element is a silent
  no-op. Focus stayed outside the dialog, where its `keydown` listener never hears anything, so
  the retry the error message invites could only be made with the mouse. The restore now waits a
  frame and checks that it landed, falling back to the dialog itself. Guarded by
  `action-error-hotkey-retry.story.tsx` and "the hotkey still fires on the retry" in
  `use-modal.ct.tsx`, which fails on the old timing.

### Changed (playground)

- **Cosmic Override wears the mascot's colours.** The neon purple-and-cyan wormhole is an
  eclipse: a dark slate body with the corona escaping around its rim, in `PeekingMoon`'s ambers,
  down to the `::backdrop` — which is now a corona ring rather than a starfield, still one
  selector keyed off `data-modal-id`. Both dialogs flare and contract on exit instead of spinning
  away, because that is how the thing they are named after ends, and the example's infinite
  animations now honour `prefers-reduced-motion` the way the mascot's do.
- **Neither dialog dismisses by accident any more.** The warp core declines
  `dismissOnBackdropClick` and the gate declines `dismissOnClickOutside`: the backdrop is the
  artwork here, and a non-modal gate that closes the moment you reach for the code viewer under
  it cannot be read alongside its own source. Escape, Abort and Close gate remain, and both
  options are still declared at the call site — the example shows the knob by setting it.

## 2026-08-04

### Changed (the store's React half moved out of its framework-free half)

- **`useStore` and `createStoreContext` now live in `src/store/react/`**, behind their own
  barrel. They import React; everything else under `src/store/` does not, and the package root
  must resolve with React absent.
- **This deletes a rule.** While the bindings sat beside the engine, the `../store` barrel
  re-exported them, so any core module importing that barrel pulled React into the root's import
  graph — the React-free property held only because Rollup tree-shook the re-exports back out.
  The workaround was a documented exception: import `../store/create-store` directly. That
  exception was already spreading (the docs said "one"; there were two), which is what a rule
  with no compile-time enforcement does. Now `../store` is safe for anyone to import and
  `dialog-manager.ts` and `action-engine.ts` use it like everything else.

### Changed — breaking (actions are declared by being rendered)

- **`useModalActions` and `defineAction` are gone.** An action now comes into existence at the
  point it is used: the `action` factory handed to `render` names the reason, binds the handler
  and returns the button props in one expression. There is no config object, no second hook, and
  nothing to pass into `useModal`.

  ```tsx
  useModal<User, 'submit' | 'cancel'>({
    id: 'create-user',
    render: ({ action }) => <button {...action('submit', save)}>Save</button>,
    onClose: (result) => result.reason, // 'submit' | 'cancel' | 'dismiss'
  });
  ```

- **Declare the reasons at every call site.** `TReason` defaults to `string` for the modal that
  wants no ceremony, but every call in this repo declares its union, because that is what buys
  the guarantees: `action('savee')` is rejected, the reason autocompletes, `handle.close` is
  constrained rather than taking any string, and a `switch` on `result.reason` in `onClose` is
  **exhaustive**. The last two the previous design could not do at all.
- **`'dismiss'` is accepted wherever a reason is.** The library produces it on Escape, backdrop
  click and teardown, and an action may legitimately be named it.
- **Deleted:** `actions/bridge.ts` in full — `ACTIONS_BRIDGE`, `ActionsBridge`, `ActionsGate`,
  `ActionsBinding` — plus `ActionDefinition`, the `ACTION_PAYLOAD` symbol, `ActionPayload`,
  `ActionKeys`, `UseModalActionsReturn`, and the registration effect in `useModal`. All of it
  existed to carry a controller built outside into the modal; built inside, there is nothing to
  carry. The engine (`actions/action-engine.ts`) is React-free and owns execution, state and the
  hotkey table.
- Actions are re-declared each render pass rather than accumulated, so the hotkey table describes
  the buttons on screen — a stale entry would go on suppressing the dismiss key.
- The close payload moves back onto the hook (`useModal<Result>`), there being no marker left to
  infer it from. Still declared once, in a different place.

### Fixed

- **A branch that could never run.** The pharmacy example compared
  `closeResult.reason === 'close-rx'` against an action named `closeRx`. A bare `string` reason
  hid the mismatch completely; declaring the union surfaced it immediately.

### Changed (the project has a name)

- **`@yourorg/dialog` is now `umbra`** — the total-shadow core of an eclipse, which is exactly
  what a modal backdrop casts over the page, and what `--dialog-backdrop` has always been. The
  React binding is `umbra/react`. Named to sit beside the sibling `stardust` project.
- **The docs no longer describe installing it.** There is no npm release and there will not be
  one; the README documents cloning the repo and lifting what you need. `prepublishOnly` became
  `verify:all`, since it validates rather than publishes.
- `repository`, `homepage` and `bugs` are set, and typedoc's `disableSources` is **off**, so the
  generated API reference links into real source lines.

### Added (a mascot)

- **`PeekingMoon`** — the playground's easter egg, a sibling to stardust's `PeekingStar` and
  built on the same timing model. A little eclipsed moon slides in from an edge, peeks for two
  minutes with the occasional giggle, waves, and withdraws.
  - It is **shy**: bring the pointer within 140px and it ducks out, then peeks back from the
    _other_ edge a few seconds later. This is the joke, and it is also why the mascot can never
    be in your way — reaching for anything underneath makes it leave.
  - Catch it anyway (click, or Enter while focused) and it **eclipses**: a diamond-ring flare,
    then the disc contracts into its own shadow and does not return. It does not spin off like a
    star; a moon does not cartwheel out of an eclipse.
  - It sits at `z-index: 1200`, below the `1300+` the manager assigns dialogs, and never takes
    the sidebar edge — a mascot that swallows navigation clicks is a bug wearing a costume.
  - The artwork is one inline SVG with its own keyframes, honouring reduced-motion. No binary
    assets.
- The glyph system that goes with it: `◐` in the README masthead and the playground top bar,
  `◐ ◑ ●` as section markers, and a shadow-falloff footer rule (`░ ▒ ▓ ● ▓ ▒ ░`) — the umbra
  profile the name refers to.

### Fixed (CI could not have caught what it was meant to)

- **The Playwright container tag is derived from `package.json`** instead of being written by
  hand. It had drifted to `v1.61.1` against a `1.62.1` dependency — precisely the mismatch the
  comment above it warned about. The install job now publishes the resolved version as an output
  and the container interpolates it, so bumping the dependency moves the image with it.
- **CI ran none of `verify:package`, `playground:build`, `docs:check` or `docs:examples`.** The
  build job now proves the artifact, and a new docs job runs typedoc with `treatWarningsAsErrors`
  plus the JSDoc example compiler. The playground build is what fails when a new public export
  has no category in the API reference.
- The `Stop` hook in `.claude/settings.json` hard-coded an absolute Windows path, so it could not
  work in any other clone.

### Removed (surface the library never used)

- **The async toolkit is no longer part of the package.** `safeAwait`, `createMutex`,
  `createSingleFlight` and the `AsyncState` machine (`asyncIdle` / `asyncPending` /
  `asyncFulfilled` / `asyncRejected` / `runAsync`) — 9 values and 6 types on the root — had
  **no consumer inside the library at all**; the only importer was the barrel re-exporting them.
  A dialog manager is not where anyone looks for a mutex, and every one of those names was a
  promise to version forever in exchange for nothing. They now live in
  `playground/src/shared/lib/`, demonstrated and copied on the same terms as the modal
  templates, with their tests moved alongside and still running. The built package drops from 45
  declaration files to 41 and the React-free root from 15 modules to 11.
- `normalizeError` stays on the root: it is the one helper in that family the library itself
  needs, since it produces the `Error` that `useModalActions` reports.
- They are listed on the **UI Templates** page under "Patterns the library does not ship",
  beside the modal templates, with `createImmerStore` and the `useQuery` stand-in — reference
  code is only reference code if it is reachable. `createImmerStore` had never been viewable
  there at all.
- **`store.setContext()` is gone.** Its only caller in the entire repo was its own unit test.
  Context is a builder concept — supplied at construction (`createStore(initial, builder,
{ context })`) or per subtree via `createStoreContext`, and read through `api.getContext()`.
  Removing the setter let `TContext` come off `Store` and `GenericStore`, where it had become a
  decorative type parameter, and off the builderless overload, where a `context` you passed
  could never be read by anything. `API.md` documented a `context` option on `UseStoreOptions`
  that never existed.

### Fixed (the static-host build had a broken jump bar)

- **Section links navigated to the index page instead of scrolling.** `SectionNav` emitted a bare
  `href="#stacking"`, which works under browser history but not under the hash-router build
  (`yarn playground:build:file`) — the one `deploy-playground.mjs` actually publishes. There the
  whole URL after `#` is the _route_, so `#stacking` replaced `#/advanced` wholesale and the
  router landed on `/getting-started`. The chips now navigate through the router, which emits
  `#/advanced#stacking` and scrolls to it — the same reason every link in the API reference is a
  `Link`. Deep links still survive a reload and are still shareable, in both builds.

### Fixed (a smoke probe that was checking nothing)

- **`playground-smoke` reported eight green routes after visiting one page eight times.** Pointed
  at a hash-router build, its path-based `goto` was served `index.html`, the router fell back to
  the index, and every per-route assertion — including "zero console errors" — was made against
  the same page. It now verifies it landed on the route it asked for, falls back to the hash
  form, and fails loudly if neither works. A duplicate-`<h1>` check across routes backstops it,
  a flow that cannot reach its page says so instead of timing out for 30 seconds, and one
  throwing flow no longer aborts the run.

### Changed (project commands)

- `store-engineer` documented `useStore(store, { context })`, which does not exist — `useStore`
  takes `{ select, equals }`, and injecting context from a component is deliberately impossible.
  Corrected to the three real injection points, and translated to English to match the repo.
- `add-example` gained the traps that make an example fail silently: the top-layer rule, unique
  modal ids, the accessible name, and that a payload declared on an action must not be restated
  on the hook.

### Fixed (the inference was real but undiscoverable)

- **`defineAction`'s doc pointed the wrong way.** It said declaring a payload was how you
  "require a modal that accepts it" — which reads as _annotate both_, and is the likeliest
  reason six call sites restated a payload the hook already infers. It now says what actually
  happens: the marker is the payload's one declaration, the modal picks it up through `actions`,
  and you annotate the modal only when nothing carries it (no `actions`, or an all-bare set whose
  payload travels through `handle.close`).
- The `@typeParam TData` lines on `useModal`, `useMessageModal` and `useSlideModal` said only
  "defaults to void" and were silent on where `TData` comes from. Since JSDoc on the public API
  _is_ the documentation, and `/api` is generated from it, these reach the reference with no
  playground change.
- **The README never showed a typed close payload at all** — no generic appeared anywhere in it.
  A short "Typed close payloads" section under Quick Start now shows the payload declared once on
  the action, inferred at the hook, and narrowed out of the `waitForClose` tuple.

## 2026-08-03

### Changed (the type model derives where it used to enumerate)

- **`TemplateCommonOptions` is now the complement of what a template owns, not a list of what it
  forwards.** It was a hand-maintained `Pick` of twelve key names, which meant an option added to
  `UseModalBaseOptions` reached the core hook and silently reached no template — with nothing to
  fail. It is now an `Omit` of the five keys a template genuinely does not inherit: `id`,
  `render` and `onClose`, which `TemplateBaseOptions` redeclares, plus `modalType` and
  `clipContainer`, which the template sets itself. The two forms are exactly equivalent today —
  the change is that the new one stays correct without being edited. Pinned both ways: the
  complement is asserted, and a `@ts-expect-error` on a write confirms `readonly` survived the
  derivation (assignability alone cannot see property modifiers).
- **The action callable's signature is stated once, as `ActionCallable<TData>`.** It was written
  out twice — in `UseModalActionsReturn`'s mapped type and again in the implementation that
  builds each callable — with nothing checking that the two agreed, because `useModalActions`
  assembles its result through a `Record<string | symbol, unknown>` and asserts the shape at the
  end. The implementation now annotates its callable with the same type the mapped type uses, so
  the assignment is _checked_ rather than asserted; a changed return or a narrowed parameter
  fails the build where it used to pass. `ActionCallable` is exported — it is the type a
  consumer writing a button wrapper wants to name.

### Added (the inference is pinned, so it can be relied on)

- **`useModal<Result>({ actions })` never needed the type argument**, and now there is a test
  saying so. The payload flows out of `defineAction<Result>()`, through `ActionPayload` and the
  covariant `ActionsBinding`, into `TData` — for `useModal`, `useMessageModal` and
  `useSlideModal` alike. `type-model.test.ts` asserts the inferred return of each is exactly
  `UseModalReturn<Result>`, and asserts the caveat that bounds it: an all-bare action set infers
  `never`, so a modal whose payload comes from `handle.close` must still declare it.
- **The `waitForClose` tuple's discrimination is pinned** — that narrowing `error` narrows
  `result` with it, which is the whole reason the happy path needs no null check.
- **`createStore`'s overload resolution is pinned** in `create-store.test.ts`, across all three
  instantiation forms.

### Fixed (documentation describing a hazard that does not exist)

- **The warned-about `createStore` "arity trap" was not real.** Two CLAUDE.md files and a
  five-line comment in the action engine held that `createStore<Snap, Methods>(initial, builder)`
  matches the generic `<TSnapshot, TContext>` overload by arity and silently binds
  `TContext = Methods`. It does not: a builder is a function, and a function shares no property
  with the all-optional `CreateStoreOptions`, so weak-type detection eliminates that overload
  before arity is consulted. Verified against the real factory, then pinned by the assertions
  above. The style advice (annotate the snapshot and the builder's return) stands on its own
  merits; the false mechanism is gone.

### Changed (playground)

- **Five examples stopped restating the payload they had already declared.** The form examples
  (vanilla, MUI, zod), the MUI wizard panel and the cosmic override each wrote their payload type
  twice — once on `defineAction`, once as an explicit argument to the modal hook. The second is
  now inferred, as it is in the action-logging story. The two library stories that keep theirs
  keep them for a reason: `data-message` has no actions at all, so inference has no source, and
  `reason-source`'s explicit argument _is_ the assertion under test — that a marker's declared
  payload is checked against the modal's.

### Added (a dialog can finally say what it is)

- **`ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy` and `role`** on `useModal` and every
  template. Nothing in the library — or in the templates, or in any example — gave a dialog an
  accessible name, so every one of them was announced as just "dialog". That is the single
  commonest defect in a dialog implementation, and the library could not fix it silently: only
  the caller knows what the dialog is. Absent options omit the attribute rather than writing an
  empty one, so an unnamed dialog stays visibly unnamed to an audit.
- `role` is `'dialog' | 'alertdialog'` and not the full ARIA surface on purpose. `alertdialog`
  is for a dialog that interrupts — a destructive confirm; anything that is _not_ a dialog wants
  a live region inside the element rather than a role that contradicts it.

### Fixed (playground)

- **A typedoc failure during a build said only `Command failed`.** The API model is generated on
  every playground build — including the deploy one — and typedoc runs there with
  `treatWarningsAsErrors`, so a broken `{@link}` fails the build. `stdio: 'pipe'` meant its
  actual diagnostics sat unread on the error object while Vite printed the useless half. The
  plugin now repeats typedoc's own output, and says so when there was none.

- **The playground's Vite config imported its own plugin without a file extension**, which
  `configLoader: 'native'` — the coming default — warns about today and will fail to resolve
  later. Extension added, and asserted by a test, because a warning in build output is exactly
  the kind of thing that gets scrolled past. It is the config-file half of the rule the library
  already follows for its emitted declarations.

- **The corner toast was a dialog pretending to be a notification.** A `<dialog>` carries an
  implicit `role="dialog"` — a surface the user is meant to attend to — while a toast is a
  passing status message nobody navigates to. The element stays (it is what positions, slides,
  times out and closes with a typed reason); the semantics moved inside it, to a
  `role="status"` live region that announces "Changes saved" without moving the user anywhere.
  The example now explains the distinction, because it is the one place in the playground where
  it bites.

### Added (the styling surface)

- **`--dialog-backdrop`.** The library's one visual opinion is now a custom property, read by
  its single `dialog::backdrop` rule and still defaulting to `rgba(0, 0, 0, 0.7)`. Theming a
  backdrop was previously a specificity fight against an adopted stylesheet — you had to know
  the internal selector and beat it. It is now a declaration, anywhere above the dialog.
- **`data-modal-id` on the `<dialog>`**, beside the existing `data-modal-type`. Styling used to
  mean keying off `data-testid`, which is a test hook, not a contract: it can be renamed without
  anyone thinking twice, and it reads as a mistake in production CSS. One dialog is now
  `dialog[data-modal-id='settings']`, and every non-blocking one `dialog[data-modal-type='non-modal']`.
- **`style` is public.** It was marked `@internal` — "users should style their own content
  instead" — while the template hooks used it to do the one thing content styling cannot: size
  the `<dialog>` box, which keeps the UA's `fit-content` unless told otherwise. The marker said
  _you may not size a dialog_ and the templates proved sizing is normal. Template hooks now
  accept it too, merged **over** their own structural styles, so a caller can set a drawer's
  width without losing the placement that makes it a drawer.
- **`data-loading` on an action's button props.** `loading` is what a button _component_
  declares (MUI, Mantine, and most others), and React drops it on a DOM element — so a plain
  `<button>` spread got the state and could do nothing with it. Both are emitted now: `loading`
  for components, `data-loading` for CSS (`button[data-loading='true']`). Nothing is removed.

### Fixed

- **A closed dialog was still laid out, and ate clicks.** The UA hides one
  (`dialog:not([open]) { display: none }`), but the library's inline `display: flex` outranked
  it — and a contained non-modal dialog is `inset: 0`, so every closed one was an invisible
  click blocker across its whole region. It is `display: none` while closed now.
  `getDialogAnimationStyles` takes the phase rather than an `isAnimating` boolean, which is what
  lets it say so. The existing click-through test passed only because a slide's exit transform
  had moved the dialog off the point being clicked; it now asserts the closed dialog is out of
  layout as well.

### Added (playground)

- **A "Cosmic Override" showcase on `/advanced`**, which exists to mark where the library stops:
  it takes every hook offered — a restyled `::backdrop`, custom entrance and exit transforms, a
  contained non-modal dialog answering to a sector of the page instead of the viewport, an Enter
  hotkey declared on the action, an action error rendered in its own markup — and overrides all
  of it. `dialogPlacement()` is read there as data, next to the panel it placed.

### Fixed

- **A contained non-modal dialog made its whole region unclickable.** The host the library
  renders around it is `absolute; inset: 0` over that region for the modal's whole life, closed
  included, so it silently ate every click behind it — including the one on the button that
  opens the dialog. The host is now `pointer-events: none` and the dialog takes its own hits
  back with `auto`; click-outside dismissal is unaffected, since that listens on the document.
  Found by writing the showcase above, and pinned by a CT test that clicks a button underneath a
  closed panel.

### Added (the examples are code, so they are held to the code gates)

- **`yarn docs:examples`** extracts every `@example` in `src/` into a real module and runs
  prettier, `tsc` and eslint over it — the three gates a doc comment sits outside of. It joins
  `yarn check`; `yarn docs:examples:fix` writes the formatted example back into the comment it
  came from. Diagnostics are reported at the source: `src/core/types.ts:273 (@example on
UseModalReturn)`, not at the generated file nobody wrote.
- The examples get **their own tsconfig and eslint scope**, and the bargain is stated in both: a
  snippet shows a call and stops, so unused bindings and implicit `any` are allowed and concise
  arrows are not fought, while everything that decides whether it would compile in a reader's
  app — `strict`, `exactOptionalPropertyTypes`, the DOM lib, `no-floating-promises` — is kept.
  The world a snippet assumes (`store`, `fetchUser`, `api`) is discovered by a first pass and
  declared for a second, so what can fail is the example using _this library_ wrongly.
- **All 37 examples now pass all three.** Three had to be rewritten to get there, and each was
  worth rewriting on its own: `UseModalReturn`'s jammed a component body and an imperative call
  site into one block that could not compile as either (it is now one `DeleteButton` that opens,
  awaits and reads the payload); `defineAction`'s and `useModalActions`' showed sibling JSX call
  sites that parse as one broken expression, and now show the fragment you would actually write.
  Eleven more were reformatted, and `src/` files that had picked up CRLF endings were returned
  to LF.

### Added

- **`dialogPlacement()`** — the positioning contract for a dialog, as data, from the
  framework-agnostic root: `{ nonModal, portal, clip }` → `{ host, dialog }`. A `showModal()`
  dialog is placed by the top layer and needs nothing; a portaled non-modal one is `fixed`
  against the viewport; a contained one is `absolute` against a host the library owns, because
  an inline `fixed` dialog resolves against the nearest transformed ancestor and jumps when that
  ancestor animates. `useModal` now renders `host` on its wrapper and `getDialogAnimationStyles`
  merges `dialog`, so the rule lives in one table instead of a style literal in the JSX and a
  branch in a util — and a second binding, or a host you write yourself, places a dialog the
  same way. `ModalOutlet` deliberately stays in the React binding: it exists so a consumer never
  writes `{Modal}`, which is a JSX-ownership problem no other renderer has.

### Changed

- **`useMessageModal` now reports `modalType: 'message'`** instead of inheriting `'modal'`.
  `modalType` exists so a cross-cutting listener — analytics, a handler that only cares about
  drawers — can tell one kind of dialog from another, which a template that inherits the generic
  default defeats. `useSlideModal` already named itself; the doc claimed both did.
- **`useDialogManagerContext` is public**, and documented as what it is: the imperative
  counterpart to `useDialogManager`, returning the manager instance this subtree is scoped to
  rather than a snapshot that re-renders. It was exported from `./react` _and_ marked
  `@internal`, so it shipped in the bundle and appeared in no documentation — while being the
  only way for a component that owns no modal to drive one without reaching past a provider to
  the singleton.

## 2026-08-02

### Changed (the API reference is a document, not a list)

- **`/api` is now a map plus ten chapter pages.** One page listing ninety symbols is a scroll, not a reference: `/api` opens on start-here links and a card per category, and each category — Dialog manager, Lifecycle events, Store engine, Async helpers, Keys & hotkeys, useModal, Template hooks, Actions, Manager in React, Store in React — is its own route at `/api/$category`, around ten symbols long, with previous/next at the foot. The grouping is a hand-written table in the plugin because it is the one the entry points already declare in their section banners and typedoc carries none of it; **an export belonging to no category fails the build**, since it would otherwise be silently unreachable.
- **Every symbol shows its signature**, printed from typedoc's type tree with each referenced export kept clickable — `useModal<TData = void>(options: UseModalOptions<TData>): UseModalReturn<TData>`, where both types are links. The printer handles every `type` discriminant typedoc emits for this library and warns at build time on anything it does not recognise, rather than printing something plausible that would not compile.
- **Members are a table, not a paragraph.** Parameters, type parameters, props and object members all render as one grid — name in a shared left column, type in monospace, prose in the body font — so the eye runs down the names instead of re-parsing each row. Undescribed entries are kept now that the type is shown beside them (`Escape: 'Escape'` needs no sentence), and lists over twelve rows collapse: `Key` is 67 entries.
- **A sticky rail carries fuzzy search and the table of contents**, with the open category unfolded to its symbols and the one under the reader highlighted as the page scrolls.
- The projection gained what the page needed: member types, a component's destructured props (listed as props rather than an anonymous `{ … }` parameter), the far side of an `A & { … }` intersection, and a type parameter's constraint or default instead of `unknown`.

### Fixed (reading the generated prose)

- **The source's hard wrap became the page's ragged wrap.** Doc comments are wrapped at 100 columns for the editor; those newlines were rendered verbatim. Single newlines now become spaces so the browser wraps, while blank lines and lines opening a list, heading or table are left alone — and `@example` blocks keep every newline, because they are code, not prose.
- **`**bold**` and long example lines.** Emphasis in a summary rendered as literal asterisks; it is now bold. Examples in the reference wrap instead of scrolling sideways — a horizontal scrollbar inside a page that scrolls vertically hides the end of the line you are reading, with nothing on screen to say so.
- **A cross-reference used to be a same-page anchor**, which cannot work once symbols live on different routes. `{@link}` prose, signature types and search results all navigate to `/api/$category#api-<name>` through one pair of URL builders.

### Fixed (documentation audited against the code)

- **Every `@example` in the public API now compiles.** All 33 were written into real `.tsx`
  modules and run through the project's own `tsc` — free identifiers (`store`, `fetchUser`)
  stubbed, snippet-only shapes normalised — and the result was zero type errors, so the worked
  examples use the API the way the declarations define it. The one that did not compile was
  `ModalOutlet`'s: `{// modals inside open automatically}` is a JSX expression containing only a
  line comment, which swallows its own closing brace. Rewritten.
- **`onOpen` did not run where its doc said.** "Called when the modal opens (before entrance
  animation)" — the lifecycle calls `showDialog()` and `scheduleOpenTransition()` _first_, so an
  async `onOpen` runs alongside the entrance animation. That is also what `isPreparing`'s own
  doc describes ("the dialog is on screen, its content is not ready yet"), so the two had been
  contradicting each other.
- **The stack's sort key was documented as `openedAt` in three places** — `computeSnapshot`,
  `getZIndex` and the public `ModalLookup.getOpen` — while the code sorts by `openSeq`, exactly
  because a wall clock cannot order two modals opened in one synchronous block. `RegistryEntry.openSeq`
  explains this; the three others still described the behaviour it replaced.
- `ModalPhase.'opening'` said `show()`/`showModal()` "has been called"; the phase is set first and
  the dialog is shown by the effect that reacts to it. `asyncIdle` was described as "a frozen
  value" and is not frozen — what it actually offers is a stable identity. `modalType` claimed
  "the built-in templates name themselves" when only `useSlideModal` does.

### Added (playground helpers)

- **A fuzzy matcher** (`shared/lib/fuzzy-match.ts`) behind the symbol search: subsequence scoring that rewards word boundaries and runs, then a Damerau–Levenshtein pass with a free start so `modla` and `modul` still find `useModal`. Typo hits always score below real matches and report no highlight ranges, because there is no honest character mapping to draw.
- **Playground helpers are now unit-tested.** The `unit` project's `testDir` is the repo root, so `playground/src/**/__tests__/*.test.ts` runs alongside the library's. The matcher's 22 tests found a real bug on the first run: the first matched character was dropped from the highlight ranges and scored a consecutive-match bonus it had not earned, because `previousHit` starts at `-1`.

## 2026-07-31

### Added (the API reference is a playground page)

- **`/api` renders the generated reference with the playground's own components.** A Vite plugin ([`playground/vite-plugins/api-model.ts`](playground/vite-plugins/api-model.ts)) runs typedoc over both entry points, projects its ~470 kB graph down to what a reference page actually shows — summary, `@example` blocks, described parameters and members — and serves it as `virtual:dialog-api`. The page then uses `SurfaceCard`, `CodeBlock` and `SectionNav` like every other page, so the reference and the examples share one design instead of an iframed second one. 90 symbols, 33 worked examples, filterable.
- **It reads like JSDoc, not like a list.** A symbol index at the top links every export by entry point; `{@link Symbol}` in a comment becomes a jump to that symbol's card rather than its bare name (typedoc gives each inline tag a reflection id, resolved against a name map built from the project); inline `` `code` `` in a summary renders as code instead of showing its backticks; `@see`, `@returns`, `@param` and `@typeParam` each get their own block. `@see` is supported and currently unused — every cross-reference in the source is written as `{@link}`.
- **It regenerates from source.** In `yarn dev` a JSDoc edit reaches the page in about five seconds (typedoc has to re-run); in `yarn playground:build` the model is generated as part of the build. Adding an `@example` to an export makes it appear with no playground change at all — measured by editing `createMutex`'s summary and watching the page pick it up.

### Added (worked examples on the public API)

- **Eleven exported functions gained an `@example`** — 14 of 31 had none, and they were the ones a signature does not explain: `safeAwait`, `runAsync`, `createMutex`, `createSingleFlight`, `watch`, `shallowEqual`, `normalizeError`, `matchesHotkey`, `formatHotkeyLabel`, `createStoreContext`, `useStore`, plus the `dialogManager` singleton and both DOM event constants. `createMutex` read "serializes async tasks" and left you to picture it; it now shows two saves racing and one waiting. The three still without one are `asyncIdle`/`asyncPending` (sentinels, covered by their factory) and `Key` (a table of constants).
- Two of those examples were **wrong when first written and corrected before commit**: `DialogManagerProvider` takes only `children` — it builds its own instance — and `watch` cannot take the dialog manager, whose `subscribe` carries an event rather than the `StoreContract` signature. Examples are prose, and nothing type-checks them; each was verified against the actual declaration.

### Fixed (generated docs — the generator had been told to stay quiet)

- **All three typedoc validations were off** (`notExported`, `invalidLink`, `notDocumented`), which is to say the generator was configured not to report the three things it exists to catch. Turned on with `treatWarningsAsErrors`, and `docs:check` joins `yarn check`. The first run found **148 warnings**.
- **`ActionOptions` and `ActionPayload` were not exported from `./react`.** `actions.confirm({ … })` asks for an `ActionOptions`, and a consumer could not name the type. Found by `notExported`, which is exactly the class of gap the docs-drift guard cannot see — that one checks symbols the docs _mention_, not types a public signature _references_.
- **A `{@link useStore}` in `StoreApi` could never resolve** — `StoreApi` ships from the root, `useStore` from `./react`. Replaced with prose. Two further links pointed at internal symbols excluded from the output.
- **~40 public symbols had no documentation at all**: the whole async-state family (`AsyncState`, `asyncIdle`, `asyncPending`, `asyncFulfilled`, `asyncRejected` and their members), the store types (`CreateStoreOptions`, `StoreApi`, `StoreContract`, `WatchOptions`, `UseStoreOptions`, `CreateStoreContextOptions`, `StoreContextResult`), `Mutex`, `SingleFlight*`, `SafeAwaitResult`, and the members of the DOM event details. Documented.
- `disableSources` is on until a git remote exists, since every "view source" link would 404; a README link pointing at a directory no longer asks typedoc to copy it as an asset.

Warnings: 148 → 0. `notDocumented` stays off, and `src/CLAUDE.md` says why: it flags exactly 67 things, all of them `Key`'s constants, whose names are their documentation.

### Fixed

- **Two `createStore` call sites were selecting the wrong overload by arity.** `createStore` has `<TSnapshot, TContext>` and `<TSnapshot, TMethods, TContext>`, so `createStore<Snapshot, Methods>(initial, builder)` matches the _generic_ overload and asks for `TContext = Methods`. Both sites landed on the intended overload only by accident — removing an unrelated global type augmentation flipped one of them to `Binding element 'set' implicitly has an 'any' type`. They now annotate the initial snapshot and the builder's return and pass no type arguments, which is the shape `createModalStore` already used.

### Fixed (playground)

- **A warm open flashed the loading panel.** With the cache already filled, the Async Open example showed its fallback for a moment before the content. `isPreparing` was not lying: `onOpen` genuinely runs on every open, and an `async` function returns a promise even when a warm cache gives it nothing to await — so the flag is briefly true, the fallback layer renders at full opacity, and the 250ms crossfade makes that visible. The example now gates the fallback on `isPreparing && !isSuccess` — show it only when there is nothing to show — which is the same `isFetching && !data` a React Query consumer writes. Measured frame by frame before and after: peak fallback opacity on a warm open went from `1` to `0`, while a cold open still shows it. Guarded by a new `asyncopen` flow in the `playground-smoke` skill, since a crossfade is invisible to any assertion that only inspects the end state.

### Removed

- **`ts-reset`.** Verified rather than assumed: with the overload ambiguity above fixed, removing it produces zero errors anywhere. The codebase has no `JSON.parse`, no `.json()`, and its four `.filter(Boolean)` calls join strings — there is no data boundary here for it to guard, which is what it exists for. One dependency and two wiring files (`reset.d.ts`, `src/ts-reset.ts`) gone; adding it back is one line if a parsing boundary ever appears.
- **The root `vite.config.ts`.** A leftover from before the playground became its own workspace: `dev` delegates to that workspace's config and `build:esm` names `vite.config.esm.ts` explicitly. Confirmed dead by deleting it and rebuilding the library, the playground and the component-test bundle.

### Changed

- **The playground pins the React Compiler target** (`reactCompilerPreset({ target: '19' })`) instead of relying on the plugin's default. The library build and the component-test bundle both pass `{ target: '19' }`; the defaults agree today, which is exactly the kind of agreement that breaks quietly. A demo compiled under a different target stops being evidence of how the shipped code behaves.

### Changed (two names that carried an opinion they should not)

- **`ModalType` is gone; `modalType` is a `string`.** It was `'modal' | 'slide'` — a framework-agnostic, template-agnostic core enumerating `useSlideModal`, a hook that lives above it, right down to the payload of the public DOM events. A template you write had no honest value to report and would have had to claim `'modal'`. Opening the union to `'modal' | (string & {})` fixed the leak but left an alias that was structurally `string` while looking like a constraint, and whose one autocomplete suggestion was the default nobody writes explicitly. Nothing outside the library named the type. The concept stays — a creator-supplied label the library carries but never reads, so a cross-cutting listener need not keep its own id-to-kind table — and it is now documented where it is read, on `ModalInfo.modalType`.
- **`ContentTransition`'s `loading` / `loadingContent` are `pending` / `fallback`** (playground template). `loading` said "data", which the component knows nothing about and which the modal flag feeding it (`isPreparing`) is not about either. `transitioning` was considered and rejected: it names the animation, which runs when the flag _flips_, not while it is true — so `transitioning={false}` would read as "no transition happening". `fallback` is React's own word for what to show meanwhile.

### Fixed (Escape depended on where focus was)

- **The browser closed a modal behind the store's back whenever focus sat outside the dialog.** ESC handling lived on a `keydown` listener attached to the `<dialog>`, which only fires while focus is inside it — and focus outside an open modal is ordinary, not exotic: `showModal()` has nowhere to put it when nothing in the content is focusable (a loading panel, a bare message), and content that swaps after opening drops whatever held it. In those cases nothing prevented the native cancel, so the `<dialog>` closed while the store still had it open: the element kept rendering, out of the top layer, backdrop gone, wherever it happened to sit in the tree — a modal that visibly "teleported" into the card behind it, then needed a second Escape. The native `cancel` event is now intercepted on the dialog element, where it arrives regardless of focus. It is always prevented — the browser must never close the dialog behind the store — and whether Escape then _dismisses_ is decided by the same gate every other dismissal path uses.

### Fixed (the props an action spreads onto a button)

- **No `type`, so an action button submitted the form around it.** A `<button>` inside a `<form>` defaults to `type="submit"`, and the MUI form-modal template renders a real `<form>` — so spreading an action there submitted the form _and_ ran the handler. The props now carry `type: 'button'`, with `type: 'submit'` available as a deliberate opt-in.
- **A running action could be re-entered by double-clicking it.** `disabled` was `anyRunning && !thisActionRunning`, so the button that was busy stayed clickable and a second click ran the handler again — two POSTs for one intent. It now includes the action's own run. The guard used to be re-implemented as `disabled || loading` by every button wrapper, and a bare `<button>` could not implement it at all; it is written once, where the props are built.
- **`aria-busy`** is set while an action runs, so a busy button says so to assistive technology rather than only looking different.

### Added

- **An action's callable takes `ActionOptions` as well as a handler**, so a caller can add to the spread without taking it apart: `actions.confirm({ onAction, disabled: !formValid })`. The composition rules are fixed so that spreading can never quietly lose behaviour — `disabled` is **or**-ed with the action's own reasons (it can add one, never remove one, so nothing lets you click through a running action), and `onClick` runs **before** the action and cancels it with `preventDefault()`, the same protocol `useModal`'s `onKeyDown` already uses.
- **`ActionButtonProps.onClick` receives the click event.** `ActionClickEvent` is structural rather than `React.MouseEvent`, so the props still fit a binding that is not React, and any wrapper that types `onClick` from React's own button props accepts them unchanged. A wrapper declaring `onClick: () => void` is now rejected — correctly: it hands the callback to a `<button>`, which calls it with an event. Three wrappers in this repo were declared that way, including one in the reference templates users copy.

### Changed (playground)

- **The "Async Open" example is now a `useQuery` marriage** rather than a bare `setTimeout`. `onOpen` awaits the query, so `open()` resolves when the dialog is up _and_ its data is there; a warm cache makes it return immediately, so the second open has no loading state at all. The example shows `isPreparing` and `isFetching` side by side in **both** branches of the content transition — put them only in the loaded branch and `isPreparing: true` is unobservable, since that branch is by definition the one where preparing is over. Refetching from inside the open modal is where the two axes separate: `isFetching` goes true, `isPreparing` stays false. The `useQuery` stand-in ([shared/lib/use-query.ts](playground/src/shared/lib/use-query.ts)) is thirty lines built from primitives the library already ships — `createStore`, `AsyncState`/`runAsync`, `createSingleFlight` — so the pattern is the same one a real React Query gives you, without the playground taking a dependency for it.

### Fixed (playground templates)

- **The MUI button never rendered a spinner.** It folded `loading` into `disabled` and then dropped it, so a running action looked merely greyed out. MUI 9 has a native `loading`; the button forwards it.
- **The vanilla button dropped `aria-busy`** — the same class of mistake as dropping `aria-keyshortcuts`, which the docs already warn about. Both are forwarded now, and the type says so.

## 2026-07-30

### Fixed (packaging — the published types were silently `any` for NodeNext consumers)

- **Every relative specifier in the emitted `.d.ts` was extensionless**, which is invalid under `moduleResolution: node16`/`nodenext`. Yesterday's fix caught the one instance whose symptom was visible — `export * from './index'` in the React binding, where a star re-export contributes zero names — and correctly identified the cause, but named re-exports "degrade quietly" and every other cross-module type reference in the graph had the same defect. `skipLibCheck: true` (a common default, and what the package's own verification used) suppresses the resolution error, so the imported types degrade to an error type the checker waves through. Measured against a real consumer: `dialogManager.thisMethodDoesNotExist(1, 2, 3)` compiled, and so did `const x: number = dialogManager.lookup('id')`. The package type-checked while providing no type safety at all. Fixed by carrying `.js` on all 310 relative specifiers in `src/` (and `/index.js` on the four directory imports); Vite resolves them back to `.ts`/`.tsx`, so nothing else changed.
- **`yarn verify:package` now fails on any extensionless relative specifier in the built declarations** — a static scan of the whole `dist/**/*.d.ts` graph, because this is an invariant of the artifact rather than something one consumer file happens to exercise. It also compiles a consumer that exercises the inference the type model promises, each positive check paired with a `@ts-expect-error` so a _widened_ type fails the run too. That pairing is what exposed this: the previous checks confirmed the names resolved, never that their types still bit.
- **The root did not export the types its own exports refer to** — `ModalInfo` is a root export and its `phase` is a `ModalPhase`, which was only reachable from `./react`. A non-React consumer could be handed a `ModalInfo` and had no way to annotate its `phase`. `ModalPhase`, `ModalStoreSnapshot` and `CloseResult` now ship from the root (and are no longer re-listed on `./react`, which re-exports the root wholesale). The hook-shaped types stay on the binding: nothing at the root can hand you a `ModalHandle`.

### Fixed (a non-modal panel no longer eats keys it does not use)

- **The window-level dismiss-key listener claimed the key before deciding whether to act on it.** A non-modal panel installs a capture-phase listener so its dismiss key works wherever focus is, and it `preventDefault()`s and `stopPropagation()`s so an underlying element cannot also react to the press that closed the panel. That part is right. But it did so _before_ consulting `canDismiss`, so whenever the panel declined — `dismissWhilePreparing: false` during `onOpen`, or an action already running — the key vanished and nothing happened. In an application that handles its own shortcuts that is indistinguishable from a dead keyboard, and a non-modal panel sits over a live page by definition. The claim now happens only once the panel has decided to act. Covered both ways: a declined press reaches a `document` handler, an acted-on press does not.

  This is the answer to "should we expose a proxy for key registration so user-land can decide about propagation" — the library was simply taking more than it used. With the overreach gone there is nothing left for a proxy to arbitrate, and `onKeyDown` (which runs first and can `preventDefault()`) remains the escape hatch for the rest.

### Changed (`isOpening` → `isPreparing`)

- The field tracks whether the user's `onOpen` callback is still running, which is a different axis from the `'opening'` **phase** — `phase` reaches `'open'` on the animation frame after the dialog is shown, usually well before an async `onOpen` settles, so `phase: 'open'` with the flag still `true` is the normal state of a modal that loads something. Naming them almost identically forced a three-sentence caveat whose job was to deny the resemblance, and that caveat had already been written out three times before it was consolidated. The name now describes the state — the dialog is up, its content is not ready — and the caveat is replaced by one sentence that describes rather than denies. `dismissWhileOpening` follows as `dismissWhilePreparing`.

### Changed (the action vocabulary says what it does)

- **`createActionController` → `defineAction`, `useModalController` → `useModalActions`.** With the reason argument gone the factory no longer creates anything — its whole job is to declare that a config key is an action — and the thing it returns is not the controller either; that is what the hook returns. Renaming the hook's result to `actions` also retires a convention the docs had to carry: `handle` closes the modal, `actions` are its buttons, and nothing has to explain which one "controller" meant.
- Follow-on renames so the vocabulary is one word throughout: the `useModal` option `controller` → **`actions`**, `ActionControllerMarker` → `ActionDefinition`, `UseModalControllerReturn` → `UseModalActionsReturn`, `ControllerBinding`/`ControllerBridge`/`ControllerGate` → `ActionsBinding`/`ActionsBridge`/`ActionsGate`, `CONTROLLER_BRIDGE` → `ACTIONS_BRIDGE`, the marker discriminant `'action-controller'` → `'dialog.action'`, and `src/controller/` → `src/actions/`.

### Changed (nothing writes to a store during render)

- **`useStore` is read-only.** Its `{ context }` option injected the store's dependencies by calling `setContext()` _during render_ — a mutation of shared state in a phase React may run twice, discard, or interleave, and last-render-wins if two components inject different values. Context is now supplied where the store is built (`createStore(initial, builder, { context })`) or per subtree via `createStoreContext`; `store.setContext()` remains for imperative wiring outside render. The absence of the option is the enforcement. A side effect: with the context overload gone, two of `useStore`'s three signatures collapse into one.
- **The action engine's handler registry is gone.** `controller.confirm(handler)` is called during render (it is spread onto a button), and it wrote the handler into a `Map` — the library's only other render-phase mutation. The `Map` was never read: the callable already closes over its handler and hands it straight to `runAction` from `onClick`, so nothing had to be written during render to find it later.

Between the two, the library no longer performs any render-phase write. Verified by reading every render body in `src/`; the render-phase work is snapshot reads and object construction.

### Fixed (hotkeys — a whole family of them could never fire)

- **`Shift+<letter>` hotkeys silently never matched.** `Key.S` is `'s'`, because that is what `KeyboardEvent.key` reports _without_ Shift — hold Shift and the browser reports `'S'`, so the literal comparison in `matchesHotkey` failed for every hotkey built as `` `Shift+${Key.S}` ``. `HotkeyDef` offers `Shift+${KeyValue}` explicitly, and `KeyValue` carries both cases, so the API had two spellings of one combination and only the hand-typed capitalised one worked. Single-character keys now compare case-insensitively; the modifier list still matches exactly, so `'s'` (Shift up) and `'Shift+s'` (Shift down) stay distinct. A side effect worth having: CapsLock can no longer change which hotkey fires — previously `'S'` meant "S with no modifiers", which a keyboard only produces with CapsLock on.
- **`dismissKeyIsOwnedByAction` compared raw strings**, so `dismissKey: 'Shift+s'` did not collide with an action declaring `'Shift+S'` — the same key — and the dismiss path would fire for a key an action already owned. It compares `formatHotkeyLabel()` output now, which is the same canonical form that reaches the DOM as `aria-keyshortcuts`, so matching, DOM lookup and collision detection agree by construction.

### Fixed (three defects found by reading the core with fresh eyes; each proven by a failing test first)

- **A second dialog manager released a body scroll lock it never took.** The lock is global — one `document.body` — and was mirrored by a module-level boolean, so it was last-writer-wins. Every manager calls `unlockBodyScroll()` whenever it observes a transition and finds nothing blocking open, so a provider-scoped manager with nothing open would release the lock the singleton was holding for an open modal, and the page scrolled behind it. Reproduced with a nested `DialogManagerProvider` whose only modal _unmounts_ while the outer manager's blocking modal is open. The lock is now claimed per owner and released when the last claim goes; per-owner idempotence is also what keeps stacked modals in one manager from double-padding.
- **Whether transitions are disabled was cached for the `<dialog>`'s lifetime, not per open.** The element outlives every open/close cycle, and the answer decides how the close path finalizes — immediately, or after waiting for `transitionend`. Turning transitions off between opens (a user setting, a `prefers-reduced-motion` change, a theme swap) left the close path waiting for an event that could never fire, so it only finalized on the 200 ms safety timeout. Measured through the `Animation fallback timeout` warning that path logs. `refreshTransitionsDisabled()` now re-measures during each `'open'` phase; `checkTransitionsDisabled()` still reads the cache, so the close path costs no reflow.
- **A declared action hotkey did nothing while `onOpen` was still running, though clicking the same button worked.** The dialog's content — including every action button — renders from the moment the phase leaves `'closed'`, so an action is live during opening; the keydown path gated on `isOpening` and the two triggers disagreed. `dismissWhileOpening` governs _dismissal_, which is a separate question and still gated. The first version of this test passed for the wrong reason — `Enter` natively activates a focused `<button>` — so the harness binds `F2`.

### Fixed

- **`createActionController('confirm')`'s argument was never read** — the close reason has always been the _config key_. `useModalController({ save: createActionController('persist') })` closed with `reason: 'save'`; the engine keys its handler registry, its state map and its close call by the key and never touches the marker's `reason` field. Four playground examples were already relying on the key without knowing it (`close: createActionController('dismiss')` → `'close'`). Proven by a CT test before anything changed, and the parameter is now gone: **the config key is the action's identity** — it names the callable, it is the close reason, and it is what `ActionKeys<TConfig>` reports. One declaration, nothing that can disagree with itself.

### Changed (the close payload is typed end to end)

- **`TData` now reaches every door a modal closes through.** It was declared on `useModal<TData>` and honoured only by `onClose` / `waitForClose`; `handle.close(reason, data)` took `unknown`, and so did an action's `close(data)`. A modal declared `useModal<{ id: string }>` accepted `handle.close('ok', 42)` without complaint. The payload is now threaded through `ModalHandle<TData>` → `ModalRenderArgs<TData>` → every template render context, and through `createModalStore<TData>` → `ModalStoreSnapshot<TData>` → the resolver queue. **The two `as` casts that used to bridge the store's type erasure are gone** — nothing in the close path asserts any more.
- **Actions declare what they close with**: `createActionController<Result>()`. `ActionPayload<TConfig>` unions the declared payloads (dropping `void`, which would otherwise fit no modal at all), and `ControllerBinding` is covariant in it — so a controller whose actions all close bare binds to any modal, and one that declares a payload only binds to a modal that accepts it. Passing an unchecked payload through an action is now a type error; it caught four real cases in the playground on the first compile.
- **`useSlideModal` is generic in `TData`** like `useMessageModal` already was. It was pinned to `void`, so a slide panel could not carry a close payload at all — `useSlideModal` returned `UseModalReturn<void>` regardless.
- **`dialogManager.close(id, reason)` no longer takes a data payload.** The registry is keyed by string, so nothing at that boundary knows a given modal's `TData` and a payload passed through it could not be checked against anything — it was the one remaining `unknown` hole in the close path. Nothing in the repo, tests or playground ever passed it. A typed payload goes through the typed doors, which know the modal they belong to.
- **`CloseResult<TData>` is a plain object instead of a conditional type.** Nothing can be _assigned_ to a deferred conditional while `TData` is still a type parameter, which is precisely why the casts existed. With `TData = void` the `data` field is an unusable `void | undefined`, so the practical strictness is unchanged — but the shape is one the checker can see through, which is what lets the payload flow with no assertions. `InternalCloseResult` is deleted: the store's `closeResult` _is_ the public `CloseResult`, not a restatement of it.
- **`ModalStore.getOnClose()` → `runOnClose(result)`** and the internal hooks now take `ControllerGate` (the payload-free half of the bridge) rather than `ControllerBridge`. Both are variance fixes with a design dividend: returning the `onClose` callback puts a function type in an output position, which is checked contravariantly and would make `ModalStore<TData>` unassignable to the plain `ModalStore` non-generic consumers declare; the dismissal hooks never close _with data_, so handing them the whole bridge was privilege they did not need.

### Changed (the manager's own model)

- **`ModalInfo` is discriminated on `exists`.** `modalType` and `nonModal` are registration-time facts, so they were optional on a flat object and every reader wrote `info.modalType ?? ''` — a fallback for a case that only arises when the modal was never registered. It is now a union: `RegisteredModalInfo` carries them plainly, `UnregisteredModalInfo` does not have them at all, and reading one requires narrowing on `exists`. The collection queries (`getOpen`, `getClosed`, `getForeground`, `openDialogs`) return `RegisteredModalInfo` — they can only ever produce registered modals — so the narrowing is confined to the one query that can miss, `lookup(id)`. `getOpen('non-blocking')` no longer needs `d.nonModal === true`, because the field is a plain `boolean` again.
- **`DocumentEventMap` is augmented for `modal:open` / `modal:close`**, so `document.addEventListener(MODAL_OPEN_EVENT, (e) => e.detail.id)` is typed with no cast. The library owns both the event names and the detail shapes, so `(e as CustomEvent<ModalOpenEventDetail>).detail` was a cast it was imposing on every consumer — the playground's own DOM-events example did exactly that. `dialog-manager.test.ts` indexes the map _through_ the constants, so a renamed event is a type error rather than a listener silently falling back to a bare `Event`.
- **`ModalType` is declared once.** The `'modal' | 'slide'` union was written out again on `UseModalBaseOptions.modalType` and a third time in `buildModalOptions`' defaults.

### Added

- **Compile-time assertions for the payload path** in [type-model.test.ts](src/core/__tests__/type-model.test.ts): that a render callback's `handle.close` takes exactly the modal's payload, that a template's handle is the same type rather than a looser one, that `ActionKeys` is the reason set, that `ActionPayload` drops `void`, and `@ts-expect-error` checks that a bare modal rejects a payload and that a payload-carrying controller is rejected by a modal that takes none. Each was mutation-tested — widening `ModalHandle.close` back to `unknown` or dropping the `void` exclusion fails the build.
- **CT coverage for action identity and payload** — the config key is the reason, a declared payload reaches `onClose`, and an action that closes bare carries none.

## 2026-07-29

### Changed (core — functional/React separation)

- **`open()`, `waitForClose()` and `handle` now keep a stable identity** — all three close over the modal store alone, so they are built once in `useModal`'s `useState` initializer instead of being re-created every render. They can go straight into a dependency array or a memoized child; the `openRef = useRef(modal.open)` + effect-sync dance the docs used to prescribe is gone (and removed from the playground's `RootLayout`). `handle` is also what `render({ handle })` receives, so memoization inside a render callback is no longer defeated by a new reference each pass. Pinned by a `Stable Identity` story + CT test covering plain re-renders and a full open → close cycle.
- **One `canDismiss()` predicate for every dismissal path** — the `isActionRunning` / `dismissWhileOpening` guard chain was written out four times (dialog-level keydown, the non-modal window-level keydown, click-outside, and the backdrop click handler). It now lives in [utils/dismiss-gate.ts](src/utils/dismiss-gate.ts) as a pure function with unit tests; each path keeps only its own specific check on top. Phase gating is now uniform too — `'closing'` is refused everywhere rather than relying on `store.close()` being a no-op in that phase.
- **One `resolveAnimation()` for the animation defaults** — the `duration ?? 200` / `exitDuration ?? duration` / `transitionProperty ?? 'opacity'` fallbacks were computed independently by the style builder and by `useDialogLifecycle`. Both now read the same resolved object, so the `transition` declared on the `<dialog>` and the `transitionend` the close path waits on cannot drift apart (a drift would silently push every close onto the fallback timeout). Exposed as `DEFAULT_DURATION` / `DEFAULT_TRANSITION_PROPERTY` with unit tests, including one asserting the two consumers agree.
- **Dead SSR branch removed from `useModal`** — the render body was wrapped in `if (typeof document !== 'undefined')`, but `useModal` calls `useSyncExternalStore` without a `getServerSnapshot`, so it throws during a server render well before reaching it. The branch was unreachable; dropping it removes a level of indentation and makes the built dialog node non-nullable.
- **Modal store surface cut from 13 methods to 8** — each remaining method is a complete transition instead of a plumbing primitive. `requestOpen(onOpened?)` absorbs `addOpenResolver` and the start / join-in-flight / resolve-immediately branching that `useModal` used to spell out, so the rule for when an `open()` promise settles lives with the state machine that decides it. `scheduleOpenTransition()` absorbs `setRafId` + `transitionToOpen`: the store now owns its animation frame outright and the handle is never exposed — which also made `cancelRaf` redundant at unmount, since the `close('dismiss')` on the next line already cancels it. `getCloseResult`/`getCloseReason` are gone; both had exactly one caller and duplicated `getSnapshot().closeResult`.

### Fixed

- **Backdrop clicks are identified by their target, not by coordinates alone** — the handler only tested whether the pointer fell outside the dialog's rect, and relied on a `stopPropagation` wrapper around the content to stop everything else from reaching it. That wrapper silently swallowed every content click, so user-land `onClick` handlers on ancestors of `{Modal}` never fired. The handler now first checks that the click actually targeted the `<dialog>` itself, and the wrapper no longer stops propagation. The coordinate test alone was genuinely unsafe: a keyboard-activated button dispatches a click reporting `clientX`/`clientY` of `0` — measured against a live dialog at `480,327→800,393` — which reads as "outside" and would dismiss the modal mid-interaction. Covered by a `Backdrop Hit Testing` story and three CT tests (keyboard activation does not dismiss, content clicks bubble to ancestors, a genuine backdrop click still dismisses); the first fails if the target check is removed.

### Documentation

- **`isOpening` vs the `'opening'` phase** — the two are orthogonal and the one-line doc comment did not say so. `isOpening` tracks the `onOpen` callback and can still be `true` while `phase` is `'open'` (the phase flips on the animation frame after the dialog is shown, `onOpen` settles whenever it settles). Both `ModalRenderArgs` and `UseModalReturn` now spell this out, and `ModalPhase` documents each phase.
- **Why `ModalOutlet` holds rendered nodes rather than a DOM anchor** — investigated replacing the outlet's node registry with a `display: contents` anchor that `useModal` portals into, which would remove both the one-commit render lag and the outlet re-render on every descendant modal render. It cannot work: a React element only renders if some component returns it, so with the consumer not writing `{Modal}` the outlet must be that component, and the node has to reach it through state. Both costs are inherent to the feature and are now documented as such at the point of the trade-off rather than left looking like oversights.
- **The outlet's one-commit hop was measured, not assumed** — the obvious follow-up was to publish the node from a `useLayoutEffect` so the outlet re-renders before paint. Measurement killed it: with either effect the dialog's DOM still reads the old value at the end of the click's own task (the outlet's re-render is a _cascade_, not part of that commit), and by the next animation frame both variants have already caught up. There is no visible stale frame to fix, so registration stays passive and does not block paint. A `Paint Timing` story + CT test now bounds the hop to within one frame, and the reasoning — including the per-modal-host redesign that would confine the re-render cost but buys an unmeasurable win — is recorded in [core/modal-outlet.tsx](src/core/modal-outlet.tsx) so it is not re-litigated.

### Fixed (packaging — `./react` was missing the entire core for NodeNext consumers)

- **`export * from './index'` in the React binding contributed nothing to a consumer's types** — `tsc` copies relative specifiers into the emitted `.d.ts` verbatim, and an extensionless one is invalid under `moduleResolution: node16`/`nodenext`. A _named_ re-export degrades quietly there, but a star re-export cannot enumerate the module at all, so `umbra/react` appeared to export no `dialogManager`, `createStore`, `Key`, `safeAwait` — every symbol the root owns — while the runtime bundle had all 32 of them. Types-only, and completely hidden by `skipLibCheck: true`, which is a common default. Fixed by writing `'./index.js'`, with a comment saying why that one specifier carries an extension so it does not get tidied away. This broke exactly the consumer the framework-agnostic root exists to serve: plain Node/TS with no bundler.

### Added

- **`yarn verify:package`** ([scripts/verify-package.mjs](scripts/verify-package.mjs), wired into `prepublishOnly`) — resolves the built `dist/` from a synthetic external consumer under `moduleResolution: NodeNext`, for both entry points, then walks the built root's import graph to confirm it pulls no React and the binding's to confirm the walker is not blind. `type-check` compiles `src/`, which says nothing about whether the published artifact is usable; the `exports` map, the `.d.ts` layout and the entry-point split are only exercised from outside. It found the bug above on its first run.
- **`dismissKeyIsOwnedByAction`** ([utils/dismiss-key-gate.ts](src/utils/dismiss-key-gate.ts)) — the dismiss-key/action-hotkey collision test, lifted out of `useDialogKeydown` where both dismissal paths inlined it, and unit tested. The `dismissKey: false` branch is the one worth pinning: with key dismissal disabled there is no key to collide with, and a truthy result there would make the non-modal path redirect a keypress to a button never bound to it.
- **`playground-smoke` skill** — a Playwright probe that walks every playground route asserting it renders with no console errors and exactly one `<h1>`, then drives four interaction flows (modal open/dismiss, code viewer, the React-free service, sticky jump bars). Routes are discovered from the sidebar rather than hardcoded, so a new route is covered without editing the probe. `yarn test` never loads the playground, which leaves bad import specifiers, orphaned examples, and CSS-level regressions like a broken `position: sticky` invisible to CI.

### Removed

- **The `KeyExtensions` augmentation point** — an empty interface plus two blocks of JSDoc teaching users module augmentation, so that `KeyValue` could be widened with keys the built-in `Key` constant does not carry. Nothing used it, in this repo or in the examples. A key that is genuinely missing is a one-line addition to `Key` that every consumer gets, which is a better answer than asking each of them to learn `declare module`. `KeyValue` is now a closed union, which is what makes a mistyped `'Escpae'` a compile error.
- **`main`, `module` and the top-level `types` from `package.json`** — legacy fallbacks for tooling that ignores `exports`, which cannot consume an ESM-only package with `engines.node >= 24` regardless. `exports` is now the single declaration of what this package resolves to; verified by type-checking a consumer against the built `dist/` under `moduleResolution: NodeNext` for both `.` and `./react`.

### Changed (repo — playground is its own workspace)

- **The playground is a separate package (`umbra-playground`, private) under Yarn workspaces** — its dependencies were sitting in the published package's manifest, so the library's own dependency list claimed MUI, Emotion, TanStack Router, zod, immer and react-syntax-highlighter, none of which `src/` imports. They now live in `playground/package.json`; the root keeps only what builds, tests and lints the library. `yarn install` at the root still installs everything, and the root's `dev`/`playground:*` scripts delegate through `yarn workspace`. The library continues to ship zero runtime dependencies — the difference is that the manifest now says so.

### Changed (types — the model derives instead of restating)

- **`ModalRenderArgs` is now the single definition of the render-time slice** — `{ isOpening, handle }` was written out three times as three structurally identical types (`ModalRenderArgs`, the same two fields inside `UseModalReturn`, and `BaseRenderContext`), each carrying its own copy of `isOpening`'s caveat that it tracks the `onOpen` callback rather than the `'opening'` phase. Three copies of a subtle doc are three chances to drift. Now `UseModalReturn<TData> = ModalRenderArgs & { … }` and `BaseRenderContext = ModalRenderArgs`, so a new render-time field is added once and reaches the hook return and every template context — and the types state the actual relationship: what `render` receives is the slice of the hook's own return that is available while rendering.
- **The manager's store port uses `ModalStoreSnapshot`** instead of re-declaring `{ phase, isOpening, closeResult }` inline with a narrower `closeResult`. `RegisteredStore` stays an explicit port rather than a `Pick<ModalStore, …>` — the manager is the framework-agnostic side of the boundary and a future binding brings its own store — but the snapshot is shared vocabulary and now cannot disagree with the real one.
- **`ModalVariant`'s explanation has one home** — both branches repeated the same `nonModal` paragraph. The prose now lives on the union (where it can also explain _why_ the two dismissal options are unioned rather than flags), and the branches summarise and link to it. This also removed two stale claims: z-index is no longer derived from `openedAt`, and the same wording had already gone out of date in `DialogManagerSnapshot`.
- **The derivations are pinned** ([core/\_\_tests\_\_/type-model.test.ts](src/core/__tests__/type-model.test.ts)) — compile-time assertions that the chain still holds, plus `@ts-expect-error` checks that `ModalVariant` really does reject `dismissOnBackdropClick` on a non-modal and `dismissOnClickOutside` on a modal. Flattening a derived type back into an equivalent-looking literal fails type-check with the offending line, which is the failure mode a derivation-based model otherwise invites.

### Fixed (core — long-lived-app defects, each caught by a test written to fail first)

- **`waitForClose()` could stay pending forever** — it only settles from `finalize()`, which runs on a real close. A modal destroyed without one (unmounted while closed, or having never opened) left every waiter hanging for the life of the process: the awaiting code silently never resumed and the resolver held its whole closure alive. `useModal`'s teardown returned early in exactly that case. New `store.abandon()` is now called unconditionally on teardown and settles waiters with the `[Error, null]` branch of `WaitForCloseResult` — a branch nothing in the codebase had ever produced, so the public type was describing a state that could not happen. Deliberately not the retained `closeResult`: a `waitForClose()` issued after an earlier close waits for the _next_ one, so replaying the old reason would be a wrong answer rather than a late one.
- **A duplicate modal id leaked a store subscription permanently** — `register()` overwrote the registry entry without releasing the displaced store's subscription, which then became unreachable (`unregister(id)` can only ever find the current entry) and kept driving snapshot recomputation from outside the registry. Now released explicitly, with a warning: the _other_ symptom of a duplicate id — one modal's actions closing the other — is far harder to trace back to its cause.
- **Stack order depended on machine speed** — `openedAt` is `Date.now()`, so two modals opened in one synchronous block (a confirm raised from inside another modal) landed on the same millisecond, and the stable sort fell back to registry insertion order, i.e. _mount_ order. The newer modal could render behind the older one. Ordering now uses a monotonic `openSeq`; `openedAt` stays wall-clock for the public `ModalInfo` and the DOM event details.
- **A listener that subscribed during dispatch received the event that triggered it** — `emit()` iterated the live `Set`, and `Set` iterators pick up entries added mid-iteration, so anything counting opens saw a duplicate. Dispatch now runs over a snapshot, which also makes self-unsubscription during dispatch unambiguous.

### Added (tests — the state machine had none)

- **19 unit tests for `createModalStore`** ([core/\_\_tests\_\_/modal-store.test.ts](src/core/__tests__/modal-store.test.ts)) — the whole of `useModal`'s logic with React removed, previously covered only indirectly through component tests, where a broken edge surfaces as a mysterious UI symptom instead of one failing line. Installs a controllable `requestAnimationFrame` so "close cancels a pending open frame" is deterministic rather than timing-dependent.
- **7 registry-invariant tests for the manager** ([manager/\_\_tests\_\_/dialog-manager-registry.test.ts](src/manager/__tests__/dialog-manager-registry.test.ts)) — the duplicate-id, re-entrant-subscription and same-millisecond-stacking cases above.
- **A docs-drift guard** ([\_\_tests\_\_/docs-exports.test.ts](src/__tests__/docs-exports.test.ts)) — parses every documented import in `README.md` and `API.md` and asserts each value symbol is exported by the entry point the docs name, reporting `README.md:44 — 'useModalController' is not exported by 'umbra'`. `API.md` opens by stating it "must be kept in sync with the library source manually", which is an accurate description of a file that will rot. Two companion assertions: `./react` re-exports the whole root, and no `use*` symbol has leaked onto the root.

### Fixed (documentation)

- **`README.md` and `API.md` taught the wrong import paths** — the entry-point split left 13 documented imports pointing at the root for symbols that now live on `./react`, including the README's Quick Start, which is the first snippet anyone copies. Each statement was classified rather than blanket-replaced: `./react` re-exports the root, so the 13 imports using only core symbols correctly stay on the root and now demonstrate the split. The README also gains an entry-points table, optional-peer wording, and a **Without React** section — the point of the whole rework previously had no example.

### Changed (package — the core is framework-agnostic, React is a binding)

- **The package root no longer requires React; the React API moved to `umbra/react`** — the library is a dialog manager written in plain TypeScript, and React is one binding over it. `.` now exports the manager, the store engine (`createStore`, `watch`, `shallowEqual`), the async helpers (`safeAwait`, `createMutex`, `createSingleFlight`, `runAsync`, the async-state sentinels), `Key` and `setLogLevel` — all of which were already framework-agnostic but were reachable only through the React barrel, so a non-React caller could not use any of them. `./react` carries `useModal`, the template hooks, `useModalController`, `ModalOutlet`, `useStore`, `createStoreContext` and the provider, and re-exports the root wholesale so a React app still imports from exactly one specifier. Adding a Solid or Vue binding is now a sibling of `src/react.ts` plus an `exports` entry, with nothing under the root changing.
- **`react` and `react-dom` are optional peers** (`peerDependenciesMeta`) — installing the package in a project with no React is no longer a peer-dependency warning, which is the promise the root's React-freedom makes good on.
- **The root's React-freedom is enforced by a test, not a convention** — [src/\_\_tests\_\_/root-react-free.test.ts](src/__tests__/root-react-free.test.ts) walks the real import graph from `src/index.ts` and fails on any runtime `react` import, following value edges only since type-only imports are erased. A companion assertion requires `src/react.ts` to come back dirty, so the guard cannot pass by silently resolving nothing. It caught a real leak on its first run: `dialog-manager.ts` imported `createStore` from the `../store` barrel, which re-exports `useStore` and `createStoreContext` — both React. The built artifact was clean only because Rollup tree-shook the unused re-exports back out, i.e. the property held by build-time accident rather than by construction. The import now points at `../store/create-store` (which has no imports at all), making it structural; this is the one documented exception to the barrel-only rule.
- **`typesVersions` dropped from `package.json`** — it duplicated the `types` condition already declared in `exports`, and only ever mattered for TypeScript's legacy `node10` resolution, which cannot consume an ESM-only package regardless.

### Changed (playground — information architecture)

- **The Service Layer example demonstrates its claim instead of asserting it** — the "React-free service" was declared inside the `.tsx` beside the component, with a comment saying it _would_ live in a separate file in a real app, in a file importing React on line 1. It is now `deployment-service.ts`: a real module importing only the package root, which awaits the confirm dialog's close reason (`open()` plus a one-shot `subscribe()` — the imperative equivalent of `waitForClose()`), calls the API, and raises the failure dialog itself. The component registers the two modals and mirrors service state through `useSyncExternalStore`; it orchestrates nothing. Both halves are on the page, the service as a code-only card.
- **Seven examples were invisible; three are now on a page and four are gone** — they were registered in `codeSamples` and fully built into the bundle, but no page ever rendered them, so the only way to reach them was to know the file existed. Restored: the **Pharmacy Prescription Review** showcase (717 lines — a slide panel driving nested message modals over a `createStoreContext`-scoped store, with mutex + single-flight around submit), the **Service Layer** connector demo (a React-free module raising modals by id through `umbra/connector`), and the **Vanilla Form + Zod** example (499 lines, schema-driven per-field errors). Deleted: `slide-modal`, `dismiss-key`, and `non-modal-slide`, each of which demonstrated one toggle that the Slide Modal Configurator now covers in a single card. All three restored examples were verified to still open and render correctly in a real browser before being placed.
- **`pages/headless-integration` and `pages/vanilla` folded into `pages/ui-integrations`** — both were page slices with no route and no `ui/` segment: folders of examples that only `UIIntegrationsPage` imported, which is a page-to-page import and an FSD violation. Their examples now live in `pages/ui-integrations/examples/`, where the page that renders them owns them.
- **One section and one grid primitive for every page** — pages hand-rolled their own headings (`variant="overline"` with per-page `mt`/`mb`, or an `h6` + `<Divider>`) and their own card grids (`flex: '1 1 calc(50% - 8px)'`, `grid` with `1fr`, or bare `<Box mb={4}>` stacks), so identical-looking sections had different rhythm and different collapse behaviour. All six content pages now compose `PageLayout` → `ExampleSection` → `ExampleGrid`. `ExampleSection` also stamps an anchor id, which is what made the jump bars possible.
- **UI Integrations regrouped by use case** — six cards alternating MUI/vanilla in one flat wall became three sections (Message, Slide panel, Form) that place each pair side by side, so the comparison the page exists to make is the thing you actually see.
- **Advanced split into four sections with a jump bar** — Stacking, Imperative control, Rendering & events, and Showcases, ending on the two full end-to-end demos. Previously five sections held one card each.
- **UI Templates gained a MUI/Vanilla flavour toggle** — the page documented itself as the template reference but listed only the MUI set; the entire vanilla tree (message, slide, form, shared, and their CSS modules — 37 files) existed and was unlisted. The toggle keeps the page one screen deep instead of doubling it, and CSS-module samples now highlight as CSS rather than TSX.
- **One card surface for the playground** — example cards, story cards and template rows each re-declared the same outlined border, dark-mode background and hover lift, so the three had already drifted (the story card had lost its hover, the example card had an extra background tint nothing else used). They now share `SurfaceCard`, which deliberately exposes no `sx` passthrough: that escape hatch is how they diverged.
- **Sidebar navigation grouped into Learn / Patterns / Reference / Testing** — seven flat routes now read as a path through the library. The item markup was also duplicated verbatim for the lone Testing entry; there is now one renderer.
- **Dead `CodePane` widget removed** — a 234-line resizable side pane, complete with drag-to-resize and its own `codeSamples` loader, that nothing rendered; the code viewer has been a slide modal for some time. Its four unused fields (`isOpen`, `togglePane`, `width`, `setWidth`) are gone from `CodePaneContext` too.

### Fixed (playground)

- **The section jump bars actually stick** — `RootLayout`'s content box declared `overflow: auto`, which never scrolled (the window does) but made that box the nearest scrolling ancestor, silently disabling `position: sticky` for everything inside it. Caught by measuring the bar's position after scrolling rather than by looking at a screenshot: it was at `y = -1169` instead of `64`. The box carries a comment so the property isn't reintroduced.
- **One `<h1>` per page** — the top bar's "Dialog System" wordmark and each page's title both rendered as `h1`, leaving no unique document heading for screen-reader users. The wordmark is now a `<span>`; `PageLayout` owns the `h1`.
- **Page headers are left-aligned** — a centred title and description sitting above a left-aligned card grid read as two layouts stacked on each other.

## 2026-07-28

### Fixed (scroll lock no longer shifts the page)

- **The body scroll lock now compensates the reclaimed scrollbar width** — locking was a bare `overflow: hidden`, so on any scrollable page opening a modal removed the classic scrollbar, widened the viewport, and shifted every centered or right-aligned element (the ~15px "jump"). The lock now reserves the reclaimed width as body padding, added to whatever padding the page already had and restored exactly on close. New framework-agnostic [manager/scroll-lock.ts](src/manager/scroll-lock.ts); the manager keeps only the registry logic.
- **The compensation is a delta, not the scrollbar width** — measuring the gutter _before and after_ applying the lock is what makes it correct in all three real cases: classic scrollbar (15 → 0, compensate 15), overlay scrollbars (0 → 0, compensate 0), and `scrollbar-gutter: stable` (15 → 15, compensate **0**). The last case is a trap the naive approach falls into: such a page keeps its gutter through `overflow: hidden`, so padding by the scrollbar width shifts content _inward_ — a jump in the opposite direction. Found by measurement, and pinned by unit tests on the pure `computeScrollCompensation()` (headless Chromium uses overlay scrollbars, so it cannot reproduce a space-taking gutter in a component test).
- **`--dialog-scrollbar-width` published for user-land** — the reclaimed amount is exposed as a custom property on `:root` while the lock is held (always defined, `0px` when nothing was reclaimed) so `position: fixed` headers/toasts can compensate with `padding-right: var(--dialog-scrollbar-width, 0px)`. The library deliberately does **not** walk the consumer's DOM hunting for fixed elements. Covered by CT tests (lock + no layout shift, restore on close, stacked modals never double-compensate, non-modal never locks, the variable is consumable) plus a `Scroll Lock Compensation` story on the playground Stories page.

### Changed (tooling — Yarn 4, and declarations via `tsc`)

- **`vite-plugin-dts` removed — declarations are emitted by `tsc`** — the published `.d.ts` files now come from `tsc -p tsconfig.build.json` (new `build:types` script, chained into `build:esm`) instead of the Vite plugin (whose v5 line is built on `unplugin-dts`). One less build plugin, and the declarations come from the same compiler `type-check` already runs, so published types can't drift from what CI validates. Output layout is unchanged — `dist/esm/index.d.ts` and `dist/esm/connector.d.ts` mirroring `src/`, matching the existing `types`/`exports` entries. Verified with a consumer-style type-check against the built output (41 declaration files, no test/story files leaking into `dist`).
- **TypeScript 7 kept, with a side-by-side TS 6 for lint/docs tooling** — the repo declares TS 7, but `typescript-eslint` hard-blocks TS ≥ 7 and `typedoc` peers on ≤ 6.0.x, so `yarn lint` crashed at config load. The gate turned out to be a genuine incompatibility, not a cosmetic version check: TS 7 removed the enum API `typescript-estree` relies on (`ts.Extension`, `ts.ModuleKind`, `ts.ScriptTarget`, `ts.JsxEmit` are all absent), so bypassing the check merely trades a clear error for `TypeError: Cannot read properties of undefined (reading 'Cjs')`. Resolution follows TypeScript's own 7.0 side-by-side guidance: the project **compiles with TS 7** through a `typescript-7` alias (every `tsc` in `scripts` points at it — `type-check`, `type-check:watch`, `build:esm`, `build:types`), while the bare `typescript` dependency is 6.0.3 purely to feed ESLint and typedoc. Collapse back to one TypeScript when [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) lands. Also excluded the vendored `.yarn/releases/*.cjs` from ESLint, oxlint, and Prettier — the committed Yarn binary is third-party bundled output and was being linted (and could have been reformatted).
- **Workspace and CI migrated to Yarn 4** — `yarn.lock` is authoritative and Yarn is pinned by `packageManager` (resolved via Corepack), so:
  - **CI** (`.github/workflows/ci.yml`): every job runs `corepack enable`, uses `cache: 'yarn'`, keys the `node_modules` cache off `yarn.lock`, and installs with `yarn install --immutable` (the `npm ci` equivalent — fails if the lockfile would change).
  - **Scripts**: internal `npm run x` calls became `yarn x` so composite scripts (`build`, `check`, `prepublishOnly`) stay inside Yarn.
  - **`overrides` → `resolutions`** — npm's `overrides` field is silently ignored by Yarn, so the nested-`eslint` pins were dead config; they are now expressed as Yarn `resolutions`.
  - **`.gitignore`**: the canonical Yarn 4 block (`.yarn/*` with `!releases`/`!patches`/`!plugins`/`!versions`, plus `.pnp.*`) so the pinned Yarn release stays committed while caches and install state never are.
  - **Docs**: `CLAUDE.md`, `README.md`, and both `copilot-instructions.md` files now show `yarn` commands. The consumer-facing `npm install umbra` in the README is intentionally unchanged — that is for package consumers, who may use any manager.

### Added

- **`useSlideModal` cross-axis alignment — `align?: 'stretch' | 'start' | 'center' | 'end'`** — the cross axis is the one perpendicular to the slide (vertical for `left`/`right`, horizontal for `top`/`bottom`). `stretch` (the default, so this is **non-breaking**) keeps today's behavior: a full-height side drawer / full-width sheet. `start`/`center`/`end` pin a **content-sized** panel to that cross-axis position, enabling corner toasts (`direction: 'right'`, `align: 'start'`), centered command palettes (`direction: 'top'`, `align: 'center'`), or partial-height side panels — you size the panel yourself in `render`. This belongs in the library rather than user-land because `useSlideModal` already owns the dialog's positioning internally (`getDialogStyle` is not reachable from user-land), so cross-axis placement was previously impossible to change without forking the hook. Alignment composes with every mode (modal / `nonModal` / `portal` / contained). For `center`, the required `-50%` self-shift is folded into **both** animation keyframes rather than set separately, since `transform` is a single property the slide already drives.

- **Playground: Align control in the Slide Modal Configurator** — the MODE pane gained an `Align` select (stretch / start / center / end) so every direction × mode × align combination is explorable. With a non-stretch align the SIZE pane drives **both** axes (the panel is content-sized on the cross axis), and the panel's detail list plus the status line report the active align.

### Fixed (playground — vanilla templates)

- **Vanilla form modal: the last field row was clipped by a few pixels** — `.formContent` is a scroll container (`overflow-y: auto`) with no padding, so the last row's bottom edge sat exactly on the clip boundary: its 1px bottom border and its focus ring (a `box-shadow` drawn **outside** the border box) were cut off, making the second input look a few pixels short. It now reserves `--form-focus-ring-space` (2px) of padding, offset by an equal negative margin so the form's alignment is unchanged. The padding is applied on all sides because `overflow-y: auto` forces `overflow-x` to compute to `auto` too, so side rings clipped as well. The other vanilla scroll containers (`.slideContent`, `.modalContent`) already carry padding and were unaffected.
- **Vanilla dark-mode contrast: semantic colors now have dark variants** — the light-mode semantic palette was reused verbatim on the `#121212` dark surface. `--form-error` (`#d32f2f`) reached only **3.76:1** there, yet it colors _text_ (`.fieldError`, `.validationHint`, `.fieldHint[data-error]`), so it failed the 4.5:1 text threshold — the invalid-field feedback was the least readable part of the form. Dark now maps error/success/warning/info to their lighter variants (`#f44336`, `#66bb6a`, `#ffa726`, `#29b6f6`), measured at **5.09:1** for error. This also removes a contradiction between modules: the form modal already overrode `--form-success` in dark while the message modal overrode none of the four. (Token duplication across the three vanilla modules is deliberate, not cleaned up — each template must stay self-contained since users copy them individually.)

### Fixed (playground UX — Slide Modal Configurator)

- **Changing any option now closes the open panel first** — options re-configure the panel (`direction`/`align` change its animation and positioning, `nonModal`/`portal` change its DOM structure, size changes its box), so a panel left open across a switch **teleported** to the new configuration instead of animating, and structural switches remounted the `<dialog>` mid-flight — half-applied states with transitions that did not survive. Every option setter now closes the panel (reason `config-change`) before applying the change, so the next Open always plays a clean transition from the new configuration. Reproduced and verified with the `dialog-debug` probe: `direction: right → bottom` while open used to jump `420x800@680,0 → 1100x300@0,500` with no animation. (Note this was only reachable in non-modal mode — a modal dialog's backdrop blocks the controls.)
- **SIZE controls now only expose the axes that actually apply** — the cross axis is fully determined by `align: stretch` (it fills the viewport/container), so that axis's number field and slider silently did nothing for the default configuration. The inapplicable axis is now disabled and labelled `(n/a)`, with a caption naming which axis `stretch` is filling and how to enable both. Concretely: `left`/`right` + `stretch` disables Height, `top`/`bottom` + `stretch` disables Width, and any non-stretch align enables both.

### Changed (internal — pure async helpers leave the store module)

- **`safeAwait`, `createMutex`, `createSingleFlight`, and the async-state sentinels moved `store/` → `utils/`** — they are plain framework-agnostic functions that never touched the reactive cell (their only import was `normalizeError`) and are unused by the library's own internals. `store/` is now strictly the state engine — the reactive cell plus its React bindings (`createStore`, `useStore`, `createStoreContext`, `watch`, `shallowEqual`) — which keeps it a clean single swap point. **No public API change:** all of these are still exported from the package barrel, so user-land imports are unchanged.

### Fixed (tooling)

- **`console` no longer flagged in `.claude/` debug scripts** — `no-console` was warning on the `dialog-debug` probe, whose entire output is console-based. Added a `.claude/**/*.{mjs,js}` override in both `.oxlintrc.json` and `eslint.config.js` (the latter also declares Node + browser globals, since these scripts run in Node but `page.evaluate` bodies reference browser globals).

## 2026-07-27

### Removed (breaking — CSS-var theming leaves the core)

- **`--modal-bg` / `--modal-text` scoping dropped from `useModal`** — the core no longer reads those custom properties off `:root` and copies them onto each `<dialog>`'s inline style (the `getScopedCssVars` helper is gone). It was opinionated theming baked into a headless library, and it was **redundant** — custom properties already inherit from `:root` down to the dialog (top layer included) — and **counterproductive**: the inline copy _shadowed_ `:root`, forcing consumers to re-sync open dialogs by hand on every theme change. Style your dialog content with `var(--your-var)` and set the variable on an ancestor (e.g. `:root`); theme changes now cascade to open dialogs automatically. Removed the `getScopedCssVars` export, its unit/CT tests, and the "CSS Variable Scoping" story; the playground `ThemeProvider` dropped its manual per-dialog re-sync.

### Changed (internal — DOM lifecycle decoupled from React)

- **Native-`<dialog>` DOM orchestration extracted to `core/dialog-lifecycle.ts`** — `showDialog()`, `checkTransitionsDisabled()`, and `runDialogExit()` are now framework-agnostic functions operating on a dialog element. `useDialogLifecycle` is a thin React wrapper that wires them to store transitions (phase gating, RAF/`onOpen`, finalization). No behavior change — the DOM logic is now testable in isolation and reusable outside React.

### Fixed (playground)

- **Slide Modal Configurator SIZE pane now drives the panel across the full range** — the `SlideModal.DefaultLayout` template pins horizontal drawers to `minWidth: 320` / `maxWidth: 640`, so configured widths below 320 were silently clamped (a 260 px request rendered at 320) while heights (no `minHeight`) worked. The configurator now overrides `minWidth`/`minHeight` in its size `sx` so width and height apply exactly across every direction, unit, and mode.

## 2026-07-25

### Fixed (behavior change — non-modal + no-portal is now "contained")

Non-modal dialogs never enter the browser's top layer, so an inline (non-portaled) one was positioned with `position: fixed` — which resolves against the nearest **transformed** ancestor, not the viewport. A `transform` anywhere above it (e.g. a card's `:hover { transform }`) hijacked the containing block, so the dialog jumped to that ancestor's box and flickered as the transform toggled. This was most visible on slide panels (the reported case: a `bottom`, non-modal, no-portal slide snapping to the far left).

- **`nonModal: true` + `portal: false` is now "contained"** — the `<dialog>` renders inside a library-owned `position: relative` wrapper and is positioned `absolute` against it. The wrapper is the closest ancestor, so a transformed ancestor above it can no longer capture the containing block — no jump, no flicker. The trade-off: a contained dialog fills (and slides from) its nearest **sized** ancestor rather than the viewport, so its host region must be sized. For a viewport-anchored non-modal panel, set `portal: true` (portaled to `document.body`). Modal dialogs (top layer) and `portal: true` are unchanged.
- **Slide template sizes to the container in contained mode** — `useSlideModal` emits `position: absolute` and `100%` (instead of `100dvw`/`100dvh`) offsets/sizes when non-modal + no-portal.
- **`right`/`bottom` slides no longer "pop" in place instead of sliding** — a contained (non-modal, no-portal) slide starts off-screen via a transform past its anchored edge. For `right`/`bottom` that is a **positive** translate, which pushes the panel past its container's right/bottom edge and **expands the document's scrollable overflow** by that distance; the layout then shifts by exactly the same amount, canceling the transform so the panel appears to zoom/pop in place rather than slide. `left`/`top` use **negative** translates (off the left/top edge, which browsers don't turn into scrollable overflow), which is why only those two animated correctly. `useSlideModal` now opts the contained wrapper into `overflow: clip` (via an internal `clipContainer` flag on `useModal`), so an off-screen slide panel contributes no overflow and every direction animates. (`clip`, not `hidden` — `hidden` still creates a scroll container whose scrollable area a transformed descendant can grow. The clip is opt-in so a container-less non-modal message dialog can still overflow its unsized wrapper and stay visible.)
- **Structural prop changes no longer orphan an open dialog** — a native `<dialog>` can't survive being remounted into a different DOM structure (inline / portal / contained wrapper), so `useModal` tears the modal down when a structural prop flips while open. `portal` was missing from the teardown effect's deps (only `nonModal`/`modalType` were listed), so toggling `portal` on an open modal left an orphaned, still-open dialog blocking the page that couldn't be reopened. `portal` is now a dep, so both structural props behave consistently. (The teardown log was also renamed from the misleading "Unmounting" to "Tearing down open modal", since it fires on structural prop changes too, not only unmount.)
- **Slide directions are now edge-anchored and symmetric** — every direction anchors to its own edge (`left`/`right`/`top`/`bottom: 0`) and slides in/out by 100% of its own size. Previously `right`/`bottom` were positioned against the _far_ edge (`left`/`top: 100%`) with inverted transforms; that left them zero available width/height, so a content-sized (`auto`) panel collapsed to nothing and never animated. `right` and `bottom` slide panels now render and animate correctly in every mode (this also fixed a latent collapse in non-modal `right`/`bottom` slides regardless of portal).
- **Playground** — the Slide Modal Configurator renders the contained combo inside a sized preview stage, and only crossfades a "Loading…" state when there is an actual async open delay (`openDelay > 0`) — with no delay the panel just slides in, instead of a spurious loading flash fading in over the slide. The `non-modal-slide` example already used `portal: true` and is unaffected.

## 2026-07-24

### Changed (breaking — action-controller surface tightened)

The action surface had accumulated overlapping ways to do the same thing and the word "controller" named two different concepts. This pass reserves "controller" for action controllers, collapses to a single action-binding pattern, and hides the internal plumbing.

- **`useModal` option `modalController` → `controller`** — the option that takes a `useModalController` result is now named `controller` (it never took the close handle). Template hooks (`useMessageModal`, `useSlideModal`) take the same renamed option. Migration: rename `modalController: x` → `controller: x`.
- **Close handle renamed to `handle` — one word everywhere** — the `{ close }` object is now called `handle` across the whole surface: the `ModalController` type → `ModalHandle`; `useModal().controller` → `.handle`; the raw render arg `.controller` → `.handle`; and the **template render context field `modal` → `handle`** too (`useMessageModal`/`useSlideModal` now give `render: ({ handle }) => handle.close()`). Migration: `render: ({ controller }) => controller.close()` (raw) or `render: ({ modal }) => modal.close()` (templates) → `render: ({ handle }) => handle.close()`; `const { controller } = useModal(...)` → `const { handle } = useModal(...)`. (The `modal` **log namespace** is a separate thing and is unchanged.)
- **Single action-binding pattern — `<controller.Action>` removed** — the declarative render-prop component is gone; spreading the callable onto your own button is the one pattern (`<Button {...controller.confirm(handler)}>`). Migration: `<controller.Action action="confirm" onAction={h} render={(p) => <Button {...p}>Confirm</Button>} />` → `<Button {...controller.confirm(h)}>Confirm</Button>`.
- **Action callables take an optional handler** — omit the handler to auto-close with the action's reason: `<Button {...controller.cancel()}>Cancel</Button>` (equivalent to the old `<controller.Action action="cancel" render=… />` default). Passing a handler is unchanged.
- **`controller.trigger()` and `controller.getState()` removed** — `trigger` was made vestigial by declared hotkeys (`createActionController(reason, { hotkey })`); `getState` duplicated the reactive `isRunning`/`error` fields, which remain. Read state via `controller.isRunning` / `controller.error`.
- **Internal bridge hidden behind a symbol** — the plumbing `useModal` reads from a controller (`subscribe`, generated `onKeyDown`, `actionHotkeys`, `getState`, and the `_registerClose`/`_unregisterClose` pair) no longer sits on the controller's string-key surface. It rides under a `CONTROLLER_BRIDGE` symbol, so a controller's visible surface (autocomplete, `Object.keys`, `JSON.stringify`) is just the action callables, `isRunning`, and `error`. The bridge object is now stable per controller identity (the modal's close-registration effect runs once instead of every render).
- **Type exports** — removed `ModalController`, `ModalControllerBridge`, and `ModalActionProps` from the public API; added `ModalHandle`. `ActionButtonProps`, `ActionCloseFn`, `ActionControllerMarker`, `ActionKeys`, `HotkeyDef`, and `UseModalControllerReturn` are unchanged.

## 2026-07-23

### Added

- **Complete action lifecycle logging** — `useModalController`'s action engine now logs the whole lifecycle at the single `runAction` chokepoint: `Action started`, `Action close`, and `Action completed` / `Action failed`, each carrying the modal `id` (consistent with every other namespace) and the settle logs an elapsed `ms`. Previously only overlap warnings and failures were logged — without the `id` — so the happy path (start / success / duration) was invisible and failures couldn't be correlated to a modal during a debug session. A failure is logged when the handler **throws or rejects** (the same signal that populates `controller.error`); a handler that swallows its own error logs as `completed`. The **close payload is never logged** — the `Action close` line records only a `withData` boolean, since the payload passed to `close(data)` may carry user data. Emits under the `action` namespace (`localStorage.setItem('dialog:log', 'action')`); zero cost when logging is off. Covered by CT tests, including a regression asserting the payload never reaches a log line.

### Changed (breaking — store loses `update`, `{ name }`, and DevTools)

- **Zero runtime dependencies — zustand and immer removed** — the `src/store/` state layer is now a hand-rolled reactive cell (a `Set` of listeners + `get`/`set`), with an in-house `shallowEqual` (objects/arrays/Maps/Sets). The published bundle drops ~9 kB gzip (immer ~6.3 kB + zustand). React/React-DOM remain the only deps, as peers.
- **`update(draft => …)` removed from the store** — the store carries no draft/immutability engine. Mutation is `set(next | (prev) => next)` and `reset()`. For nested updates, bring your own immer and compose at the call site: `set((s) => produce(s, recipe))`. The library's own internals never used `update`. The playground demonstrates the pattern via a `createImmerStore` helper (`playground/src/shared/lib/immer-store.ts`) that adds a draft-style `update` in ~10 lines; **immer is now a playground devDependency**, never shipped.
- **Redux DevTools bridge and the `{ name }` option removed** — `createStore` no longer connects to Redux DevTools, and `CreateStoreOptions` drops `name` (options are now `{ equals?, context? }`). DevTools is optional debugging surface at odds with the zero-dep, minimal-surface direction; a per-store Redux connection also can't offer coherent cross-store time-travel across many independent stores. `createStoreContext`'s own `{ name }` (Provider display name) is unaffected. The playground's DevTools example was removed and its stores no longer pass `{ name }`.

### Removed

- **UMD build dropped — ESM only** — the package no longer ships a UMD bundle. UMD exists for `<script>`-tag / AMD consumption where React is a browser global, but React 19 no longer ships those globals, so the build was unusable for this React-19-only library; every real consumer (bundlers, ESM CDNs) takes the ESM output. Removed `vite.config.umd.ts`, the `build:umd` script, and the `browser` / `./umd` entries from package `exports`. No source change.

## 2026-07-18

### Changed (breaking — query surface trimmed)

- **`ModalLookup` slimmed from 16 methods to 8** — the has/get/count trio per category is replaced by `getOpen(filter?: 'blocking' | 'non-blocking')` returning open modals sorted by open time. Derive the rest: counts via `.length`, existence via `.length > 0`, closed count via `getClosed().length`. Removed: `hasAnyOpen`, `getOpenCount`, `hasAnyBlockingOpen`, `getBlockingOpen`, `getBlockingOpenCount`, `hasAnyNonBlockingOpen`, `getNonBlockingOpen`, `getNonBlockingOpenCount`, `getClosedCount`.
- **`DialogManagerSnapshot` reduced to `{ openDialogs, foreground }`** — `openDialogs` is now sorted by `openedAt`, so the array index doubles as the stack position (and `getZIndex` uses it). Removed the derivable fields `openCount`, `hasAnyOpen`, `hasAnyBlockingOpen`, `blockingOpenCount`, `hasAnyNonBlockingOpen`, `nonBlockingOpenCount`, and `stackOrder` (with the `StackInfo` type): filter/count `openDialogs` instead (`openDialogs.filter((d) => !d.nonModal)`).

### Fixed

- **`open()` always settles** — calling `open()` while the modal was already open (or opening) returned a promise that never resolved, and a second call during the opening sequence silently discarded the first caller's resolver. `open()` now joins an in-flight open (resolving when `onOpen` completes), resolves immediately when the modal is already open, and pending open promises are flushed if a close interrupts the opening sequence. Regression-tested (`reopen-settles` story).

### Changed (internal simplification — no public API change)

- **Dialog manager lookup reads the snapshot** — all `ModalLookup` collection queries and `getZIndex()` now read from the manager's always-fresh `DialogManagerSnapshot` instead of re-scanning the registry on every call. The snapshot is recomputed on _every_ observed store transition (previously the `'closing'` transition was skipped, so `lookup(id).phase` and `useDialogManager()` could briefly report `'open'` during the close animation).
- **Close reason without side bookkeeping** — the modal store now retains `closeResult` through the `'closed'` phase (reset on the next open), so the manager reads the close reason straight from the store. The `RegistryEntry.lastReason` bookkeeping (capture-on-closing, clear-after-close, redundant write in `dialogManager.close()`) is gone. Side effect fix: `dialogManager.close()` on an already-closing modal no longer mislabels the close event with the new reason.
- **Shared close finalization** — the duplicated close-tail (close native dialog → fire `onClose` → `store.finalize()`) in `useModal`'s unmount cleanup and `useDialogLifecycle`'s animation path is extracted to `finalizeModalClose()` (`src/core/finalize-close.ts`) so the two paths cannot drift.
- **Shared hotkey dispatch** — the duplicated find-button-by-`aria-keyshortcuts` → focus → click sequence in `useModalController.onKeyDown` and `useDialogKeydown`'s window-capture path is extracted to `clickHotkeyButton()` in `hotkey-utils`.
- **Controller ceremony trimmed** — the `registerCloseWithLog`/`getLogId` closures are folded into the action engine (`registerClose(fn, modalId)` + `getModalId()`); `useModal` registers the controller close function in a deps-gated effect that runs once per controller/modal identity instead of on every render.
- **Micro-cleanups** — `dispatchModalEvent` overloads collapsed to one signature; `useSlideModal`'s transform table hoisted to a module constant; pointless spread of `getDialogAnimationStyles()` removed.

### Removed

- **`log.group`** — dead logger API, never called. Logger namespace docs (logger.ts, README, API.md) synced to the namespaces that actually exist: dead `modal:animation` / `modal:events` entries removed, `modal:click-outside` / `outlet` documented.

### Added

- **Dialog manager unit tests** — `src/manager/__tests__/dialog-manager.test.ts` drives fake stores through the full phase machine headlessly: snapshot freshness across every phase (including `'closing'`), open/close event emission with reasons, foreground/stack-order/z-index, blocking vs non-blocking counts, null-object lookups, and unregistered-id no-ops.

## 2026-07-17

### Added

- **Public-repo hygiene** — `LICENSE` (MIT), `.github/workflows/ci.yml` (install / lint+format / type-check / unit / component-in-Playwright-image / build as parallel jobs), `typedoc.json` + `docs:api` script (HTML API docs generated to `docs/api/`, gitignored), and package metadata (`description`, `keywords`, `author`, `license`). The `type-check` script now also covers the playground (`tsc -p playground/tsconfig.json`).
- **Logger sequence ids** — every emitted debug-log line carries a monotonic `#0001`-style id, shared across namespaces, for anchoring a debugging session (note the latest id, act, read forward). Unit-tested.
- **Store hook component tests + stories** — `useStore` (whole-snapshot / selector / options-form overloads) and `createStoreContext` (shared-within-Provider, isolated-across-Providers) now have dedicated `*.ct.tsx` tests with `*.story.tsx` harnesses, registered in a new **Store** section on the playground Stories page.

### Changed (tooling)

- **Lint overhaul, aligned with stardust** — adopted **oxlint** (`.oxlintrc.json`) as a fast first pass with `eslint-plugin-oxlint` disabling the ESLint rules it covers; `lint` is now `oxlint && eslint .` plus `lint:oxlint` / `lint:eslint` / `check` scripts. Removed `eslint-plugin-prettier` — formatting is enforced by `prettier --check`, not as an ESLint rule. Fixed ignore globs (`**/playwright/.cache/**` etc.) so generated artifacts are no longer linted (was 18,837 spurious errors; now 0 errors / 0 warnings).

### Fixed

- **Playground type errors** — MUI v9 `Typography` prop migrations (`fontWeight`/`display`/`gutterBottom` → `sx`), typed `Select<DismissMode>`, and typed store initial states (`reactive-deps`, `dismiss-key`, `vanilla-form`, `Section`). The playground now type-checks with zero errors and is gated in `npm run check`.

### Removed (cleanup)

- Unused devDependencies (`solid-js`, `fast-check`, `react-markdown`, `remark-gfm`, `@types/eslint`, `@types/estree`); added the actually-used `@mui/system`. Removed the dead `store` logger color, the stray `.playwright-targeted-output.txt`, and the dead "Stardust Store" sidebar entry.

### Documentation

- **All docs synced to the new store** — `API.md` store sections rewritten (two-mode `createStore`, `createSingleFlight` modes, `createMutex`, `watch`, `createStoreContext`; removed `useSuspenseStore` / `produce` / `createStoreDispatch` sections), `README.md`, `RATING.md`, `.claude/commands/store-engineer.md`, and `.github/copilot-instructions.md` updated. `UseModalBaseOptions` / `ModalVariant` are now exported (and un-`@internal`ed) so typedoc renders the full `useModal` options; `createStore` regained its JSDoc.

### Changed

- **State layer migrated off Stardust → zustand + immer** — the `@stardust/core` / `@stardust/react` dependency is replaced by an internal [`src/store/`](src/store/CLAUDE.md) module. `createStore`'s reactive cell **is** a zustand vanilla store; `update(draft => …)` uses **immer**; `shallowEqual` re-exports zustand's `shallow`. The facade stays thin — its reason to exist is POJO snapshots (methods beside state, not in it), a flat zustand-style API, `reset()`, context injection, and DevTools opt-in. `src/store/` is the single swap point; nothing else imports zustand or immer directly.
- **Zustand-style flat stores, two modes, no reserved keys** — a **generic** store (`createStore(initial)`) exposes `set`/`update`/`reset` on the instance; a **domain** store (`createStore(initial, builder)`) exposes only your methods (merged flat at the root, `store.close()`), with the built-ins reachable through the builder's `api` (`reset() { api.reset(); }`). The old `{ actions: { … } }` wrapper and the reserved-key check are gone; the store contract simply wins on a name clash.
- **Redux DevTools instead of `connectDebugLog`** — pass `{ name }` to `createStore` and every `set` / `update` / `reset` is reported to the Redux DevTools extension via zustand's `devtools` middleware (diffs, action log, time-travel). The custom `connectDebugLog` console logger is removed.

### Removed

- **`createStoreSubscription`, `createDerivedStore`, `connectDebugLog`, `ReservedStoreKey`, `listenerCount`** — the subscription primitive is unnecessary now that the cell is a zustand store (the dialog manager uses a generic `createStore`); derived state is a zustand selector or inline compute (`useStore(store, s => …)`), not a store primitive; debug logging is DevTools.
- **Stardust helpers made redundant by immer** — `setByPath`/`getByPath` and the path utilities (`PathsOf`, `ValueAtPath`, `copyOnWritePath`, `parsePath`), `createArrayMethods`, `createStoreDispatch`, `createBoundActions`, cached-state, the `produce` re-export, `useSuspenseStore`, and `safeMutex`/`safeSingleFlight` are no longer exported. Mutate immer drafts directly and call store methods by reference for cross-store coordination.

### Added

- **Unit tests for the store utilities** — `createStore` (generic + domain, `set`/`update`/`reset`/context/equality), `watch`, `createMutex`, `createSingleFlight`, `safeAwait`, and the async-state helpers now have `src/store/__tests__/*.test.ts` coverage.

### Changed (tooling)

- **Lint overhaul, aligned with stardust** — adopted [oxlint](https://oxc.rs) (`.oxlintrc.json`) as a fast first pass, with `eslint-plugin-oxlint` disabling the ESLint rules it already covers; `lint` is now `oxlint && eslint .` (plus `lint:oxlint`, `lint:eslint`, `lint:fix`, and a combined `check`). Removed `eslint-plugin-prettier` — formatting is enforced separately via `prettier --check` (`format:check` / `check`) rather than as an ESLint rule. Fixed the ESLint/oxlint ignore globs (`**/dist/**`, `**/playwright/.cache/**`, `**/coverage/**`, …) so generated artifacts are no longer linted. Net effect: `npm run check` reports 0 type errors, 0 lint errors, 0 warnings. (After editing `eslint.config.js`, an IDE ESLint server restart is needed to reload the flat config.)

### Changed (playground)

- **`pharmacy-rx` and `vanilla-zod-form` rewritten onto immer `update()`** — replacing `createArrayMethods`, `setByPath`, `batch`, and `createStoreDispatch`. `pharmacy-rx`'s three `createDerivedStore` projections became inline computed values; the `shared/lib/store-path-helpers.ts` module was removed. Example stores are flattened to zustand-style (no `actions` wrapper) and pass `{ name }` for DevTools.
- **`connectDebugLog` example → Redux DevTools example** — `advanced/examples/connect-debug-log.tsx` is now `devtools.tsx`, demonstrating the `{ name }` option.

## 2026-04-23 — 2026-02-18 · compacted

**41 date blocks and 342 entries, summarised rather than kept.** This range is largely the record of
a _predecessor_ store library — `connectDevtools`, `useSuspenseStore`, `createDerivedStore`,
`connectDebugLog`, `watch`, `deepClone`, `setByPath`, a benchmark suite and a Pharmacy Rx demo. None
of it exists in this package: `src/store/` is a hand-rolled reactive cell with `get`/`set`/`reset`
and nothing else, and `src/CLAUDE.md` names `createDerivedStore` only to say there is no such thing.

Kept in summary because those entries were not describing this library, and a reader searching the
changelog for `watch` found it announced as added. What the range actually contributed here:

- **The store engine** that became `src/store/` — the reactive cell, `batch`, the domain/generic
  overload pair, and the decision to ship no draft engine.
- **The first `<dialog>` work** — `data-modal-type`, dynamic viewport units and safe-area insets,
  and the mobile pass on the playground.
- **The toolchain this repo still runs on** — Vite, TypeScript strict, the React Compiler wiring,
  Prettier, Conventional Commits and Keep a Changelog.

The full text is in git history; `git log -- CHANGELOG.md` reaches every line of it.
