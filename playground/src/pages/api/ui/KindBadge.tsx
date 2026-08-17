import { Box, type Theme } from '@mui/material';
import type { ApiSymbol } from 'virtual:dialog-api';

/**
 * What a symbol *is*, where the word does not fit. Two accents and a neutral: the palette's
 * `secondary` is the eclipse's body (dark mode's `background.default`), and a type, the quietest
 * kind, reads as the absence of an accent.
 */
const KIND = {
  function: { label: 'fn', tone: 'primary' },
  variable: { label: 'const', tone: 'success' },
  type: { label: 'type', tone: 'neutral' },
} as const;

type Tone = (typeof KIND)[keyof typeof KIND]['tone'];

/**
 * The readable end of a tone, per mode: `main` is a background for `contrastText`, and as 11px page
 * text amber `primary.main` measures 3.19:1 on white against a needed 4.5:1. So light takes `dark`,
 * dark takes `light`, and amber is now the `accent.onSurface` token.
 */
const toneColor = (theme: Theme, tone: Tone): string => {
  if (tone === 'neutral') {
    return theme.palette.text.secondary;
  }
  if (tone === 'primary') {
    return theme.palette.accent.onSurface;
  }
  return theme.palette.mode === 'dark' ? theme.palette[tone].light : theme.palette[tone].dark;
};

export const KindBadge = ({ kind }: { readonly kind: ApiSymbol['kind'] }) => {
  const { label, tone } = KIND[kind];
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
        color: (theme: Theme) => {
          return toneColor(theme, tone);
        },
        borderColor: (theme: Theme) => {
          return toneColor(theme, tone);
        },
        // No `opacity`: it multiplies the contrast just measured. Use a dimmer tone instead.
        flexShrink: 0,
      }}
    >
      {label}
    </Box>
  );
};
