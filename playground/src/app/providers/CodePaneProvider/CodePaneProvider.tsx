import { useState, type ReactNode } from 'react';
import { CodePaneContext, type CodePaneContextValue } from '@/shared/lib/code-pane-context';

export const CodePaneProvider = ({ children }: { children: ReactNode }) => {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState<CodePaneContextValue['codeModalOpen']>(null);

  return (
    <CodePaneContext
      value={{
        selectedExample,
        setSelectedExample,
        codeModalOpen,
        setCodeModalOpen,
      }}
    >
      {children}
    </CodePaneContext>
  );
};
