import styles from '@/pages/api/ui/ApiLayout.module.css';
import type { ReactNode } from 'react';
import { ApiRail } from './ApiRail';
import { SymbolSearch } from './SymbolSearch';

type ApiLayoutProps = {
  readonly activeCategory?: string | undefined;
  readonly activeSymbol?: string | null | undefined;
  readonly children: ReactNode;
};

/**
 * Two columns: where you are, and what you are reading. The rail's own scroll is safe because it is
 * a sibling of the content — an `overflow` on an *ancestor* silently kills `position: sticky`.
 */
export const ApiLayout = ({ activeCategory, activeSymbol, children }: ApiLayoutProps) => {
  return (
    <div className={styles['grid']}>
      <div className={styles['rail']}>
        <ApiRail activeCategory={activeCategory} activeSymbol={activeSymbol} />
      </div>

      {/* The rail is a desktop affordance; on a phone the search field is the whole of it. */}
      <div className={styles['content']}>
        <div className={styles['mobileSearch']}>
          <SymbolSearch />
        </div>
        {children}
      </div>
    </div>
  );
};
