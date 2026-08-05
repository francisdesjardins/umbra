import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, Button, CardContent, Typography } from '@mui/material';
import { dialogManager } from 'umbra/react';
import type { ReactNode } from 'react';
import { SurfaceCard } from '@/shared/ui/SurfaceCard';
import { ViewCodeButton } from '@/shared/ui/ViewCodeButton/ViewCodeButton';

type ExampleCardProps = {
  title: string;
  description?: string;
  codeKey?: string;
  children?: ReactNode;
  example?: ReactNode;
  modalId?: string;
  tryLabel?: string;
};

export const ExampleCard = ({
  title,
  description,
  codeKey,
  children,
  example,
  modalId,
  tryLabel = 'Try It',
}: ExampleCardProps) => {
  const tryButton = modalId ? (
    <Button
      variant="outlined"
      size="small"
      startIcon={<PlayArrowIcon />}
      onClick={() => {
        dialogManager.open(modalId);
      }}
    >
      {tryLabel}
    </Button>
  ) : null;

  const actions = tryButton ?? children;
  return (
    <SurfaceCard interactive>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.1rem',
              letterSpacing: '-0.01em',
              flex: 1,
            }}
          >
            {title}
          </Typography>
          {codeKey && <ViewCodeButton codeKey={codeKey} actions={actions} />}
        </Box>
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 3,
              lineHeight: 1.6,
              flex: 1,
            }}
          >
            {description}
          </Typography>
        )}
        {example ? (
          <Box sx={{ mt: 'auto' }}>{example}</Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 'auto' }}>{children}</Box>
        )}
      </CardContent>
    </SurfaceCard>
  );
};
