import { createContext, type ReactNode } from 'react';

/**
 * Shared state for the source-code viewer.
 *
 * The viewer itself is a slide modal owned by the root layout — this context only carries
 * *what* to show (`selectedExample`, `exampleActions`) and the opener the layout publishes
 * once its modal is mounted (`codeModalOpen`). Any `ViewCodeButton` anywhere in the tree can
 * therefore drive a single viewer instance.
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
