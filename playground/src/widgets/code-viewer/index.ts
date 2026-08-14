export { codeSamples } from './model/codeSamples';
export { useCodeModal } from './model/useCodeModal';
export { CodeModalContent } from './ui/CodeModal';

// `useCodePane` is **not** re-exported. It moved to `@/shared/lib/code-pane-context`, because
// `ViewCodeButton` is a `shared/ui` component and could not reach a widget for it. Re-exporting it
// here would leave two doors onto one hook and let the upward import back in through the second.
