import type { ReactNode } from 'react';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';

type ExampleLayoutProps = {
  readonly result: string | null;
  readonly children: ReactNode;
  readonly modals: ReactNode;
};

export function ExampleLayout({ result, children, modals }: ExampleLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {children}
      </div>
      <ResultDisplay result={result} />
      {modals}
    </div>
  );
}
