import { PageLayout } from '@/shared/ui/PageLayout';
import { UmbraMoon } from '@/shared/ui/PeekingMoon/UmbraMoon';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * A deliberately empty page, kept empty.
 *
 * Somewhere to build a flow against the core and watch it behave — a reproduction, a stacking
 * arrangement nobody has tried, a shape being shown before it is worth a card. Nothing here is a
 * demo: `/getting-started` through `/microfrontends` are the demonstrations, and a scratch surface
 * that starts explaining itself has quietly become one of them.
 *
 * **The moon is the still one**, the same `UmbraMoon` the landing page makes its hero. The peeking
 * mascot is suppressed on this route in `RootLayout` for the reason it is suppressed on `/`: the
 * joke is that one is *hiding*, and a hider beside a full-size twin reads as a stray second render.
 *
 * Whatever lands here is temporary by construction. If something proves worth keeping, it belongs
 * on a real route with a card and a `codeSamples` entry — see `playground/CLAUDE.md`.
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
        {/* The corona is painted past the SVG's own box, so the art is inset in a square that
            clips nothing — the wrapper bounds the layout and the flames burn into the margin.
            Same arrangement as the landing page's hero. */}
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
