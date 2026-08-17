import { alpha, createTheme, type Theme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    scrollbar: {
      thumb: string;
      track: string;
      width?: string | undefined;
    };
  }
  interface ThemeOptions {
    scrollbar?: {
      thumb?: string | undefined;
      track?: string | undefined;
      width?: string | undefined;
    };
  }
  interface Palette {
    scrollbar: {
      thumb: string;
      track: string;
      width?: string | undefined;
    };
    accent: {
      onSurface: string;
      ring: string;
    };
  }
  interface PaletteOptions {
    scrollbar?: {
      thumb?: string | undefined;
      track?: string | undefined;
      width?: string | undefined;
    };
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
    // Read by the global styles below.
    scrollbar: {
      thumb: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      track: 'transparent',
      width: '10px',
    },
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
        // *every* filled button amber on hover, turning /modal-actions' red Delete brand-coloured.
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
      MuiCssBaseline: {
        styleOverrides: (theme: Theme) => {
          return {
            '*, *::before, *::after': {
              // Firefox
              scrollbarWidth: 'thin',
              scrollbarColor: `${theme.scrollbar.thumb} ${theme.scrollbar.track}`,
            },
            // Webkit
            '*::-webkit-scrollbar': {
              width: theme.scrollbar.width,
              height: theme.scrollbar.width,
            },
            '*::-webkit-scrollbar-track': {
              background: theme.scrollbar.track,
            },
            '*::-webkit-scrollbar-thumb': {
              backgroundColor: theme.scrollbar.thumb,
              borderRadius: 8,
              border: `2px solid ${theme.scrollbar.track}`,
            },
            '*::-webkit-scrollbar-thumb:hover': {
              backgroundColor: alpha(theme.scrollbar.thumb, 0.9),
            },
            /**
             * One keyboard focus ring, for everything. `ButtonBase` zeroes the UA outline and
             * marks focus with `.Mui-focusVisible`, which in this theme resolves to no visual
             * change at all (measured: outline, box-shadow, border, background and both
             * pseudo-elements byte-identical focused and not). Declared globally because the
             * custom link surfaces are plain `<a>`; the 2px offset puts the ring on the page
             * rather than the control, which keeps it readable over the amber fill.
             *
             * `body ` is load-bearing: `.MuiButtonBase-root` zeroes the outline at the same
             * specificity as a bare `:focus-visible` and is injected after this, so it won. The
             * descendant selector lifts this above it — measured, with the bare selector the plain
             * links got a ring and every MUI button silently did not.
             */
            'body :focus-visible': {
              outline: `2px solid ${theme.palette.accent.ring}`,
              outlineOffset: '2px',
            },
            // The UA stylesheet sets `color: black` on <dialog> explicitly, overriding the theme
            // colour CssBaseline puts on body.
            dialog: {
              color: 'inherit',
            },
            // Background scroll while a modal is open — critical on mobile, where touch-scrolling
            // passes through the native backdrop. Non-modal dialogs leave scroll intact.
            'html:has(dialog[open][data-modal-type="modal"])': {
              overflow: 'hidden',
            },
            // WCAG 2.3.3: `checkTransitionsDisabled` measures a 0s duration and finalizes at once,
            // so a reduced-motion dialog snaps rather than awaiting a `transitionend` that never
            // comes. Dialog element only — the slide/fade defaults are inline there, which is why
            // the `!important` is required and safe.
            '@media (prefers-reduced-motion: reduce)': {
              'dialog[data-modal-id]': {
                transition: 'none !important',
              },
            },
          };
        },
      },
    },
  });
};

// Theme tokens for non-MUI consumers, so templates stay uncoupled.
export const getPrimaryHex = (mode: 'light' | 'dark') => {
  return createAppTheme(mode).palette.primary.main;
};
