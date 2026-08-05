import { Stack } from '@mui/material';
import type { ReactNode } from 'react';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';

type ExampleLayoutProps = {
  result: string | null;
  children: ReactNode;
  modals: ReactNode;
};

export function ExampleLayout({ result, children, modals }: ExampleLayoutProps) {
  return (
    <Stack direction="column" sx={{ gap: 2 }}>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {children}
      </Stack>
      <ResultDisplay result={result} />
      {modals}
    </Stack>
  );
}
