import { createContext, use, type ReactNode } from 'react';

/**
 * Shared state for the source-code viewer.
 *
 * The viewer itself is a slide modal owned by the root layout — this context only carries *what*
 * to show (`selectedExample`, `exampleActions`) and the opener the layout publishes once its modal
 * is mounted (`codeModalOpen`). Any `ViewCodeButton` anywhere in the tree can therefore drive a
 * single viewer instance.
 *
 * **It lives in `shared` because of who consumes it.** `ViewCodeButton` is a `shared/ui`
 * component, and under Feature-Sliced Design it may not reach up into `app` or `widgets` for the
 * hook it needs. The provider stays `app`'s and the modal stays the root layout's; only the
 * contract sits down here, where everything above it may read.
 */
export type CodePaneContextValue = {
  selectedExample: string | null;
  setSelectedExample: (id: string | null) => void;
  exampleActions: ReactNode | null;
  setExampleActions: (actions: ReactNode | null) => void;
  codeModalOpen: (() => void) | null;
  setCodeModalOpen: (fn: (() => void) | null) => void;
};

export const CodePaneContext = createContext<CodePaneContextValue | null>(null);

export const useCodePane = () => {
  const context = use(CodePaneContext);
  if (!context) {
    throw new Error('useCodePane must be used within CodePaneProvider');
  }
  return context;
};
