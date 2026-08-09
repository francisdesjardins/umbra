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
  }
  interface PaletteOptions {
    scrollbar?: {
      thumb?: string | undefined;
      track?: string | undefined;
      width?: string | undefined;
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

export const createAppTheme = (mode: 'light' | 'dark') => {
  const mascot = MASCOT[mode];

  return createTheme({
    // Scrollbar tokens (used by global styles to theme scrollbars)
    scrollbar: {
      thumb: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      track: 'transparent',
      width: '10px',
    },
    palette: {
      mode,
      primary: {
        main: mascot.flame,
        light: mascot.ink,
        dark: mascot.flameEdge,
        contrastText: '#ffffff',
      },
      // The body, not a second accent. An eclipse is one fire against one shadow, and a palette
      // with two warm accents has nowhere left to put emphasis.
      secondary: {
        main: mascot.body,
        light: mascot.bodyEdge,
        dark: mode === 'dark' ? '#020617' : '#0f172a',
        contrastText: '#ffffff',
      },
      ...(mode === 'dark' && {
        background: {
          // The mascot's own body rather than pure black: amber on `#000` is a warning label,
          // amber on slate is dusk. It is also what the moon is already drawn on.
          default: mascot.body,
          paper: mascot.bodyEdge === '#334155' ? '#111c30' : '#121212',
        },
        text: {
          primary: '#ffffff',
          secondary: 'rgba(255, 255, 255, 0.7)',
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
        styleOverrides: {
          contained: {
            '&:hover': {
              backgroundColor: MASCOT[mode].flameEdge,
            },
          },
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
