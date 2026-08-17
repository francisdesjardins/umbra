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
 * The palette is the mascot's, not a decoration chosen beside it.
 *
 * `UmbraMoon` draws an eclipse: a dark slate body with the corona escaping around its rim in
 * ambers. Every value below is one of the five it already uses — flame, flame edge, body, body
 * edge, ink — so the page and the thing in its corner cannot drift into two different products.
 *
 * The fuchsia this replaces was a personal mark rather than the library's, and it fought the
 * mascot: a magenta accent beside an amber corona reads as two brands sharing a page.
 *
 * The corona shifts intensity between modes rather than hue, the way the mascot does — a bright
 * page needs less glow to register, so light mode takes the deeper amber and dark mode the
 * brighter one.
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
 * What sits *on* the corona, in both modes.
 *
 * Amber cannot carry white text: `#d97706` measures 3.19:1 against `#ffffff` and `#f59e0b` only
 * 2.15:1, so a contained button was the least readable thing on the page — worst in dark mode,
 * where the fill is brightest. The eclipse already answers this: fire is what you read the dark
 * body against, not the other way round.
 *
 * The consequence is that **primary hover has to brighten, not darken.** Deepening the fill to
 * `flameEdge` under a dark ink lands at 2.5:1 — the old hover was compensating for the old ink.
 */
const INK_ON_FLAME = '#0f172a';

export const createAppTheme = (mode: 'light' | 'dark') => {
  const mascot = MASCOT[mode];

  // The readable end of the corona, per mode — amber as *text* rather than as a fill.
  // `main` is tuned to be a background, and on the page it is the wrong end of the ramp:
  // `#d97706` measures 3.19:1 on white. Light mode takes the deep edge, dark mode the bright
  // ink, which is the pair MUI ships for exactly this and the one `KindBadge` already used.
  const accent = mode === 'dark' ? mascot.ink : mascot.flameEdge;

  return createTheme({
    // Scrollbar tokens (used by global styles to theme scrollbars)
    scrollbar: {
      thumb: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      track: 'transparent',
      width: '10px',
    },
    palette: {
      mode,
      // MUI's default is 3, which is AA for *large* text only — so white scores 3.19 on
      // `#d97706`, clears the bar and gets picked, and every contained button ships at 3.19:1.
      // At 4.5 the derived `contrastText` is a readable ink on error and success too.
      contrastThreshold: 4.5,
      accent: {
        onSurface: accent,
        ring: accent,
      },
      primary: {
        main: mascot.flame,
        light: mascot.ink,
        dark: mascot.flameEdge,
        // The eclipse's own body, not a generic black: the mascot is fire behind a dark disc,
        // and this is that disc. The *deepest* of the two bodies in both modes — the lighter
        // one clears 4.5 by a tenth, and a tenth is what a washed-out panel spends.
        contrastText: INK_ON_FLAME,
      },
      // The body, not a second accent. An eclipse is one fire against one shadow, and a palette
      // with two warm accents has nowhere left to put emphasis.
      secondary: {
        main: mascot.body,
        light: mascot.bodyEdge,
        dark: mode === 'dark' ? '#020617' : '#0f172a',
        contrastText: '#ffffff',
      },
      /**
       * A third step in the text ramp, and a readable one.
       *
       * `text.disabled` is MUI's *inactive control* tone (0.38 in light mode, 2.68:1 on white)
       * and this app spends it as tertiary text — counts, specifier labels, hints, the “Result:”
       * placeholder — none of which is inactive, so none of which 1.4.3 exempts. Eighteen call
       * sites, one decision: raise the token rather than repaint the sites.
       *
       * The step it leaves is small on purpose. Below `secondary` there is no room left above
       * 4.5:1, so the hierarchy under this line is carried by size and weight, not by fading.
       */
      text: {
        ...(mode === 'dark' ? { primary: '#ffffff', secondary: 'rgba(255, 255, 255, 0.7)' } : {}),
        disabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.55)',
      },
      ...(mode === 'dark' && {
        background: {
          // The mascot's own body rather than pure black: amber on `#000` is a warning label,
          // amber on slate is dusk. It is also what the moon is already drawn on.
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
        // Matched on `color: 'primary'`, not applied to the `contained` slot: the unscoped rule
        // this replaces painted *every* filled button amber on hover, so the red Delete buttons
        // on /modal-actions turned brand-coloured under the pointer. A destructive action has to
        // stay destructive.
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            // The corona flares — it does not go out. With a dark ink on the fill, deepening it
            // is what breaks contrast; brightening keeps the pair legible (8.3:1 light, 10.7:1
            // dark), and is what an eclipse does anyway.
            style: {
              '&:hover': { backgroundColor: mode === 'dark' ? mascot.ink : MASCOT.dark.flame },
            },
          },
          // The unfilled variants paint `primary.main` on the *page*, which is the 3.19:1 pair
          // the accent token exists to replace. The outline goes with it: MUI draws it at
          // `alpha(main, .5)`, which is 2.1:1 against the page and below what a boundary needs.
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
      // A focused field's label turns `primary.main`, which is the same 3.19:1 pair as everywhere
      // else — and a label is the one piece of text a filled field cannot do without.
      MuiFormLabel: {
        styleOverrides: {
          root: { '&.Mui-focused': { color: accent } },
        },
      },
      // MUI pulls the root 11px left so a Checkbox's ripple squares up with text above and below
      // it. A Switch is padded differently, so the pull does not align anything — it just hangs
      // the control outside whatever contains it, measurably: 330px against a content edge at
      // 341px, on cards and inside dialogs alike. Zeroed here rather than with an `ml: 0` at each
      // call site, for the same reason the focus ring is declared once.
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
             * One keyboard focus ring, for everything.
             *
             * There was none. `ButtonBase` zeroes the UA outline and marks focus with its own
             * `.Mui-focusVisible` class, and in this theme that class resolves to no visual
             * change at all — measured in the browser, not inferred: outline, box-shadow,
             * border, background and both pseudo-elements are byte-identical focused and not.
             * So every button, every sidebar entry and every card link was focusable with
             * nothing on screen to say which one had it.
             *
             * Declared globally rather than per component, because the custom link surfaces
             * (the home cards, the brand) are plain `<a>` and would each need their own rule.
             * The 2px offset puts the ring on the page rather than on the control, which is
             * what keeps it readable on top of the amber fill.
             *
             * `body ` is load-bearing, not tidiness: `ButtonBase` zeroes the outline from
             * `.MuiButtonBase-root`, which is the same specificity as a bare `:focus-visible`
             * and is injected after this, so it won. The descendant element lifts this above
             * it. Measured — with the bare selector the plain links got a ring and every MUI
             * button silently did not.
             */
            'body :focus-visible': {
              outline: `2px solid ${theme.palette.accent.ring}`,
              outlineOffset: '2px',
            },
            // Browser UA stylesheet sets `color: black` on <dialog> elements explicitly,
            // overriding any inherited theme colour. Reset it to inherit so MUI theme
            // text colours (set on body by CssBaseline) flow through correctly.
            dialog: {
              color: 'inherit',
            },
            // Prevent background scroll when a modal dialog is open (critical on mobile
            // where touch-scrolling passes through the native backdrop).
            // Non-modal dialogs (data-modal-type="non-modal") leave scroll intact.
            'html:has(dialog[open][data-modal-type="modal"])': {
              overflow: 'hidden',
            },
            // WCAG 2.3.3 — the one-rule off-switch the library's close path is built to meet:
            // `checkTransitionsDisabled` measures a 0s duration and finalizes immediately, so a
            // reduced-motion dialog snaps instead of waiting for a `transitionend` that never
            // comes. On the dialog element only: the slide/fade defaults live there as inline
            // transitions, which is why the `!important` is required and safe.
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

// Minimal helper to provide theme tokens to non-MUI consumers (keeps templates uncoupled)
export const getPrimaryHex = (mode: 'light' | 'dark') => {
  return createAppTheme(mode).palette.primary.main;
};
