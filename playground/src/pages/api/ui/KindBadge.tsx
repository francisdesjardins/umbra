import { Box, type Theme } from '@mui/material';
import type { ApiSymbol } from 'virtual:dialog-api';

/**
 * What a symbol *is*, at a glance.
 *
 * Colour carries it in the rail and in search results, where there is no room for the word:
 * one accent per kind, the same three everywhere on the page.
 */
const KIND = {
  function: { label: 'fn', color: 'primary' },
  variable: { label: 'const', color: 'success' },
  type: { label: 'type', color: 'secondary' },
} as const;

export const KindBadge = ({ kind }: { readonly kind: ApiSymbol['kind'] }) => {
  const { label, color } = KIND[kind];
  return (
    <Box
      component="span"
      sx={{
        fontFamily: 'monospace',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        lineHeight: 1.6,
        px: 0.75,
        borderRadius: 0.75,
        border: 1,
        color: `${color}.main`,
        borderColor: (theme: Theme) => {
          return theme.palette[color].main;
        },
        opacity: 0.9,
        flexShrink: 0,
      }}
    >
      {label}
    </Box>
  );
};
