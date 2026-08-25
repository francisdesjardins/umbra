import { useState, type ReactNode } from 'react';
import { CodePaneContext, type CodePaneContextValue } from '@/shared/lib/code-pane-context';

export const CodePaneProvider = ({ children }: { children: ReactNode }) => {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [codeDialogOpen, setCodeDialogOpen] =
    useState<CodePaneContextValue['codeDialogOpen']>(null);

  return (
    <CodePaneContext
      value={{
        selectedExample,
        setSelectedExample,
        codeDialogOpen,
        setCodeDialogOpen,
      }}
    >
      {children}
    </CodePaneContext>
  );
};
