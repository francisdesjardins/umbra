import { createContext, use } from 'react';

/**
 * Shared state for the source-code viewer: only *what* to show (`selectedExample`) and the
 * opener the root layout publishes once its slide modal is mounted
 * (`codeDialogOpen`), so any `ViewCodeButton` in the tree drives one viewer instance. It lives in
 * `shared` because of who consumes it — `ViewCodeButton` is `shared/ui`, and under Feature-Sliced
 * Design may not reach up into `app` or `widgets`. Contract here, provider and modal above.
 */
export type CodePaneContextValue = {
  selectedExample: string | null;
  setSelectedExample: (id: string | null) => void;
  codeDialogOpen: (() => void) | null;
  setCodeDialogOpen: (fn: (() => void) | null) => void;
};

export const CodePaneContext = createContext<CodePaneContextValue | null>(null);

export const useCodePane = () => {
  const context = use(CodePaneContext);
  if (!context) {
    throw new Error('useCodePane must be used within CodePaneProvider');
  }
  return context;
};
