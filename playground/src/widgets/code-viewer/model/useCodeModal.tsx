import { Box, CircularProgress } from '@mui/material';
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
        <Box
          sx={{
            flex: 1,
            height: '100dvh',
            minHeight: 0,
            width: { xs: '100dvw', md: 'auto' },
            minWidth: { xs: 0, md: '60vw' },
            maxWidth: { xs: '100dvw', md: 'none' },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            color: 'text.primary',
            overflow: 'hidden',
          }}
        >
          <Suspense
            fallback={
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress size={28} />
              </Box>
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
        </Box>
      );
    },
  });
};
