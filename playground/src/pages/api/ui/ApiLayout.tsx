import Box from '@mui/material/Box';
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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '236px minmax(0, 1fr)' },
        gap: { xs: 3, md: 5 },
        alignItems: 'start',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'sticky',
          top: 80,
          maxHeight: 'calc(100dvh - 104px)',
          overflowY: 'auto',
          pr: 1,
        }}
      >
        <ApiRail activeCategory={activeCategory} activeSymbol={activeSymbol} />
      </Box>

      {/* The rail is a desktop affordance; on a phone the search field is the whole of it. */}
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
          <SymbolSearch />
        </Box>
        {children}
      </Box>
    </Box>
  );
};
