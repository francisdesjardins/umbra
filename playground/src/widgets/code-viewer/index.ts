export { useCodeModal } from './model/useCodeModal';

// **The hook is the whole surface.** `codeSamples` and `CodeModalContent` are loaded on demand (the
// latter behind `React.lazy` in `ui/CodeModalLazy`); re-exporting either statically makes it
// reachable from the entry, so the bundler inlines it and the dynamic import resolves to something
// already downloaded. `useCodePane` lives in `@/shared/lib/code-pane-context` because `ViewCodeButton`
// is `shared/ui` and cannot reach a widget — a re-export here would reopen that upward import.
