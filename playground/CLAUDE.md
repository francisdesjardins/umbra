# Playground — Templates & Examples

Interactive demo app, vanilla-first: the learning routes (`/getting-started`, `/modal-actions`,
`/slide-modal`, `/stacking`) render their dialog interiors with the vanilla HTML/CSS templates —
the library is headless, and the demos should not suggest it goes with a component library. MUI is
the demonstrated _exception_, and one pair of it — the form modal, on `/ui-integrations` and in
`/ui-templates`. One worked pair carries that claim; four charged four times the upkeep for it.

`umbra-playground` — a private Yarn workspace, never published. **Its UI dependencies
live here, not in the root manifest**, which is the published package's dependency list: MUI,
Emotion, TanStack Router, zod, immer and react-syntax-highlighter are demo-only and must stay
out of the root. Run `yarn install` once at the repo root to install both packages; the root's
`dev` and `playground:*` scripts delegate here.

It consumes the library through the same public specifiers as any user: `umbra/react`
for hooks and components, and `umbra` (the root) for anything that must work without
React — see `pages/imperative/examples/deployment-service.ts`. Vite aliases both to `../src`.

**The app itself is React, and stays React** — and `umbra/solid` still costs it no second compiler.
Two places reach it: the microfrontend frame, which has no build step at all (see below), and
`/stories`, whose Solid harnesses are written with `h` for exactly that reason. **What they do cost
is a scope**: the React Compiler decides what a component is by naming convention, so `BasicApp` in
the Solid binding reads as one and gets `react/compiler-runtime` injected — "Invalid hook call" the
moment Solid runs it. `vite.config.ts` excludes `src/solid/` from the babel pass, the playground's
copy of the scoping the library build states in `scripts/vite-plugin-react-compiler.mjs`.

## The microfrontend frame (`public/mfe/` + `mfe-src/` + `vite-plugins/mfe-umbra.ts`)

It has its own route, `/microfrontends` — the frame is the widest thing here and the claim it
makes is the peer of stacking or imperative control, not a card under them.

`/microfrontends` loads a plain HTML page in an iframe: an import map, four
`<script type="module">`, no bundler. Four microfrontends share one `dialogManager` and ask each
other for dialogs: Checkout on `umbra/react`, Support on `umbra/solid`, Billing on `umbra/vanilla`
over a `<dialog>` written by hand in `host.html`, and Audit — a web component whose `<dialog>`
lives in a **shadow root**, which is a different DOM tree rather than a different framework.

Audit is there because it found things: a shadow boundary changes what `document.activeElement`
reports and which stylesheets apply, and both broke the core. Keep it, and keep its `Escalate`
action throwing — that is the harness for the focus-restore half.

- `mfe-src/*.ts` — one tiny module per specifier the import map names (`umbra`, `umbra/react`,
  `umbra/solid`, `umbra/vanilla`, `react`, `react-dom/client`, `solid-js`, `solid-js/web`,
  `solid-js/h`).
- `vite-plugins/mfe-umbra.ts` bundles **all of them in one rolldown build**, so code-splitting
  hoists what they share — the manager included — into a chunk each entry imports. Separate builds
  would give separate registries and the demo's central claim would be false. It serves them from
  `/mfe/*.mjs` in dev (rebuilding when `src/` or `mfe-src/` changes) and emits them at build time.
- The scripts in `public/mfe/` are served verbatim, which is why they use `createElement` and `h`
  rather than JSX: nothing compiles them, and that is the point being made. `log.js` is the only
  shared helper left there — driving Billing's hand-written dialog used to be forty lines beside
  it, and is now `umbra/vanilla`.

Adding a fifth means a panel in `host.html`, a script beside the others, a `codeSamples` entry and
a card on the route — no new build wiring. The frame sizes itself from the document inside
(`host-frame.tsx`) rather than from breakpoints, so a new panel needs no height tuning either.

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

Use the `@/<layer>/<slice>` path alias for cross-slice imports — never reach into `ui/`/`model/`
segments. Imports flow downward only: app → pages → widgets → entities → shared.

**Both halves are a gate now** ([\_\_tests\_\_/fsd-layers.test.ts](src/__tests__/fsd-layers.test.ts)),
because as prose neither held: a sweep found `shared/ui` reaching up into `app` for a provider, a
widget doing the same for two, and thirty cross-slice imports going straight at a `ui/` file whose
barrel already exported the name. **A context two layers both read belongs in `shared/lib`** —
`theme-context` and `code-pane-context` are there for exactly that, with their providers left in
`app` where composing them is the job.

Two exemptions, each a decision rather than a leak:

- **`?raw` imports are asset reads.** The `code-samples/` modules name every example's source _as
  text_; they call and render nothing. The alternative is a generated registry to regenerate on
  every example added.
- **`entities/modal-template` has no public entry on purpose** — its own barrel says so and
  re-exports nothing. The templates are a directory tree because that is the shape they are copied
  out in, and `import * as MessageModal from '…/mui/message-modal'` is the form that names the
  flavour. A barrel would flatten the distinction the slice exists to make.

**Reach into the library through `umbra/…`, never through `../../../../../src/…`.** The `/stories`
page renders the library's own CT harnesses and the code viewer shows their source, so two files
here import from `src/**/__tests__/`. Both go through the alias — a deep relative climb is a
silent hostage to where a library file happens to sit today, and it broke on the first move that
came along.

**A page slice owns its own examples.** `pages/<route>/examples/` may only be imported by
`pages/<route>/ui/`. Page-to-page imports are an FSD violation — if two routes need the same
example, it belongs in `entities/`.

## The design system — Penumbra (`src/app/styles/`)

**The sheet is split so the base can travel**: `tokens.system.css` is scale, motion and stacking
with no brand in it, `tokens.skin.css` is the eclipse palette and the three typefaces, and
`app.css` imports both and adds the baseline.

**The split is a gate, not prose** —
[design-system-layering.test.ts](src/__tests__/design-system-layering.test.ts) fails on a colour or
typeface in the system file, a `--app-*` inside the templates, or any Material easing or MD2 metric
anywhere. Porting Penumbra elsewhere is: copy the system file, write a new skin.

- **Colours** are `--app-*` on `:root`, dark overriding under `:root[data-color-scheme='dark']`
  (set by `ThemeProvider`). Components never branch on mode.
- **Sizes are tokens too — a component asks for a step, never a pixel count.** Space, the ramp
  (~1.22 off a 15px body), line height, tracking, radii and layout each have a family in
  `tokens.system.css`; an off-scale literal says why.
- **Motion is tokens** (`--app-quick/duration/slow`, `--app-ease/-out/-in`); **elevation is
  `--app-lift`, light `--app-glow`** — one hairline, one shadow, the glow only on the live thing.
  Never a `cubic-bezier` literal, and never a transition on `color`.
- **Breakpoints cannot be tokens** (media queries resolve first): **600px** and **900px**.
- **Three voices**: Newsreader on `h1`–`h3` and the wordmark, Geist elsewhere, Geist Mono for code
  and eyebrows. Self-hosted and preloaded — a cross-origin swap re-lays out every block of text.
  Regenerate with `scripts/fetch-fonts.mjs`.
- **Sentence case, except a mono eyebrow** — uppercase on a button is a component library's
  signature; on a mono group label it is a typographic device.
- **Primitives** in `shared/ui`: `AppButton`/`AppIconButton` + `appButtonClass`, the `icons` set,
  `EclipseMark`, `MoonPhase`, `SurfaceCard`, `PageLayout`, `SectionNav`, `ResultDisplay`,
  `LoadingButton`, `ViewCodeButton`, `ThemeToggleButton`.
- **The MUI island** (`shared/ui/MuiIsland` + `shared/lib/mui-theme.ts`) is **the subject, not a
  leftover**, and stays Material-looking on purpose. Scoped to the one card that needs it.
- The vanilla **templates** keep their own token families, are deliberately unbranded, and may not
  touch the shell's sheet — they are copied into apps where it does not exist.

**One button recipe**: what cannot be an `AppButton` takes
[`appButtonClass`](src/shared/ui/AppButton/buttonRecipe.ts).

**The three marks are not interchangeable** — see
[`EclipseMark`](src/shared/ui/EclipseMark/EclipseMark.tsx).

## Routes

Grouped in the sidebar; the order is the intended reading order.

| Group     | Route              | Purpose                                                    |
| --------- | ------------------ | ---------------------------------------------------------- |
| Learn     | `/getting-started` | The core open → render → close loop                        |
| Learn     | `/modal-actions`   | Action state: `hasRunningAction`, `error`, hotkeys         |
| Patterns  | `/slide-modal`     | The four slide shapes as presets, and the toast            |
| Patterns  | `/stacking`        | Who is in front, and who owns the keyboard                 |
| Patterns  | `/imperative`      | Opening and rendering from outside the component           |
| Patterns  | `/interop`         | Foreign observers, and a render with no document           |
| Patterns  | `/showcases`       | Whole flows, assembled                                     |
| Patterns  | `/microfrontends`  | Four bindings, one manager, no build step                  |
| Reference | `/ui-integrations` | The vanilla set, and one MUI pair that is the whole claim  |
| Reference | `/ui-templates`    | Copy-paste index: Material UI / Vanilla / Shared           |
| Reference | `/design-system`   | Penumbra, read live from the token sheet — never restated  |
| Reference | `/api`             | Generated API reference — a map, then a page per category  |
| Testing   | `/stories`         | Live `*.story.tsx` harnesses from the component test suite |
| Testing   | `/warzone`         | Unlisted scratch surface, empty on purpose — see below     |

## `/warzone` is empty, and stays empty

**Unlisted**, because a menu entry that rewards a click with nothing teaches every visitor that one
item is not for them. Type the route.

A scratch surface for building a flow against the core and watching it behave — a reproduction, an
arrangement nobody has tried, something shown before it is worth a card. It starts becoming a
demonstration the moment it explains itself, so what lands there is temporary by construction:
prove the point, then take it apart. Anything worth keeping graduates to a real route with a card
and a `codeSamples` entry.

It renders the still `UmbraMoon` the landing page uses as its hero, so **`RootLayout` suppresses
`PeekingMoon` on this route** for the same reason it does on `/` — a mascot whose joke is that it
is hiding cannot share a screen with a full-size twin. A second route needing that exemption is why
the flag there is named for the condition rather than for the homepage.

## The API reference is generated

`/api` is not hand-written. `vite-plugins/api-model.ts` runs typedoc over the library's entry
points, projects its ~470 kB graph down to what a reference page shows, and serves it as
`virtual:dialog-api`. The pages render with `SurfaceCard` and `CodeBlock` like every other page
— one design system rather than an iframed second one.

It regenerates when `src/` changes, so `yarn dev` picks up a JSDoc edit in about five seconds
(typedoc has to re-run). Adding an `@example` to an export makes it appear there with no
playground change at all.

**Two routes**: `/api` is the map (start-here links, a card per category) and `/api/$category`
is a chapter — around ten symbols, each with its signature, prose, members and examples. Both
render inside `ApiLayout`: a sticky rail on the left carrying fuzzy search and the table of
contents, the reading column on the right.

**The category table is the IA.** `CATEGORIES` in the plugin maps every export to a page, in
reading order, with the label and blurb the page shows. It is hand-written because the grouping
a reader wants is the one the entry points already declare in their section banners, and
typedoc carries none of it — `src/utils/` alone holds four chapters. **A new export must be
added there**: `buildModel` throws on any export that belongs to no category, because an
uncategorised one would be unreachable in the reference.

**All four entry points are documented, and a symbol's identity is `specifier#name`.** A bare
name is not one: `useModal` is three different declarations, `UseModalOptions` is three different
aliases, and keying on the name shows one binding's signature under another's specifier. Two
things follow, and both are load-bearing:

- **A shared type is one reflection.** `ModalHandle`, `ActionOptions`, `SlideDirection` and the
  rest of `core/types.ts` are named by every binding but declared once, so typedoc materialises
  them under the first entry point that names them and emits references from the others.
  `declarationFor` falls back to that single declaration — and only when there is exactly one,
  because two declarations of a name are two different types.
- **Links follow the category table, not the declaration.** `PrintContext.resolve` asks where
  `CATEGORIES` renders a name for _this_ specifier, then for the core. So `UseModalOptions` in a
  Solid signature links to the Solid chapter and `ModalPhase` in the same signature links to the
  core's, whichever module typedoc happened to walk first.

What the projection adds beyond the doc comments:

- **A printed signature** per symbol, with every referenced export kept linkable. The printer
  covers each `type` discriminant typedoc emits and warns at build time on anything else rather
  than printing a plausible-but-wrong line.
- **Members with their types** — object properties, a const object's entries (`Key`), a
  component's destructured props, and both halves of an `A & { … }` intersection.
- **Reflowed prose**: the source's 100-column hard wrap becomes browser wrapping, while blank
  lines and list markers are left alone. `@example` blocks keep every newline — they are code.

A symbol is a URL: `categoryHref` + `symbolAnchor` in `pages/api/model/api-index.ts` build every
link in the reference, including the ones inside signatures and `{@link}` prose. The page never
constructs a key — the plugin mints them and the page treats them as opaque ids, resolving one
with `symbolFor`. `symbolAt(specifier, name)` is the one door for a link that starts from
neither, which is the start-here row on `/api`. The **anchor** stays the bare name: a category
renders one specifier, so `api-useModal` is unique on the page it lives on and is what a reader
can guess and share.

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

- `ExampleSection` stamps an anchor id (`sectionSlug(title)`, override with `id`) so sections
  are deep-linkable and reachable from `SectionNav`.
- `ExampleGrid` is the only card grid. Pass `columns={1}` for wide demos and showcases.
- `PageLayout` owns the single `<h1>` on the page — the top bar deliberately does not.

**`position: sticky` caveat:** no ancestor of the page content may declare `overflow` (auto or
hidden). It creates a scroll container that never scrolls and silently disables sticky for
`SectionNav`. `RootLayout` carries a comment guarding this.

## Colour is measured, not chosen

The palette is held to **WCAG 2.2 AA**, and the check is a real browser rather than a reading of
the theme: `node .claude/skills/wcag-audit/audit.mjs --attach --route … --focus` (PowerShell on
Windows — Git Bash rewrites a bare `/` argument into a path). Run it after any edit to colours,
tokens or a component's theme. Ten routes × both schemes is currently clean, dialogs included,
and every focusable element draws a ring.

Two things it caught that source review had not, and both are the reason it exists:

- **A component library can resolve a token against you.** MUI derives `contrastText` through
  `contrastThreshold`, which defaults to **3** — AA for large text only. White scores 3.19:1 on the
  amber and got picked, so every contained button shipped at 3.19:1 with a palette that looked
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
  (`--*-border`) because 1.4.11 asks 3:1 of the first and nothing of the second. The shell makes
  the same split (`--app-control-border` against `--app-divider`) — an `<input>` bordered with the
  hairline is the one thing the last audit caught.

Keyboard focus is part of the same gate. There is **one** global ring, declared in `app.css` as
`body :focus-visible` — the descendant element is load-bearing, since `.MuiButtonBase-root` zeroes
the outline at equal specificity and is injected later, so the island's buttons would silently get
no ring. Do not add per-component focus styles.

## Templates (`src/entities/modal-template/ui/`)

Reference UI — not exported from the library. Users copy them into their projects.

- **Vanilla** (`vanilla/`): every family, pure HTML/CSS with CSS modules + dark mode
- **MUI** (`mui/`): `form-modal/` and the `shared/` atoms it uses

Both spell the same component names, so that example ports by changing one import. All layouts use
children-based composition:

```tsx
<MessageModal.DefaultLayout>
  <MessageModal.Header>…</MessageModal.Header>
  <MessageModal.Content>…</MessageModal.Content>
  <MessageModal.Footer>…</MessageModal.Footer>
</MessageModal.DefaultLayout>
```

## Adding an Example

Single file per example — component + "View Code" source.

1. **Create** `src/pages/<route>/examples/<name>.tsx` — import hooks from `umbra/react`,
   templates from `@/entities/modal-template/ui/{mui,vanilla}/...`, wrap in `ExampleLayout`
   from `@/entities/example`. Use unique modal `id` values.
2. **Register** the `?raw` import in
   [code-samples/examples.ts](src/widgets/code-viewer/model/code-samples/examples.ts) — a route's
   own example always goes there. Which of the three modules takes a sample, and why the selector
   needs no edit, is on [codeSamples.ts](src/widgets/code-viewer/model/codeSamples.ts).
3. **Add** an `<ExampleCard>` inside an `<ExampleSection>` on the route's page component.

Step 3 is not optional. An example registered in `codeSamples` but not placed on a page is
invisible — the file still builds, still type-checks, still ships in the bundle, and nobody
can reach it. Nothing fails; the example simply does not exist for users.

**A step 4 applies whenever the example demonstrates a new library export**: add that export to
`CATEGORIES` in [api-model.ts](vite-plugins/api-model.ts). `buildModel` throws on an export
belonging to no category, so `/api` answers **500** — and `yarn check` cannot see it, because the
route is generated at serve time. `node scripts/smoke-playground.mjs` against a running dev server
is what catches it; that is the check to run before believing an example is done.

**The source-code viewer shows source and nothing else.** Its header is a title, the key and
Close; a control that fires the example belongs on the card, where the example component's own
`ExampleLayout` children already put it.

### Name the dialog

**Every example gives its dialog an accessible name.** Without one it is announced as just
"dialog", which is the commonest defect in a dialog implementation and the one these examples
would be teaching people to copy. Nothing enforces it — a lint rule cannot see whether an
`ariaLabelledBy` points at an element that exists, and a rule that only checks the option is
present blesses `ariaLabel: ''`, which is the same defect wearing a hat.

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

`role: 'alertdialog'` is for a dialog that **interrupts** — a destructive confirm, a blocking
error — and it always travels with `ariaDescribedBy`, because an alertdialog is announced with its
description rather than waiting to be read. That also means the described element has to be worth
interrupting for: `modal-actions/examples/focus-on-open.tsx` is a delete confirm and deliberately
stays a plain dialog, because its body text is commentary about focus. Reaching for the
interrupting role on every confirm is how it stops meaning anything.

Verify it in a browser rather than by reading: open the dialog and check the **computed** name in
the accessibility pane, not the attribute. A reference pointing at an id nobody rendered looks
correct in the source and leaves the dialog anonymous.

## Managing Template Components

Keep the **UI Templates** page (`src/pages/ui-templates/ui/UITemplatesPage.tsx`) in sync:

1. Add the `?raw` import in `code-samples/templates.ts` — that module is this page's group. Key
   convention: `template-<group>-<name>` for MUI, `vanilla-<group>-<name>` for vanilla,
   `shared-component-<name>` for playground UI. **The key is a label, not the routing**: the three
   `/ui-integrations` examples are keyed `vanilla-form`, `vanilla-message`, `vanilla-slide` and
   belong in `examples.ts`, because what decides the module is the path the source is read from.
2. Add the entry to the matching group in `MUI_GROUPS`, `VANILLA_GROUPS`, or — if it renders
   nothing and therefore works under either flavour — `PATTERNS_GROUP`, which the **Shared** tab
   shows alongside `PLAYGROUND_GROUP`. Three tabs, and the third is the honest home for
   everything that is not a rendering flavour.
3. On removal/rename: update the import, the `codeSamples` entry, and the group entry together.

CSS-module samples use the `-styles` key suffix — the viewer keys its syntax highlighting off
that suffix, so renaming it silently downgrades a stylesheet to TSX highlighting.

## Shared Utilities

- `ExampleCard` / `ExampleGrid` / `ExampleLayout` / `ExampleSection` / `StoryCard` — `@/entities/example`
- `PageLayout` (`@/shared/ui/PageLayout`), `SectionNav` (`@/shared/ui/SectionNav`)
- `simulateApiCall` — mock async helper (`@/shared/lib/simulate-api-call`)
- `asyncState` / `safeAwait` / `createMutex` / `createSingleFlight` / `useQuery` / `useForm`
  (`@/shared/lib/…`) — patterns a user copies, deliberately not shipped by the library. `useForm`
  is the one the two `/ui-integrations` form cards share, which is what makes that pair's claim —
  same hook, two markups — literally true rather than two implementations that agree.
- `CodePaneProvider` (`@/app/providers/CodePaneProvider/CodePaneProvider`) + `useCodePane`
  (`@/shared/lib/code-pane-context` — `ViewCodeButton` is `shared/ui` and may not reach a widget;
  the code-viewer barrel names the rule and deliberately does not re-export it)

## Testing

**Pages and examples do not need tests; `shared/lib/` does.** The exemption is for the demo — a
card that renders a modal is covered by the library's own suite and by `yarn smoke`. A helper in
`shared/lib/` is different in kind: it is written to be **copied into someone else's project**,
which is a claim that it works, and thirteen of them already carry tests beside them in
`shared/lib/__tests__/`.

A pure helper gets a `*.test.ts` in the unit project; a hook gets a `*.ct.tsx` with a story
beside it, the way `use-store` and `use-form` do. Anything under `pages/` is out of scope — see
root [CLAUDE.md](../CLAUDE.md#testing) for the library's own split.
