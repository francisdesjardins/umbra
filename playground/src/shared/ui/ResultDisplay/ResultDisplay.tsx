import { Box, Typography, alpha } from '@mui/material';

type ResultDisplayProps = {
  result: string | null;
};

export const ResultDisplay = ({ result }: ResultDisplayProps) => {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        // Derived from the palette, not written out: the border beside it is `primary.main`, so a
        // literal here means the fill and the outline disagree the moment the palette moves — as
        // they did, leaving a fuchsia wash inside an amber border.
        bgcolor: (theme) => {
          return result
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.1)
            : theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(0, 0, 0, 0.02)';
        },
        border: 1,
        borderColor: result ? 'primary.main' : 'divider',
        transition: 'background-color 200ms, border-color 200ms',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontFamily: '"Fira Code", "Consolas", monospace',
          fontSize: '0.8125rem',
        }}
      >
        <Box component="span" sx={{ color: 'text.secondary' }}>
          Result:{' '}
        </Box>
        {result ?? (
          <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            waiting...
          </Box>
        )}
      </Typography>
    </Box>
  );
};
