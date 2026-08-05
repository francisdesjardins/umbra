import { Box } from '@mui/material';
import { useRouterState } from '@tanstack/react-router';
import { useSlideModal } from 'umbra/react';
import { useEffect, useState } from 'react';
import { useCodePane } from '@/widgets/code-viewer/model/useCodePane';
import { CodeModalContent } from '@/widgets/code-viewer/ui/CodeModal';

export const useCodeModal = () => {
  const { selectedExample, exampleActions } = useCodePane();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [codeSamples, setCodeSamples] = useState<Record<string, string>>({});
  useEffect(() => {
    void import('./codeSamples').then((m) => {
      setCodeSamples(m.codeSamples);
    });
  }, []);

  const routeKey = currentPath.replace('/', '') || 'basic';
  const codeKey = selectedExample ?? routeKey;
  const code = codeSamples[codeKey] ?? '';

  return useSlideModal({
    id: 'code-viewer',
    direction: 'right',
    render: ({ handle }) => {
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
          <CodeModalContent
            code={code}
            codeKey={codeKey}
            exampleActions={exampleActions}
            handle={handle}
            title="Source Code"
          />
        </Box>
      );
    },
  });
};
