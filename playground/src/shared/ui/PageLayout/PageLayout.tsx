import { Box, Typography } from '@mui/material';
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
    <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
      {/* Header — left-aligned so the title, the section labels and the card grid all share
          one leading edge. A centred title over left-aligned content read as two layouts. */}
      <Box
        sx={{
          mb: { xs: 3, md: 4 },
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 2,
        }}
      >
        <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.5rem', md: undefined },
            }}
          >
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
            {description}
          </Typography>
        </Box>
        {actions !== undefined && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Box>

      {result !== undefined && result !== null && result !== '' && (
        <Box sx={{ mb: 3 }}>
          <ResultDisplay result={result} />
        </Box>
      )}

      {children}
    </Box>
  );
};
