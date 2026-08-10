---
name: playground-smoke
description: Smoke-test the playground in a real browser — walk every route asserting no console errors, then drive interaction flows (modal open/dismiss, code viewer, the framework-agnostic service, typed close payloads, Escape without focus, sticky jump bars). Use after refactors that touch playground pages, shell layout, entry points or import specifiers, and before committing such a change. Complements `yarn test`, which never renders the playground.
---

# Playground Smoke

A Playwright probe — [`scripts/smoke-playground.mjs`](../../../scripts/smoke-playground.mjs) — that
boots nothing itself: point it at a running playground and it reports pass/fail per route and per
flow, exiting non-zero on failure.

**It lives in `scripts/`, not here.** CI runs it as `yarn smoke`, so it is a gate the repository
owns rather than one that exists only when this tool is present. This file is the guide to it.

## Why this exists

`yarn test` covers the library (`src/`). It never loads the playground, so an entire class of
breakage passes CI silently:

- a page renders but throws in the console (a bad import specifier, a missing export)
- an example is registered in `codeSamples` but placed on no page — invisible, and nothing fails
- CSS-level regressions that no assertion covers: a `position: sticky` element that stops
  sticking because an ancestor gained `overflow`, which looks fine in a screenshot
- duplicate `<h1>`s, or a route that 404s after a rename

These are found by rendering the app and measuring, which is what this does.

## Usage

Start a server first (either works):

```bash
yarn dev                 # dev server
yarn playground:build && yarn playground:preview   # production build — use this before committing
```

Then, from the repo root:

```bash
yarn smoke                      # all routes + all flows
yarn smoke --flow service       # one flow
yarn smoke --shots <tmpdir>     # screenshot every route
yarn smoke --theme dark         # run in dark mode
yarn smoke --base http://localhost:3000
```

Run it from the repo root so Node resolves `@playwright/test` from `node_modules`.

## What it checks

**Per route** — routes are discovered from the sidebar's `<nav>` links, so adding a route to the
sidebar puts it under test with no edit here:

- **the navigation actually landed on that route** — see below; without this the rest is theatre
- at least one card rendered (the page is not blank)
- zero `console.error` and zero uncaught page errors
- exactly one `<h1>` (the page title; the top bar must not claim one)

Then, across all routes: **no two rendered the same `<h1>`**.

### Both builds, and why that check exists

The playground ships two histories, and the probe handles both: browser
(`yarn playground:build`, and `yarn dev`) and **hash** (`yarn playground:build:file` — the
static-host build, which is what `deploy-playground.mjs` publishes).

Under the hash build a path URL like `/api` is not a route at all: the server returns
`index.html` and the router falls back to the index, so a plain `goto` _succeeds while showing
the wrong page_ — and every per-route assertion silently measures the index instead. The probe
therefore tries the path, falls back to `#/route`, and fails loudly if neither lands. The
duplicate-`<h1>` check is the backstop in case both URL forms are ever wrong at once.

A flow that cannot reach its page reports as a navigation failure rather than a 30-second
Playwright timeout, and one throwing flow no longer aborts the rest of the run.

**Flows** (`--flow <name>`):

| Flow         | Asserts                                                              |
| ------------ | -------------------------------------------------------------------- |
| `modal`      | a card button opens a `<dialog open>`, Escape dismisses it           |
| `codeviewer` | the source viewer resolves and displays a registered sample          |
| `service`    | the React-free service drives confirm → API call → reported outcome  |
| `forms`      | a typed close payload survives action → store → `onClose` → the page |
| `esc`        | one Escape closes a modal whose content holds nothing focusable      |
| `asyncopen`  | a warm (cached) open shows no loading flash; a cold one does         |
| `sticky`     | the section jump bar pins at `y=64` after scrolling                  |

## Adding a flow

Add an entry to the `flows` object in `scripts/smoke-playground.mjs` returning `[ok, label, detail?]` tuples. Put
it here rather than writing a one-off script — a flow committed to the repo gets rerun on the
next refactor, which is the whole point.

## Interpreting failures

A failing route line prints the console errors it captured; start there. A failing `sticky`
check almost always means an ancestor of the page content regained an `overflow` declaration —
see the guard comment in `playground/src/widgets/root-layout/ui/RootLayout.tsx`.

For animation, positioning and sizing bugs specifically, use the `dialog-debug` skill instead:
it measures per-frame rendered geometry, which this probe does not.
