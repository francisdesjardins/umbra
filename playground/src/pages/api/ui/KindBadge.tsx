import { Box, type Theme } from '@mui/material';
import type { ApiSymbol } from 'virtual:dialog-api';

/**
 * What a symbol *is*, at a glance.
 *
 * Colour carries it in the rail and in search results, where there is no room for the word.
 * Two accents and a neutral rather than three accents, because the palette only has two: it is
 * the mascot's, and `secondary` there is the eclipse's **body** — a fill, and in dark mode the
 * very value `background.default` takes. A type is the quietest of the three kinds anyway, so it
 * reads as the absence of an accent rather than as a third one nobody has.
 */
const KIND = {
  function: { label: 'fn', tone: 'primary' },
  variable: { label: 'const', tone: 'success' },
  type: { label: 'type', tone: 'neutral' },
} as const;

type Tone = (typeof KIND)[keyof typeof KIND]['tone'];

/**
 * The readable end of a tone, per mode.
 *
 * `main` is tuned to be a background with `contrastText` on it; as 11px text on the *page* it is
 * the wrong end of the ramp — amber `primary.main` measures 3.19:1 on white, under the 4.5:1 an
 * 11px bold glyph needs. So light mode takes `dark` and dark mode takes `light`, which is the
 * pair MUI ships for exactly this. The observation this badge made first is now a palette token,
 * `accent.onSurface`, and every amber-on-the-page in the app reads it.
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
        // No `opacity` here: it multiplies the contrast that was just measured, and a badge this
        // small has none to give away. Reach for a dimmer tone instead if one is wanted.
        flexShrink: 0,
      }}
    >
      {label}
    </Box>
  );
};
