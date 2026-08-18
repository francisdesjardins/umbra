import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

type ExampleGridProps = {
  /** Columns at `sm` and up, collapsing to one below; `1` for wide demos needing the full measure. */
  readonly columns?: 1 | 2 | undefined;
  readonly children: ReactNode;
};

/**
 * The single card grid for the whole playground, so gutters and collapse behaviour are identical
 * everywhere. CSS Grid rather than flex-basis maths: a trailing odd card keeps its neighbours'
 * column width instead of stretching across the row.
 */
export const ExampleGrid = ({ columns = 2, children }: ExampleGridProps) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        alignItems: 'stretch',
        gridTemplateColumns: {
          xs: '1fr',
          sm: columns === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
        },
      }}
    >
      {children}
    </Box>
  );
};
