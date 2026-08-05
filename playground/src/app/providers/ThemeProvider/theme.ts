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

export const createAppTheme = (mode: 'light' | 'dark') => {
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
        main: '#d946ef', // Fuchsia 500
        light: '#e879f9', // Fuchsia 400
        dark: '#a21caf', // Fuchsia 700
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#f0abfc', // Fuchsia 300
        light: '#f5d0fe', // Fuchsia 200
        dark: '#c026d3', // Fuchsia 600
        contrastText: '#000000',
      },
      ...(mode === 'dark' && {
        background: {
          default: '#000000',
          paper: '#121212',
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
            backgroundColor: '#d946ef', // Fuchsia 500 (primary)
            color: '#ffffff',
            fontSize: '0.875rem', // normalized — body2 size, readable regardless of source variant
          },
          arrow: {
            color: '#d946ef', // Fuchsia 500 (primary)
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          contained: {
            '&:hover': {
              backgroundColor: '#c026d3', // Fuchsia 600
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
            // Prevent background scroll when a blocking modal is open (critical on mobile
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
