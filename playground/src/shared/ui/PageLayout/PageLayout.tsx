import styles from '@/shared/ui/PageLayout/PageLayout.module.css';
import type { ReactNode } from 'react';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';

type PageLayoutProps = {
  readonly title: string;
  readonly description: string;
  readonly result?: string | null | undefined;
  /** Optional controls rendered on the header's trailing edge (filters, flavour toggles). */
  readonly actions?: ReactNode | undefined;
  readonly children: ReactNode;
};

export const PageLayout = ({ title, description, result, actions, children }: PageLayoutProps) => {
  return (
    <div className={styles['root']}>
      <div className={styles['header']}>
        <div className={styles['heading']}>
          <h1 className={styles['title']}>{title}</h1>
          <p className={styles['description']}>{description}</p>
        </div>
        {actions !== undefined && <div className={styles['actions']}>{actions}</div>}
      </div>

      {result !== undefined && result !== null && result !== '' && (
        <div className={styles['result']}>
          <ResultDisplay result={result} />
        </div>
      )}

      {children}
    </div>
  );
};
