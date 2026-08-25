import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    accent: {
      onSurface: string;
      ring: string;
    };
  }
  interface PaletteOptions {
    accent?: {
      onSurface?: string | undefined;
      ring?: string | undefined;
    };
  }
}

/**
 * The palette is the mascot's: every value is one of the five `UmbraMoon` already draws its
 * eclipse with — flame, flame edge, body, body edge, ink — so the page and the thing in its corner
 * cannot drift into two products. The corona shifts intensity between modes rather than hue, since
 * a bright page needs less glow to register: light mode takes the deeper amber, dark the brighter.
 */
const MASCOT = {
  light: {
    flame: '#d97706',
    flameEdge: '#92400e',
    body: '#1e293b',
    bodyEdge: '#475569',
    ink: '#fcd34d',
  },
  dark: {
    flame: '#f59e0b',
    flameEdge: '#b45309',
    body: '#0f172a',
    bodyEdge: '#334155',
    ink: '#fbbf24',
  },
} as const;

/**
 * What sits *on* the corona, in both modes. Amber cannot carry white text — `#d97706` is 3.19:1
 * against `#ffffff` and `#f59e0b` only 2.15:1 — so fire is what you read the dark body against,
 * not the reverse. The consequence: **primary hover has to brighten, not darken**, since deepening
 * the fill to `flameEdge` under a dark ink lands at 2.5:1.
 */
const INK_ON_FLAME = '#0f172a';

export const createAppTheme = (mode: 'light' | 'dark') => {
  const mascot = MASCOT[mode];

  // The readable end of the corona: amber as *text*, since `main` is tuned as a background and
  // `#d97706` is 3.19:1 on white. Light takes the deep edge, dark the bright ink.
  const accent = mode === 'dark' ? mascot.ink : mascot.flameEdge;

  return createTheme({
    palette: {
      mode,
      // MUI's default 3 is AA for *large* text only, so white scores 3.19 on `#d97706`, clears the
      // bar and gets picked — every contained button then ships at 3.19:1. At 4.5 the derived
      // `contrastText` is a readable ink on error and success too.
      contrastThreshold: 4.5,
      accent: {
        onSurface: accent,
        ring: accent,
      },
      primary: {
        main: mascot.flame,
        light: mascot.ink,
        dark: mascot.flameEdge,
        // The eclipse's own body, not a generic black — and the *deepest* of the two in both
        // modes, since the lighter one clears 4.5 by only a tenth.
        contrastText: INK_ON_FLAME,
      },
      // The body, not a second accent: a palette with two warm accents has nowhere to put emphasis.
      secondary: {
        main: mascot.body,
        light: mascot.bodyEdge,
        dark: mode === 'dark' ? '#020617' : '#0f172a',
        contrastText: '#ffffff',
      },
      /**
       * A third, readable step in the text ramp. `text.disabled` is MUI's *inactive control* tone
       * (0.38 light, 2.68:1 on white) but this app spends it as tertiary text — counts, hints, the
       * “Result:” placeholder — none of which 1.4.3 exempts, so the token is raised rather than
       * eighteen call sites repainted. The step it leaves is small: below `secondary` there is no
       * room above 4.5:1, so hierarchy under this line is size and weight, not fading.
       */
      text: {
        ...(mode === 'dark' ? { primary: '#ffffff', secondary: 'rgba(255, 255, 255, 0.7)' } : {}),
        disabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.55)',
      },
      ...(mode === 'dark' && {
        background: {
          // The mascot's body, not pure black: amber on `#000` is a warning label, on slate dusk.
          default: mascot.body,
          paper: mascot.bodyEdge === '#334155' ? '#111c30' : '#121212',
        },
      }),
    },
    components: {
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: MASCOT[mode].body,
            color: '#ffffff',
            fontSize: '0.875rem', // normalized — body2 size, readable regardless of source variant
          },
          arrow: {
            color: MASCOT[mode].body,
          },
        },
      },
      MuiButton: {
        // Matched on `color: 'primary'` rather than the `contained` slot: unscoped, it painted
        // *every* filled button amber on hover, turning /dialog-actions' red Delete brand-coloured.
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            // With a dark ink on the fill, deepening breaks contrast; brightening keeps the pair
            // legible (8.3:1 light, 10.7:1 dark).
            style: {
              '&:hover': { backgroundColor: mode === 'dark' ? mascot.ink : MASCOT.dark.flame },
            },
          },
          // Unfilled variants paint `primary.main` on the *page* — the 3.19:1 pair `accent`
          // replaces. The outline too: MUI draws it at `alpha(main, .5)`, 2.1:1 against the page.
          {
            props: { variant: 'text', color: 'primary' },
            style: { color: accent },
          },
          {
            props: { variant: 'outlined', color: 'primary' },
            style: { color: accent, borderColor: accent },
          },
        ],
      },
      MuiLink: {
        styleOverrides: {
          root: { color: accent },
        },
      },
      // A focused field's label turns `primary.main` — the same 3.19:1 pair, on the one piece of
      // text a filled field cannot do without.
      MuiFormLabel: {
        styleOverrides: {
          root: { '&.Mui-focused': { color: accent } },
        },
      },
      // MUI's 11px left pull squares up a Checkbox's ripple, but a Switch is padded differently
      // and just hangs outside its container — 330px against a content edge at 341px.
      MuiFormControlLabel: {
        styleOverrides: {
          root: { marginLeft: 0 },
        },
      },
    },
  });
};

// Theme tokens for non-MUI consumers, so templates stay uncoupled.
export const getPrimaryHex = (mode: 'light' | 'dark') => {
  return createAppTheme(mode).palette.primary.main;
};
