# Playground Guidelines

Interactive demo app showcasing `umbra` with MUI and vanilla HTML/CSS. See [playground/CLAUDE.md](../../playground/CLAUDE.md) for full context.

## Dev Server

```bash
yarn dev   # Starts playground at port 3000 (from repo root)
```

Resolves `umbra` → `../src` via Vite alias — edits to library source reflect immediately.

## Adding an Example

Each example is a **single file** that serves as both runnable component and "View Code" source.

1. **Create** `src/pages/<route>/examples/<name>.tsx` — import hooks from `umbra/react` (the root, `umbra`, is for what must work without React), UI from `@/entities/modal-template/ui/{mui,vanilla}/`, wrap with `ExampleLayout`
2. **Register** in [codeSamples.ts](../src/widgets/code-viewer/model/codeSamples.ts) via `?raw` import
3. **Add** to route page via `ExampleCard` with matching `codeKey`

Use unique modal `id` values per example. For multiple modals: `modals={<>{a.Modal}{b.Modal}</>}`.

## Templates

Reference UI in `src/entities/modal-template/ui/` — not exported from the library. All template layouts (MUI and Vanilla) use **children-based composition** — place `Header`, `Content`, and `Footer` as direct children of `DefaultLayout`.

| Framework | Path                                      | Notes                                                                              |
| --------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| MUI       | `src/entities/modal-template/ui/mui/`     | `message-modal/`, `slide-modal/`, `form-modal/`, `panel-modal/`, `shared/content/` |
| Vanilla   | `src/entities/modal-template/ui/vanilla/` | Pure HTML/CSS with CSS modules + dark mode                                         |

## Routing

TanStack Router — routes: `/getting-started`, `/modal-actions`, `/slide-modal`, `/advanced`, `/ui-integrations`, `/ui-templates`, `/api` (+ `/api/$category`, the generated reference), `/stories`. Root redirects `/` → `/getting-started`. Defined in [router.tsx](../src/app/router.tsx).

## Conventions

- Spacing: Use `gap`/`Stack` — vertical margin props (`mt`, `mb`, `marginTop`, `marginBottom`, `gutterBottom`) are **banned by lint**
- `open()` / `waitForClose()` / `handle` are reference-stable — pass them straight to effects and memoized children
- `ExampleLayout` props: `children` = action buttons, `modals` = modal portals, `result` = result string

## Testing

Playground examples and template components do **not** require tests. Tests are mandatory only for library source under `src/` in the repo root — see [copilot-instructions.md](../../.github/copilot-instructions.md) for the testing conventions.
