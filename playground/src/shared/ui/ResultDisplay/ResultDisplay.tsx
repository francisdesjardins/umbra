import { Box, Typography } from '@mui/material';

type ResultDisplayProps = {
  result: string | null;
};

export const ResultDisplay = ({ result }: ResultDisplayProps) => {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        bgcolor: (theme) => {
          return result
            ? theme.palette.mode === 'dark'
              ? 'rgba(217, 70, 239, 0.15)'
              : 'rgba(217, 70, 239, 0.1)'
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
