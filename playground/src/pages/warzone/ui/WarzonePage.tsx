import { PageLayout } from '@/shared/ui/PageLayout';
import { UmbraMoon } from '@/shared/ui/PeekingMoon/UmbraMoon';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * A deliberately empty page: build a flow against the core and take it apart again, never a demo —
 * a scratch surface that starts explaining itself has become one. Anything worth keeping moves to a
 * real route with a card and a `codeSamples` entry (`playground/CLAUDE.md`). `RootLayout` hides
 * the peeking mascot here as on `/`: a hider beside its full-size twin reads as a stray render.
 */
export const WarzonePage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <PageLayout
      title="Warzone"
      description="Scratch space. Nothing lives here on purpose — it is where a flow gets built against the core, tried, and taken apart again."
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 3,
          py: { xs: 6, md: 10 },
        }}
      >
        {/* The corona paints past the SVG's box, so the art is inset in a square that clips
            nothing — the landing page hero's arrangement. */}
        <Box
          sx={{
            width: { xs: 160, md: 200 },
            aspectRatio: '1',
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ width: '78%', aspectRatio: '1' }}>
            <UmbraMoon isDark={isDark} breathing />
          </Box>
        </Box>

        <Typography variant="h5" component="p" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          This is a warzone.
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
          A placeholder, waiting for a flow to validate against the core — or for something worth
          showing. Expect it to be empty between visits.
        </Typography>
      </Box>
    </PageLayout>
  );
};
