# Playground — Templates & Examples

Interactive demo app, vanilla-first: the learning routes render their dialog interiors with the
vanilla HTML/CSS templates, because the library is headless and the demos should not suggest it goes
with a component library. MUI is the demonstrated _exception_ — one pair of it, the form modal, on
`/ui-integrations` and in `/ui-templates`. One worked pair carries that claim; four charged four
times the upkeep for it.

`umbra-playground` — a private Yarn workspace, never published. **Its UI dependencies live here,
not in the root manifest**, which is the published package's dependency list. Run `yarn install`
once at the repo root; the root's `dev` and `playground:*` scripts delegate here.

It consumes the library through the same public specifiers as any user: `umbra/react` for hooks and
components, `umbra` for anything that must work without React — see
`pages/imperative/examples/deployment-service.ts`. Vite aliases both to `../src`.

**The app itself is React, and stays React**, and `umbra/solid` still costs it no second compiler.
Two places reach it: the microfrontend frame, which has no build step at all (see below), and
`/stories`, whose Solid harnesses are written with `h` for exactly that reason. **What they do cost
is a scope**: the React Compiler decides what a component is by naming convention, so `BasicApp` in
the Solid binding reads as one and gets `react/compiler-runtime` injected — "Invalid hook call" the
moment Solid runs it. `vite.config.ts` excludes `src/solid/` from the babel pass, mirroring
`scripts/vite-plugin-react-compiler.mjs`.

## The microfrontend frame (`public/mfe/` + `mfe-src/` + `vite-plugins/mfe-umbra.ts`)

It has its own route — the frame is the widest thing here and its claim is the peer of stacking or
imperative control, not a card under them.

`/microfrontends` loads a plain HTML page in an iframe: an import map, four `<script type="module">`,
no bundler. Four microfrontends share one `dialogManager` and ask each other for dialogs: Checkout on
`umbra/react`, Support on `umbra/solid`, Billing on `umbra/vanilla` over a `<dialog>` hand-written in
`host.html`, and Audit — a web component whose `<dialog>` lives in a **shadow root**, a different DOM
tree rather than a different framework.

Audit is there because it found things: a shadow boundary changes what `document.activeElement`
reports and which stylesheets apply, and both broke the core. Keep it, and keep its `Escalate`
action throwing — that is the harness for the focus-restore half.

- `mfe-src/*.ts` — one tiny module per specifier the import map names, library and framework alike.
- `vite-plugins/mfe-umbra.ts` bundles **all of them in one rolldown build**, so code-splitting
  hoists what they share — the manager included — into a chunk each entry imports. Separate builds
  would give separate registries and the demo's central claim would be false. It serves them from
  `/mfe/*.mjs` in dev (rebuilding when `src/` or `mfe-src/` changes) and emits them at build time.
- The scripts in `public/mfe/` are served verbatim, which is why they use `createElement` and `h`
  rather than JSX: nothing compiles them, and that is the point being made. `log.js` is the only
  shared helper left there.

Adding a fifth means a panel in `host.html`, a script beside the others, a `codeSamples` entry and a
card on the route — no new build wiring, and no height tuning either, since the frame sizes itself
from the document inside (`host-frame.tsx`) rather than from breakpoints.

## Architecture (Feature-Sliced Design)

```
playground/src/
├── app/         # main.tsx, router.tsx, providers (ThemeProvider, CodePaneProvider)
├── pages/       # one slice per route, each with ui/ + (optional) examples/ + index.ts
├── widgets/     # root-layout, top-bar, sidebar, code-viewer
├── entities/    # example (Card/Grid/Layout/Section/StoryCard), modal-template (mui + vanilla)
├── shared/
│   ├── ui/      # PageLayout, SectionNav, CodeBlock, LoadingButton, ResultDisplay, ViewCodeButton
│   └── lib/     # simulate-api-call, use-overflow, createResultStore, section-slug,
│                 # async-state, safe-await, mutex, single-flight (copyable patterns)
```

Cross-slice imports use the `@/<layer>/<slice>` alias and never reach into `ui/`/`model/` segments.
Imports flow downward only: app → pages → widgets → entities → shared.

**Both halves are a gate** ([\_\_tests\_\_/fsd-layers.test.ts](src/__tests__/fsd-layers.test.ts)),
because as prose neither held: a sweep found `shared/ui` reaching up into `app` for a provider and
thirty cross-slice imports going straight at a `ui/` file whose barrel already exported the name.
**A context two layers both read belongs in `shared/lib`** — `theme-context` and
`code-pane-context` are there, with their providers left in `app` where composing them is the job.

Two exemptions, each a decision rather than a leak:

- **`?raw` imports are asset reads.** The `code-samples/` modules name every example's source _as
  text_; they call and render nothing. The alternative is a generated registry.
- **`entities/modal-template` has no public entry on purpose** — its barrel re-exports nothing. The
  templates are a directory tree because that is the shape they are copied out in, and
  `import * as MessageModal from '…/mui/message-modal'` names the flavour. A barrel would flatten
  the distinction the slice exists to make.

**Reach into the library through `umbra/…`, never through `../../../../../src/…`.** The `/stories`
page renders the library's own CT harnesses and the code viewer shows their source, so two files
here import from `src/**/__tests__/` — both through the alias, since a deep relative climb is
hostage to where a library file happens to sit today.

**A page slice owns its own examples.** `pages/<route>/examples/` may only be imported by
`pages/<route>/ui/`. Page-to-page imports are an FSD violation — if two routes need the same
example, it belongs in `entities/`.

## The design system — Penumbra (`src/app/styles/`)

**The sheet is split so the base can travel**: `tokens.system.css` is scale, motion and stacking
with no brand in it, `tokens.skin.css` is the eclipse palette and the three typefaces, and
`app.css` imports both and adds the baseline.

**The split is a gate, not prose** —
[design-system-layering.test.ts](src/__tests__/design-system-layering.test.ts) fails on a colour or
typeface in the system file, a `--app-*` inside the templates, or any Material easing or MD2 metric.
Porting Penumbra elsewhere is: copy the system file, write a new skin.

- **Colours** are `--app-*` on `:root`, dark overriding under `:root[data-color-scheme='dark']`
  (set by `ThemeProvider`). Components never branch on mode.
- **Sizes are tokens too — a component asks for a step, never a pixel count.** Space, the ramp
  (~1.22 off a 15px body), line height, tracking, radii and layout each have a family; an off-scale
  literal says why.
- **Motion is tokens** (`--app-quick/duration/slow`, `--app-ease/-out/-in`); **elevation is
  `--app-lift`, light `--app-glow`** — one hairline, one shadow, the glow only on the live thing.
  Never a `cubic-bezier` literal, never a transition on `color`.
- **Breakpoints cannot be tokens** (media queries resolve first): **600px** and **900px**.
- **Three voices**: Newsreader on `h1`–`h3` and the wordmark, Geist elsewhere, Geist Mono for code
  and eyebrows. Self-hosted and preloaded — a cross-origin swap re-lays out every block of text.
  Regenerate with `scripts/fetch-fonts.mjs`.
- **Sentence case, except a mono eyebrow** — uppercase on a button is a component library's
  signature; on a mono group label it is a typographic device.
- **Primitives** live in `shared/ui` — `AppButton`/`AppIconButton` + `appButtonClass`, the `icons`
  set, `EclipseMark`, `MoonPhase`, `SurfaceCard`, `SelectionDropdown` and the layout pieces.
- **The MUI island** (`shared/ui/MuiIsland` + `shared/lib/mui-theme.ts`) is **the subject, not a
  leftover**, and stays Material-looking on purpose. Scoped to the one card that needs it.
- The vanilla **templates** keep their own token families, are deliberately unbranded, and may not
  touch the shell's sheet — they are copied into apps where it does not exist.

**One button recipe**: what cannot be an `AppButton` takes
[`appButtonClass`](src/shared/ui/AppButton/buttonRecipe.ts).

**The three marks are not interchangeable** — see
[`EclipseMark`](src/shared/ui/EclipseMark/EclipseMark.tsx).

## Routes

`Sidebar.tsx` owns the grouping and the reading order. What each route is _for_ — the half that
decides where a new example goes:

| Route              | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `/getting-started` | The core open → render → close loop                       |
| `/modal-actions`   | Action state: `hasRunningAction`, `error`, hotkeys        |
| `/slide-modal`     | The four slide shapes as presets, and the toast           |
| `/stacking`        | Who is in front, and who owns the keyboard                |
| `/imperative`      | Opening and rendering from outside the component          |
| `/interop`         | Foreign observers, and a render with no document          |
| `/showcases`       | Whole flows, assembled                                    |
| `/microfrontends`  | Four bindings, one manager, no build step                 |
| `/ui-integrations` | The vanilla set, and one MUI pair that is the whole claim |
| `/ui-templates`    | Copy-paste index: Material UI / Vanilla / Shared          |
| `/design-system`   | Penumbra, read live from the token sheet — never restated |
| `/api`             | Generated reference — a map, then a page per category     |
| `/stories`         | Live `*.story.tsx` harnesses from the CT suite            |
| `/warzone`         | Unlisted scratch surface, empty on purpose — see below    |

## `/warzone` is empty, and stays empty

**Unlisted** — a menu entry that rewards a click with nothing teaches every visitor that one item is
not for them. Type the route.

A scratch surface for building a flow against the core and watching it behave: a reproduction, an
arrangement nobody has tried. It starts becoming a demonstration the moment it explains itself, so
what lands there is temporary by construction — prove the point, then take it apart. Anything worth
keeping graduates to a real route with a card and a `codeSamples` entry.

It renders the still `UmbraMoon`, so **`RootLayout` suppresses `PeekingMoon` here** as on `/`: a
mascot whose joke is hiding cannot share a screen with a full-size twin.

## The API reference is generated

`/api` is not hand-written. `vite-plugins/api-model.ts` runs typedoc over the library's entry points,
projects its ~470 kB graph down to what a reference page shows, and serves it as
`virtual:dialog-api`. The pages render with `SurfaceCard` and `CodeBlock` like every other — one
design system rather than an iframed second one. It regenerates when `src/` changes, so a JSDoc edit
appears in about five seconds and an added `@example` needs no playground change.

**Two routes**: `/api` is the map (start-here links, a card per category) and `/api/$category` is a
chapter — around ten symbols, each with its signature, prose, members and examples. Both render
inside `ApiLayout`: a sticky rail carrying fuzzy search and the contents, the reading column beside
it.

**The category table is the IA.** `CATEGORIES` maps every export to a page, in reading order, with
its label and blurb. It is hand-written because the grouping a reader wants is the one the entry
points declare in their section banners and typedoc carries none of it — `src/utils/` alone holds
four chapters. **A new export must be added there**: `buildModel` throws on an uncategorised export,
which would otherwise be unreachable.

**All four entry points are documented, and a symbol's identity is `specifier#name`.** A bare name
is not one: `useModal` is three declarations and `UseModalOptions` three aliases, so keying on the
name shows one binding's signature under another's specifier. Two things follow:

- **A shared type is one reflection.** `core/types.ts` is named by every binding but declared once,
  so typedoc materialises it under the first entry point that names it. `declarationFor` falls back
  to that declaration, and only when there is exactly one — two declarations of a name are two
  different types.
- **Links follow the category table, not the declaration.** `PrintContext.resolve` asks where
  `CATEGORIES` renders a name for _this_ specifier, then for the core. So `UseModalOptions` in a
  Solid signature links to the Solid chapter and `ModalPhase` beside it links to the core's,
  whichever module typedoc happened to walk first.

Beyond the doc comments the projection adds a **printed signature** per symbol with every referenced
export linkable (the printer warns at build time on a `type` discriminant it does not cover rather
than printing a plausible-but-wrong line), **members with their types**, and **reflowed prose** —
the 100-column source wrap becomes browser wrapping, while blank lines, list markers and every
newline inside an `@example` are left alone.

A symbol is a URL, built by `categoryHref` + `symbolAnchor` in `pages/api/model/api-index.ts`. The
page never constructs a key — the plugin mints them and the page resolves one with `symbolFor`. The
**anchor** stays the bare name: a category renders one specifier, so `api-useModal` is unique on its
page and is what a reader can guess and share.

## Modals are declared in one place

[`src/app/modal-registry.ts`](src/app/modal-registry.ts) names every modal and what it closes with,
so **a call site writes no type arguments** — writing them selects the other overload and lets the
two drift. Add a modal, add a line. Not enforced complete, which is what lets `/stories` render the
library's own harnesses.

## Page composition

Every page is built from the same three pieces — do not hand-roll headings or grids:

```tsx
<PageLayout title="…" description="…" actions={optionalControls}>
  <SectionNav sections={SECTIONS} />        {/* long pages only */}
  <ExampleSection title="…" description="…">
    <ExampleGrid columns={2}>              {/* 1 for wide demos, 2 (default) otherwise */}
      <ExampleCard … />
    </ExampleGrid>
  </ExampleSection>
</PageLayout>
```

- `ExampleSection` stamps an anchor id (`sectionSlug(title)`, override with `id`) so sections are
  deep-linkable and reachable from `SectionNav`.
- `ExampleGrid` is the only card grid; `PageLayout` owns the page's single `<h1>`, which the top bar
  deliberately does not.

**`position: sticky` caveat:** no ancestor of the page content may declare `overflow`. It creates a
scroll container that never scrolls and silently disables sticky for `SectionNav`. `RootLayout`
carries a comment guarding this.

## Colour is measured, not chosen

The palette is held to **WCAG 2.2 AA**, checked in a real browser rather than by reading the theme:
`node .claude/skills/wcag-audit/audit.mjs --attach --route … --focus` (PowerShell on Windows — Git
Bash rewrites a bare `/` argument into a path). Run it after any edit to colours, tokens or a
component's theme. Ten routes × both schemes is currently clean, dialogs and focus rings included.

Two things it caught that source review had not, and both are the reason it exists:

- **A component library can resolve a token against you.** MUI derives `contrastText` through
  `contrastThreshold`, which defaults to **3** — AA for large text only. White scores 3.19:1 on the
  amber and got picked, so every contained button shipped at 3.19:1 under a palette that looked
  deliberate. The threshold is 4.5 here and `primary.contrastText` is stated outright.
- **`opacity` never appears in a computed `color`.** A ratio measured without it is a ratio of a
  pixel nobody sees.

Three rules follow, and they are where a new colour goes:

- **`--app-flame` is a fill; `--app-accent` is the text** (`primary.main` and `accent.onSurface`
  inside the island). Amber on the page is 3.19:1 — never write `color: var(--app-flame)`.
- **A filled primary brightens on hover, it does not deepen** — `--app-primary-hover`, named for
  the rule. The ink on it is dark, so a deeper amber underneath is 2.5:1.
- **The vanilla templates are copied into other people's apps**, so a failure there propagates.
  Their control boundaries (`--*-control-border`) are a separate token from the layout hairline
  (`--*-border`) because 1.4.11 asks 3:1 of the first and nothing of the second; the shell makes the
  same split (`--app-control-border` against `--app-divider`).

Keyboard focus is part of the same gate. There is **one** global ring, declared in `app.css` as
`body :focus-visible` — the descendant selector is load-bearing, since `.MuiButtonBase-root` zeroes
the outline at equal specificity and is injected later. Do not add per-component focus styles.

## Templates (`src/entities/modal-template/ui/`)

Reference UI — not exported from the library; users copy them into their projects. **Vanilla**
(`vanilla/`) covers every family in pure HTML/CSS with CSS modules and dark mode; **MUI** (`mui/`) is
`form-modal/` plus the `shared/` atoms it uses. Both spell the same component names, so that example
ports by changing one import. All layouts use children-based composition:

```tsx
<MessageModal.DefaultLayout>
  <MessageModal.Header>…</MessageModal.Header>
  <MessageModal.Content>…</MessageModal.Content>
  <MessageModal.Footer>…</MessageModal.Footer>
</MessageModal.DefaultLayout>
```

## Adding an Example

Single file per example — component + "View Code" source.

1. **Create** `src/pages/<route>/examples/<name>.tsx` — hooks from `umbra/react`, templates from
   `@/entities/modal-template/ui/{mui,vanilla}/…`, wrapped in `ExampleLayout`. Unique modal ids.
2. **Register** the `?raw` import in
   [code-samples/examples.ts](src/widgets/code-viewer/model/code-samples/examples.ts) — a route's
   own example always goes there. Which of the three modules takes a sample is on
   [codeSamples.ts](src/widgets/code-viewer/model/codeSamples.ts).
3. **Add** an `<ExampleCard>` inside an `<ExampleSection>` on the route's page component.

Step 3 is not optional. An example registered in `codeSamples` but not placed on a page still
builds, type-checks and ships, and nobody can reach it. Nothing fails; it simply does not exist.

**A step 4 applies whenever the example demonstrates a new library export**: add that export to
`CATEGORIES` in [api-model.ts](vite-plugins/api-model.ts). `buildModel` throws on an export
belonging to no category, so `/api` answers **500** — and `yarn check` cannot see it, because the
route is generated at serve time. `node scripts/smoke-playground.mjs` against a running dev server
is what catches it, and is the check to run before believing an example is done.

**The source-code viewer shows source and nothing else.** Its header is a title, the key and Close;
a control that fires the example belongs on the card.

### Name the dialog

**Every example gives its dialog an accessible name.** Without one it is announced as just "dialog",
the commonest defect in a dialog implementation and the one these examples would teach. Nothing
enforces it — a lint rule cannot see whether an `ariaLabelledBy` points at an element that exists,
and one that only checks the option is present blesses `ariaLabel: ''`.

The convention is derived from the id you already wrote, so there is nothing to invent:

```tsx
const MODAL_ID = 'delete-item';

useMessageModal({
  id: MODAL_ID,
  ariaLabelledBy: `${MODAL_ID}-title`,
  render: () => <MessageModal.Title id={`${MODAL_ID}-title`}>Delete item</MessageModal.Title>,
});
```

`ariaLabelledBy` whenever a title is already on screen — a name written twice is a name that
drifts, which is why every `Title` and `Heading` component in `entities/modal-template/` takes an
`id`. Use `ariaLabel` in the two cases where a reference would lie: the heading **disappears** in
some state (`getting-started/examples/async-open.tsx` renders only a spinner while loading), or it
**changes** while the dialog is open (`modal-actions/examples/per-action-state.tsx` goes from
"Ready to publish" to "Publishing…"; a name that moves under the user disorients).

`role: 'alertdialog'` is for a dialog that **interrupts** — a destructive confirm, a blocking error
— and it always travels with `ariaDescribedBy`, because an alertdialog is announced with its
description rather than waiting to be read. So the described element has to be worth interrupting
for: `modal-actions/examples/focus-on-open.tsx` is a delete confirm and deliberately stays a plain
dialog, its body text being commentary about focus. Reaching for the interrupting role on every
confirm is how it stops meaning anything.

Verify in a browser rather than by reading: open the dialog and check the **computed** name in the
accessibility pane, not the attribute. A reference pointing at an id nobody rendered looks correct
in the source and leaves the dialog anonymous.

## Managing Template Components

Keep the **UI Templates** page (`src/pages/ui-templates/ui/UITemplatesPage.tsx`) in sync:

1. Add the `?raw` import in `code-samples/templates.ts` — that module is this page's group. Keys are
   `template-<group>-<name>` for MUI, `vanilla-<group>-<name>` for vanilla, `shared-component-<name>`
   for playground UI. **The key is a label, not the routing**: `vanilla-form` is a `/ui-integrations`
   example and belongs in `examples.ts`, because the module is decided by the path the source is
   read from.
2. Add the entry to `MUI_GROUPS`, `VANILLA_GROUPS`, or — if it renders nothing and therefore works
   under either flavour — `PATTERNS_GROUP`, which the **Shared** tab shows alongside
   `PLAYGROUND_GROUP`. That third tab is the honest home for everything that is not a flavour.
3. On removal/rename: update the import, the `codeSamples` entry, and the group entry together.

CSS-module samples use the `-styles` key suffix — the viewer keys its syntax highlighting off it, so
renaming it silently downgrades a stylesheet to TSX highlighting.

## Shared Utilities

- `ExampleCard` / `ExampleGrid` / `ExampleLayout` / `ExampleSection` / `StoryCard` — `@/entities/example`
- `PageLayout`, `SectionNav` — `@/shared/ui/…`
- `simulateApiCall` — mock async helper (`@/shared/lib/simulate-api-call`)
- `asyncState` / `safeAwait` / `createMutex` / `createSingleFlight` / `useQuery` / `useForm`
  (`@/shared/lib/…`) — patterns a user copies, deliberately not shipped. `useForm` is the one the
  two `/ui-integrations` form cards share, which makes that pair's claim — same hook, two markups —
  literally true rather than two implementations that agree.
- `CodePaneProvider` (`@/app/providers/…`) + `useCodePane` (`@/shared/lib/code-pane-context` —
  `ViewCodeButton` is `shared/ui` and may not reach a widget, so the code-viewer barrel names the
  rule and deliberately does not re-export it)

## Testing

**Pages and examples do not need tests; `shared/lib/` does.** A card that renders a modal is covered
by the library's own suite and by `yarn smoke`. A helper in `shared/lib/` is different in kind: it is
written to be **copied into someone else's project**, which is a claim that it works, and thirteen
already carry tests in `shared/lib/__tests__/`.

A pure helper gets a `*.test.ts` in the unit project; a hook gets a `*.ct.tsx` with a story beside
it, the way `use-store` and `use-form` do. Anything under `pages/` is out of scope — see root
[CLAUDE.md](../CLAUDE.md#testing) for the library's own split.
