Add a new playground example following the 3-step process in playground/CLAUDE.md:

1. Create the example file at `playground/src/pages/<route>/examples/<name>.tsx`
2. Register it with a `?raw` import in `playground/src/widgets/code-viewer/model/codeSamples.ts`
3. Add an `<ExampleCard>` inside an `<ExampleSection>` on the corresponding route page

Ask the user for: route name, example name, UI library (MUI / Vanilla), and a one-line description before starting.

**Step 3 is not optional.** An example registered in `codeSamples` but placed on no page is invisible: the file still builds, still type-checks, still ships in the bundle, and nobody can reach it. Nothing fails.

While writing the example:

- Import hooks from `umbra/react` and templates from `@/entities/modal-template/ui/{mui,vanilla}/…`; wrap the demo in `ExampleLayout` from `@/entities/example`.
- Give the modal an `id` no other example uses — ids are global to the manager.
- **Anything clickable while a modal is open must be rendered inside the `render` callback.** `showModal()` puts the dialog in the browser's top layer, so the native backdrop swallows every click outside it. To open a second modal, call `dialogManager.open(id)` from inside the first one's `render`.
- Give the dialog an accessible name (`ariaLabel`, or `ariaLabelledBy` pointing at its own heading). A dialog without one is announced as just "dialog".
- Declare the payload **and** the reasons on the hook — `useModal<Result, 'save' | 'cancel'>` — since actions are declared by being rendered and there is no marker left to infer either from. It is what rejects a mistyped `action('savee')` and makes the `switch` in `onClose` exhaustive.

Afterwards, verify it actually renders: `node .claude/skills/playground-smoke/smoke.mjs` against a running server (the dev server on port 3000), which walks every route and fails on console errors.
