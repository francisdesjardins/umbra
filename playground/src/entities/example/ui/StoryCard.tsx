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

        <Box
          sx={{
            mt: 'auto',
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          {children}
        </Box>
      </CardContent>
    </SurfaceCard>
  );
};
