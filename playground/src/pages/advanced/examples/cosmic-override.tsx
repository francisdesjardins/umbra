import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';
import { Box, Stack, Typography } from '@mui/material';
import { dialogPlacement } from 'umbra';
import { Key, useModal } from 'umbra/react';
import { useState } from 'react';

export const GATE_ID = 'cosmic-gate';
export const WARP_ID = 'cosmic-warp';

// ── Everything below is user-land ────────────────────────────────────────────
//
// The library contributes four things to what you are about to see: a `<dialog>`, a phase to
// animate on, a place to put it, and a typed way out. Not one pixel. This example takes every
// hook it offers — animation, backdrop, placement, dismissal, hotkeys, the label the modal
// reports to listeners — and overrides it, to show where the seam actually is.

/**
 * The library's one visual opinion is `--dialog-backdrop`, so theming it is a declaration
 * rather than a specificity fight — and `data-modal-id` is how CSS reaches one dialog without
 * knowing anything about where it renders.
 */
const COSMIC_CSS = `
  dialog[data-modal-id="${WARP_ID}"] {
    --dialog-backdrop:
      radial-gradient(2px 2px at 20% 30%, #fff, transparent),
      radial-gradient(2px 2px at 75% 15%, #a5f3fc, transparent),
      radial-gradient(1px 1px at 45% 70%, #fff, transparent),
      radial-gradient(1.5px 1.5px at 90% 60%, #f0abfc, transparent),
      radial-gradient(ellipse at 50% 50%, #1e1b4b 0%, #020617 70%);
  }

  dialog[data-modal-id="${WARP_ID}"]::backdrop {
    animation: cosmic-drift 24s linear infinite alternate;
  }

  @keyframes cosmic-drift {
    to { background-position: 400px -240px, -300px 180px, 250px 120px, -180px -90px, 0 0; }
  }

  @keyframes cosmic-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes cosmic-pulse {
    50% { box-shadow: 0 0 90px 20px rgba(168, 85, 247, 0.55); }
  }
`;

/** A wormhole is a spinning conic gradient with a hole punched in it. The dialog never knows. */
const wormholeSx = {
  width: 110,
  height: 110,
  borderRadius: '50%',
  flexShrink: 0,
  background: 'conic-gradient(from 0deg, #a855f7, #22d3ee, #f0abfc, #a855f7)',
  animation: 'cosmic-spin 6s linear infinite, cosmic-pulse 3s ease-in-out infinite',
  maskImage: 'radial-gradient(circle, transparent 38%, #000 42%)',
};

const panelSx = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  p: 3,
  color: '#e0e7ff',
  textAlign: 'center',
};

const buttonSx = {
  px: 2,
  py: 1,
  borderRadius: 2,
  border: '1px solid rgba(168,85,247,0.6)',
  background: 'rgba(168,85,247,0.15)',
  color: '#e9d5ff',
  font: 'inherit',
  cursor: 'pointer',
  '&:hover': { background: 'rgba(168,85,247,0.32)' },
  '&:disabled': { opacity: 0.55, cursor: 'progress' },
};

/**
 * The gate collapses to a point instead of sliding away: a contained dialog is positioned
 * against its host, and a translate past the host's edge would grow the page's scroll area.
 */
const GATE_ANIMATION = {
  entrance: { opacity: 1, transform: 'scale(1) rotate(0deg)' },
  exit: { opacity: 0, transform: 'scale(0.05) rotate(-140deg)' },
  duration: 520,
  exitDuration: 340,
  transitionProperty: 'opacity, transform',
};

const WARP_ANIMATION = {
  entrance: { opacity: 1, transform: 'scale(1) rotateX(0deg)', filter: 'blur(0px)' },
  exit: { opacity: 0, transform: 'scale(1.7) rotateX(35deg)', filter: 'blur(14px)' },
  duration: 480,
  exitDuration: 320,
  transitionProperty: 'opacity, transform, filter',
};

const SECTORS = ['NGC-1300', 'Cygnus X-1', 'Messier 87', 'Sagittarius A*'];

const pickSector = () => {
  return SECTORS[Math.floor(Math.random() * SECTORS.length)] ?? 'deep space';
};

export function CosmicOverrideExample() {
  const [result, setResult] = useState<string | null>(null);

  // The same table `useModal` places its dialog with, read here as plain data. A host built by
  // hand — outside React, in a web component, in a canvas overlay — applies exactly this.
  const placement = dialogPlacement({ nonModal: true, portal: false });

  const warp = useModal<string, 'abort' | 'engage'>({
    id: WARP_ID,
    // A real dialog, so it says what it is. The gate below stays unnamed on purpose: it is
    // non-modal, never takes focus, and is announced by nothing.
    ariaLabel: 'Warp core',
    // The label a cross-cutting listener sees, the way `useSlideModal` reports 'slide'.
    modalType: 'cosmic',
    animation: WARP_ANIMATION,
    dismissKey: Key.Escape,
    dismissOnBackdropClick: true,
    render: ({ handle, action, error }) => {
      // Every field of an action's props is a real DOM prop except `loading`, which a raw
      // `<button>` would warn about — and `aria-keyshortcuts` rides along in the spread, which
      // is what makes the Enter hotkey find this button.
      const { loading, ...engage } = action('engage', {
        hotkey: Key.Enter,
        onAction: async (close) => {
          // Throws now and then — which is the point: a failed action keeps the modal open and
          // leaves the reason on `error` for you to render however you like.
          await simulateApiCall('Warp charge', 900);
          close(pickSector());
        },
      });

      return (
        <Box sx={{ ...panelSx, width: '80vw', maxWidth: 560, height: '60vh' }}>
          <Box sx={wormholeSx} />
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.12em' }}>
            WARP CORE ONLINE
          </Typography>
          <Typography variant="body2" sx={{ maxWidth: 460, opacity: 0.85 }}>
            The stars behind this panel are the browser&apos;s own <code>::backdrop</code>, restyled
            by one selector in this file. Escape or a click outside dismisses; Enter engages,
            because the action declared the hotkey and nothing else had to.
          </Typography>
          <Stack direction="row" sx={{ gap: 1.5 }}>
            <Box component="button" sx={buttonSx} {...engage}>
              {loading ? 'Charging…' : 'Engage ⏎'}
            </Box>
            <Box
              component="button"
              sx={buttonSx}
              onClick={() => {
                handle.close('abort');
              }}
            >
              Abort
            </Box>
          </Stack>
          {error && (
            <Typography variant="caption" role="alert" sx={{ color: '#fca5a5' }}>
              ⚠ {error.message} — core held, try again.
            </Typography>
          )}
        </Box>
      );
    },
    onClose: (closeResult) => {
      setResult(
        closeResult.reason === 'engage'
          ? `Warped to ${closeResult.data ?? 'somewhere'}`
          : `Warp ${closeResult.reason === 'abort' ? 'aborted' : 'dismissed'}`
      );
    },
  });

  const gate = useModal<void, 'closed'>({
    id: GATE_ID,
    modalType: 'cosmic',
    nonModal: true,
    dismissOnClickOutside: true,
    animation: GATE_ANIMATION,
    render: ({ handle }) => {
      return (
        <Box
          sx={{
            ...panelSx,
            gap: 1.5,
            overflow: 'hidden',
            background: 'linear-gradient(160deg, rgba(30,27,75,0.92), rgba(2,6,23,0.96))',
            border: '1px solid rgba(168,85,247,0.45)',
            borderRadius: 3,
          }}
        >
          <Box sx={{ ...wormholeSx, width: 72, height: 72 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
            GATE OPEN
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8, maxWidth: 330 }}>
            Rendered inline and positioned <code>{String(placement.dialog.position)}</code> against
            a host the library owns, so it answers to this sector rather than the viewport and no
            transformed ancestor can drag it away. Sized by its own content, because the library
            never decides that. Click outside to dismiss.
          </Typography>
          <Stack direction="row" sx={{ gap: 1.5 }}>
            <Box
              component="button"
              sx={buttonSx}
              onClick={() => {
                void warp.open();
              }}
            >
              Enter the wormhole
            </Box>
            <Box
              component="button"
              sx={buttonSx}
              onClick={() => {
                handle.close('closed');
              }}
            >
              Close gate
            </Box>
          </Stack>
        </Box>
      );
    },
    onClose: (closeResult) => {
      setResult(`Gate ${closeResult.reason}`);
    },
  });

  return (
    <Stack direction="column" sx={{ gap: 2 }}>
      <style>{COSMIC_CSS}</style>

      {/* The sector: a sized, positioned region of your app. A contained dialog fills whatever
          you hand it — this is the "the host must have a size" half of the placement contract. */}
      <Box
        sx={{
          position: 'relative',
          height: 340,
          overflow: 'hidden',
          borderRadius: 3,
          // No flex centering here on purpose. The library's host is a child of this box and
          // fills it; `align-items: center` would shrink that child to its content and the
          // panel would size itself instead of the sector — the documented failure mode of
          // contained placement. The trigger below is centred on its own layer instead.
          background:
            'radial-gradient(1.5px 1.5px at 15% 25%, #fff, transparent),' +
            'radial-gradient(1px 1px at 65% 40%, #a5f3fc, transparent),' +
            'radial-gradient(2px 2px at 85% 75%, #f0abfc, transparent),' +
            'radial-gradient(ellipse at 30% 110%, #312e81 0%, #020617 65%)',
        }}
      >
        {!gate.isOpen && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="button"
              sx={buttonSx}
              onClick={() => {
                void gate.open();
              }}
            >
              Open the gate
            </Box>
          </Box>
        )}
        {gate.Modal}
      </Box>

      <ResultDisplay result={result} />
      {warp.Modal}
    </Stack>
  );
}
