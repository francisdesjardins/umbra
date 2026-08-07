import { Box, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';

type StoryCardProps = {
  title: string;
  description?: string | undefined;
  codeKey?: string | undefined;
  children: ReactNode;
};

export const StoryCard = ({ title, description, codeKey, children }: StoryCardProps) => {
  return (
    <SurfaceCard>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.05rem',
              letterSpacing: '-0.01em',
              flex: 1,
            }}
          >
            {title}
          </Typography>
          {codeKey && <ViewCodeButton codeKey={codeKey} />}
        </Box>

        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            {description}
          </Typography>
        )}

        {/*
          A harness is a test fixture: bare `<button>`s and `<span data-testid>` readouts, with no
          styling of its own — deliberately, because what the assertions press must be what you
          press. So the presentation is applied from out here, to the markup as it comes, rather
          than by editing the fixtures into something prettier than what is tested.
        */}
        <Box
          sx={{
            mt: 'auto',
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
            alignItems: 'flex-start',
            // The harness lays its controls out with plain text nodes; a flex row with wrapping
            // turns that into something legible without moving a single element.
            '& > div': { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 },
            '& button': {
              font: 'inherit',
              fontSize: '0.8125rem',
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.primary',
              cursor: 'pointer',
              transition: 'border-color 120ms, background-color 120ms',
              '&:hover:not(:disabled)': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
            },
            // The state readouts a test asserts on — worth reading here too, so they get the
            // monospace pill treatment instead of running into the prose beside them.
            '& span[data-testid]': {
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: 'action.hover',
              color: 'text.secondary',
            },
            '& input, & select': {
              font: 'inherit',
              fontSize: '0.8125rem',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.primary',
            },
          }}
        >
          {children}
        </Box>
      </CardContent>
    </SurfaceCard>
  );
};
