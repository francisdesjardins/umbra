# Playground — Templates & Examples

Interactive demo app with MUI and vanilla HTML/CSS reference implementations.

`umbra-playground` — a private Yarn workspace, never published. **Its UI dependencies
live here, not in the root manifest**, which is the published package's dependency list: MUI,
Emotion, TanStack Router, zod, immer and react-syntax-highlighter are demo-only and must stay
out of the root. Run `yarn install` once at the repo root to install both packages; the root's
`dev` and `playground:*` scripts delegate here.

It consumes the library through the same public specifiers as any user: `umbra/react`
for hooks and components, and `umbra` (the root) for anything that must work without
React — see `pages/advanced/examples/deployment-service.ts`. Vite aliases both to `../src`.

**The app itself is React, and stays React.** `umbra/solid` is exercised in the one place it can
be without putting a second compiler in this build: the microfrontend frame, which has no build
step at all — see below.

## The microfrontend frame (`public/mfe/` + `mfe-src/` + `vite-plugins/mfe-umbra.ts`)

`/advanced#microfrontends` loads a plain HTML page in an iframe: an import map, three
`<script type="module">`, no bundler. Three microfrontends share one `dialogManager` and ask each
other for dialogs — Checkout on `umbra/react`, Support on `umbra/solid`, Billing on no binding at
all.

- `mfe-src/*.ts` — one tiny module per specifier the import map names (`umbra`, `umbra/react`,
  `umbra/solid`, `react`, `react-dom/client`, `solid-js`, `solid-js/web`, `solid-js/h`).
- `vite-plugins/mfe-umbra.ts` bundles **all of them in one rolldown build**, so code-splitting
  hoists what they share — the manager included — into a chunk each entry imports. Separate builds
  would give separate registries and the demo's central claim would be false. It serves them from
  `/mfe/*.mjs` in dev (rebuilding when `src/` or `mfe-src/` changes) and emits them at build time.
- The scripts in `public/mfe/` are served verbatim, which is why they use `createElement` and `h`
  rather than JSX: nothing compiles them, and that is the point being made.

Adding a fourth microfrontend means a panel in `host.html`, a script beside the others, and a
`codeSamples` entry — no new build wiring.

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

**Reach into the library through `umbra/…`, never through `../../../../../src/…`.** The `/stories`
page renders the library's own CT harnesses and the code viewer shows their source, so two files
here import from `src/**/__tests__/`. Both go through the alias — a deep relative climb is a
silent hostage to where a library file happens to sit today, and it broke on the first move that
came along.

**A page slice owns its own examples.** `pages/<route>/examples/` may only be imported by
`pages/<route>/ui/`. Page-to-page imports are an FSD violation — if two routes need the same
example, it belongs in `entities/`.

## Routes

Grouped in the sidebar; the order is the intended reading order.

| Group     | Route              | Purpose                                                    |
| --------- | ------------------ | ---------------------------------------------------------- |
| Learn     | `/getting-started` | The core open → render → close loop                        |
| Learn     | `/modal-actions`   | Action state: `hasRunningAction`, `error`, hotkeys         |
| Patterns  | `/slide-modal`     | The four slide shapes as presets, and the toast            |
| Patterns  | `/advanced`        | Stacking, imperative control, outlet, events, showcases    |
| Reference | `/ui-integrations` | MUI vs vanilla, paired by use case                         |
| Reference | `/ui-templates`    | Copy-paste index: Material UI / Vanilla / Shared           |
| Reference | `/api`             | Generated API reference — a map, then a page per category  |
| Testing   | `/stories`         | Live `*.story.tsx` harnesses from the component test suite |

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

What the projection adds beyond the doc comments:

- **A printed signature** per symbol, with every referenced export kept linkable. The printer
  covers each `type` discriminant typedoc emits and warns at build time on anything else rather
  than printing a plausible-but-wrong line.
- **Members with their types** — object properties, a const object's entries (`Key`), a
  component's destructured props, and both halves of an `A & { … }` intersection.
- **Reflowed prose**: the source's 100-column hard wrap becomes browser wrapping, while blank
  lines and list markers are left alone. `@example` blocks keep every newline — they are code.

A symbol name is a URL: `categoryHref` + `symbolAnchor` in `pages/api/model/api-index.ts` build
every link in the reference, including the ones inside signatures and `{@link}` prose.

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

## Templates (`src/entities/modal-template/ui/`)

Reference UI — not exported from the library. Users copy them into their projects.

- **MUI** (`mui/`): `message-modal/`, `slide-modal/`, `form-modal/`, `panel-modal/`, `shared/content/`
- **Vanilla** (`vanilla/`): pure HTML/CSS with CSS modules + dark mode

Both flavours expose the same component names, so an example ports between them by changing
one import. All layouts use children-based composition:

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
2. **Register** the `?raw` import in [codeSamples.ts](src/widgets/code-viewer/model/codeSamples.ts).
3. **Add** an `<ExampleCard>` inside an `<ExampleSection>` on the route's page component.

Step 3 is not optional. An example registered in `codeSamples` but not placed on a page is
invisible — the file still builds, still type-checks, still ships in the bundle, and nobody
can reach it. Nothing fails; the example simply does not exist for users.

`ExampleCard`'s `modalId` + `tryLabel` render a trigger **inside the source-code viewer**, not
on the card itself — it lets you fire the example while reading its code. The button on the
card comes from the example component's own `ExampleLayout` children.

## Managing Template Components

Keep the **UI Templates** page (`src/pages/ui-templates/ui/UITemplatesPage.tsx`) in sync:

1. Add the `?raw` import in `codeSamples.ts`. Key convention: `template-<group>-<name>` for
   MUI, `vanilla-<group>-<name>` for vanilla, `shared-component-<name>` for playground UI.
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
- `asyncState` / `safeAwait` / `createMutex` / `createSingleFlight` (`@/shared/lib/…`) — async
  coordination patterns a user copies, deliberately not shipped by the library
- `CodePaneProvider` (`@/app/providers/CodePaneProvider/CodePaneProvider`) + `useCodePane` (`@/widgets/code-viewer`)

## Testing

Playground code does **not** require tests. Tests are for library source only — see root
[CLAUDE.md](../CLAUDE.md#testing).
