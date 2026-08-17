import { Card, alpha, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

type SurfaceCardProps = {
  /** Adds the hover lift. Use for cards that reveal code or navigate somewhere. */
  readonly interactive?: boolean | undefined;
  readonly children: ReactNode;
};

/**
 * The playground's one card surface — example cards, story cards and template rows are the same
 * object at three sizes, and each re-declaring the border, dark-mode background and hover lift is
 * how they diverged. No `sx` passthrough: that escape hatch is what let them drift.
 */
export const SurfaceCard = ({ interactive, children }: SurfaceCardProps) => {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderColor: 'divider',
        bgcolor: (theme: Theme) => {
          return theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper';
        },
        ...(interactive === true && {
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: (theme: Theme) => {
              return `0 0 0 1px ${alpha(theme.palette.primary.main, 0.3)}, ${theme.shadows[4]}`;
            },
            transform: 'translateY(-2px)',
          },
        }),
      }}
    >
      {children}
    </Card>
  );
};
