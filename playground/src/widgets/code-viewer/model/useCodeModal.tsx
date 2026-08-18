import styles from '@/widgets/code-viewer/model/useCodeModal.module.css';
import { useRouterState } from '@tanstack/react-router';
import { useSlideModal } from 'umbra/react';
import { Suspense, useState } from 'react';
import { useCodePane } from '@/shared/lib/code-pane-context';
import { CodeModalContent } from '@/widgets/code-viewer/ui/CodeModalLazy';

/** Declared once and passed both ways, since the heading and the reference are in two files. */
const CODE_VIEWER_TITLE_ID = 'code-viewer-title';

export const useCodeModal = () => {
  const { selectedExample, exampleActions } = useCodePane();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [codeSamples, setCodeSamples] = useState<Record<string, string>>({});

  const routeKey = currentPath.replace('/', '') || 'basic';
  const codeKey = selectedExample ?? routeKey;
  const code = codeSamples[codeKey] ?? '';

  return useSlideModal({
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
          <Suspense
            fallback={
              <div className={styles['fallback']}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  style={{ width: 28, height: 28, flexShrink: 0 }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="var(--app-flame)"
                    strokeWidth="3"
                    strokeDasharray="42 18"
                  />
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </svg>
              </div>
            }
          >
            <CodeModalContent
              code={code}
              codeKey={codeKey}
              exampleActions={exampleActions}
              handle={handle}
              isLoading={isPreparing}
              title="Source Code"
              titleId={CODE_VIEWER_TITLE_ID}
            />
          </Suspense>
        </div>
      );
    },
  });
};
