export { useCodeDialog } from './model/useCodeDialog';

// **The hook is the whole surface.** `codeSamples` and `CodeDialogContent` are loaded on demand, so
// re-exporting either statically makes it reachable from the entry and the bundler inlines it —
// the dynamic import then resolves to something already downloaded. `useCodePane` lives in
// `@/shared/lib/code-pane-context` because `ViewCodeButton` is `shared/ui` and cannot reach a
// widget.
