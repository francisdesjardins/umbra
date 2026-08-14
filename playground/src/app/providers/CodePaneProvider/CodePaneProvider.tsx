import { useState, type ReactNode } from 'react';
import { CodePaneContext, type CodePaneContextValue } from '@/shared/lib/code-pane-context';

export const CodePaneProvider = ({ children }: { children: ReactNode }) => {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [exampleActions, setExampleActions] =
    useState<CodePaneContextValue['exampleActions']>(null);
  const [codeModalOpen, setCodeModalOpen] = useState<CodePaneContextValue['codeModalOpen']>(null);

  return (
    <CodePaneContext
      value={{
        selectedExample,
        setSelectedExample,
        exampleActions,
        setExampleActions,
        codeModalOpen,
        setCodeModalOpen,
      }}
    >
      {children}
    </CodePaneContext>
  );
};
