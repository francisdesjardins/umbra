Add a new playground example following the 3-step process in playground/CLAUDE.md:

1. Create the example file at `playground/src/pages/<route>/examples/<name>.tsx`
2. Register it with a `?raw` import in `playground/src/widgets/code-viewer/model/codeSamples.ts`
3. Add an `<ExampleCard>` inside an `<ExampleSection>` on the corresponding route page

Ask the user for: route name, example name, UI library (MUI / Vanilla), and a one-line description before starting.

**Step 3 is not optional.** An example registered in `codeSamples` but placed on no page is invisible: the file still builds, still type-checks, still ships in the bundle, and nobody can reach it. Nothing fails.

While writing the example:

- Import hooks from `umbra/react` and templates from `@/entities/dialog-template/ui/{mui,vanilla}/…`; wrap the demo in `ExampleLayout` from `@/entities/example`.
- Give the dialog an `id` no other example uses — ids are global to the manager.
- **Anything clickable while a dialog is open must be rendered inside the `render` callback.** `showModal()` puts the dialog in the browser's top layer, so the native backdrop swallows every click outside it. To open a second dialog, call `dialogManager.open(id)` from inside the first one's `render`.
- Give the dialog an accessible name. A dialog without one is announced as just "dialog". The convention is `ariaLabelledBy: \`${DIALOG_ID}-title\``with the same id on the heading — every`Title`and`Heading`in`entities/dialog-template/`takes one — and`ariaLabel`only where a reference would lie: the heading disappears in some state, or changes while the dialog is open.`role: 'alertdialog'`is for a dialog that interrupts, and always travels with`ariaDescribedBy`. See [playground/CLAUDE.md](../../playground/CLAUDE.md#name-the-dialog).
- Declare the payload **and** the reasons on the hook — `useDialog<Result, 'save' | 'cancel'>` — since actions are declared by being rendered and there is no marker left to infer either from. It is what rejects a mistyped `action('savee')` and makes the `switch` in `onClose` exhaustive.

Afterwards, verify it actually renders: `node scripts/smoke-playground.mjs` against a running server (the dev server on port 3000), which walks every route and fails on console errors. Open the dialog too and read its **computed** accessible name off the accessibility tree — an `ariaLabelledBy` pointing at an id nobody rendered reads as correct in the source and leaves the dialog anonymous.
