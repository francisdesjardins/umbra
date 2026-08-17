import { Box, CircularProgress } from '@mui/material';

/**
 * Shown while a route's chunk arrives. Built from `@mui/material`, which the shell already loads, so
 * it stays in the entry — a spinner that had to be fetched arrives with the page it covers for.
 */
export const RoutePending = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
      <CircularProgress size={32} />
    </Box>
  );
};
