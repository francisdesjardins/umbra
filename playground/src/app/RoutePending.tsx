import { Box, CircularProgress } from '@mui/material';

/**
 * Shown while a route's chunk is still arriving.
 *
 * Built from `@mui/material`, which the shell already loads, so it costs nothing beyond itself and
 * stays in the entry — where a pending state has to be, since a spinner that had to be fetched
 * would arrive with the page it is covering for.
 */
export const RoutePending = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
      <CircularProgress size={32} />
    </Box>
  );
};
