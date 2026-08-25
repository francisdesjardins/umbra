import styles from '@/widgets/code-viewer/model/useCodeModal.module.css';
import { useRouterState } from '@tanstack/react-router';
import { useSlideDialog } from 'umbra/react';
import { useState } from 'react';
import { useCodePane } from '@/shared/lib/code-pane-context';
import { CodeModalContent } from '@/widgets/code-viewer/ui/CodeModal';

/** Declared once and passed both ways, since the heading and the reference are in two files. */
const CODE_VIEWER_TITLE_ID = 'code-viewer-title';

export const useCodeModal = () => {
  const { selectedExample } = useCodePane();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [codeSamples, setCodeSamples] = useState<Record<string, string>>({});

  const routeKey = currentPath.replace('/', '') || 'basic';
  const codeKey = selectedExample ?? routeKey;
  const code = codeSamples[codeKey] ?? '';

  return useSlideDialog({
    id: 'code-viewer',
    direction: 'right',
    ariaLabelledBy: CODE_VIEWER_TITLE_ID,
    // Sample sources are a third of the bundle and a visitor who never opens this panel needs none
    // of it; `prepare` runs with the panel already on screen, and `isPreparing` renders the body.
    prepare: async () => {
      const { loadCodeSamples } = await import('./codeSamples');
      setCodeSamples(await loadCodeSamples(currentPath, codeKey));
    },
    render: ({ handle, isPreparing }) => {
      return (
        <div className={styles['panel']}>
          <CodeModalContent
            code={code}
            codeKey={codeKey}
            handle={handle}
            isLoading={isPreparing}
            title="Source Code"
            titleId={CODE_VIEWER_TITLE_ID}
          />
        </div>
      );
    },
  });
};
