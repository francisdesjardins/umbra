import { styled } from '@mui/material/styles';
import { Link } from '@tanstack/react-router';

/**
 * A TanStack `Link` taking MUI's `sx`, for every navigation here. `component={Link}` cannot type a
 * dynamic route and `styled(Link)` erases the generics typing `params`, so links are plain paths.
 */
export const RouterLink = styled(Link)({
  textDecoration: 'none',
  color: 'inherit',
});
