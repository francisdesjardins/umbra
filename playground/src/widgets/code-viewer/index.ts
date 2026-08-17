export { useCodeModal } from './model/useCodeModal';

// **The hook is the whole surface, and the two names missing from it are the reason.**
//
// `codeSamples` and `CodeModalContent` are loaded on demand — the samples when the viewer is first
// opened, the content component behind `React.lazy` in `ui/CodeModalLazy`. A static re-export here
// defeats both: it makes them reachable from the entry, so the bundler puts them in it and the
// dynamic import then resolves to something already downloaded. Nothing outside this slice ever
// named them, and `useCodeModal` reaches both from inside it.
//
// `useCodePane` is **not** re-exported either. It moved to `@/shared/lib/code-pane-context`, because
// `ViewCodeButton` is a `shared/ui` component and could not reach a widget for it. Re-exporting it
// here would leave two doors onto one hook and let the upward import back in through the second.
