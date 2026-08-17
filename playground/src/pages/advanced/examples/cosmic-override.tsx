import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { ResultDisplay } from '@/shared/ui/ResultDisplay/ResultDisplay';
import { Box, Stack, Typography } from '@mui/material';
import { dialogPlacement } from 'umbra';
import { Key, useModal } from 'umbra/react';
import { useState } from 'react';

export const GATE_ID = 'cosmic-gate';
export const WARP_ID = 'cosmic-warp';

// ── Everything below is user-land ────────────────────────────────────────────
// The library contributes a `<dialog>`, a phase to animate on, a place to put it and a typed way
// out — not one pixel. This example overrides every hook it offers (animation, backdrop,
// placement, dismissal, hotkeys, the template label) to show where the seam is.

/**
 * `--dialog-backdrop` is the library's one visual opinion, so theming it is a declaration rather
 * than a specificity fight; `data-modal-id` reaches one dialog without knowing where it renders.
 */
const COSMIC_CSS = `
  dialog[data-modal-id="${WARP_ID}"] {
    /* The corona is its own custom property so the phone can restate *only this layer*.
       On a wide screen a circle sized to the closest side is the shape: the band clears the rim
       and the fade dies at the nearest edge, with nothing cut. (The CSS default,
       \`farthest-corner\`, is not — its radius on a 390×844 phone is ~465px against a 195px
       half-width, so the band ran straight off both sides and the halo looked sliced.) */
    --warp-corona:
      radial-gradient(circle closest-side at 50% 50%,
        transparent 28%, rgba(245,158,11,0.30) 46%, rgba(180,83,9,0.14) 66%, transparent 100%);

    --dialog-backdrop:
      radial-gradient(1.5px 1.5px at 20% 30%, #fde68a, transparent),
      radial-gradient(2px 2px at 75% 15%, #fbbf24, transparent),
      radial-gradient(1px 1px at 45% 70%, #fef3c7, transparent),
      radial-gradient(1.5px 1.5px at 90% 60%, #f59e0b, transparent),
      var(--warp-corona),
      radial-gradient(ellipse at 50% 50%, #1e293b 0%, #020617 72%);
  }

  /* Still a circle on a phone — what changes is which side it is sized to.
     The composition is a *ratio*: on a desktop the ring sits at roughly four times the disc's
     radius, and sizing to the closest side on a tall screen collapses that to two — a collar
     around the eclipse with the screen dark above and below. \`farthest-side\` takes the
     half-height instead, which restores the ratio and fills the height. The band then runs a
     little past the left and right edges, and that is correct: what leaves the screen is the
     soft outer falloff, not the ring. Scoped here on purpose — the desktop shape above is the
     one that was wanted and is left exactly as it is. */
  @media (max-width: 599.98px) {
    dialog[data-modal-id="${WARP_ID}"] {
      --warp-corona:
        radial-gradient(circle farthest-side at 50% 50%,
          transparent 28%, rgba(245,158,11,0.30) 46%, rgba(180,83,9,0.14) 66%, transparent 100%);
    }
  }

  dialog[data-modal-id="${WARP_ID}"]::backdrop {
    animation: cosmic-drift 24s linear infinite alternate;
  }

  @keyframes cosmic-drift {
    to {
      background-position:
        400px -240px, -300px 180px, 250px 120px, -180px -90px, 0 0, 0 0;
    }
  }

  @keyframes cosmic-corona {
    to { transform: rotate(360deg); }
  }

  @keyframes cosmic-flare {
    50% { box-shadow: 0 0 90px 22px rgba(245, 158, 11, 0.5); }
  }

  @media (prefers-reduced-motion: reduce) {
    dialog[data-modal-id="${WARP_ID}"]::backdrop { animation: none; }
  }
`;

/** The mascot's silhouette in CSS: a dark body with the corona escaping around its rim. */
const eclipseSx = {
  position: 'relative',
  width: 110,
  height: 110,
  flexShrink: 0,
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    borderRadius: '50%',
  },
  // Masked to a ring so the flames only ever clear the rim.
  '&::after': {
    inset: 0,
    background: 'conic-gradient(from 0deg, #b45309, #f59e0b, #fde68a, #f59e0b, #b45309)',
    maskImage: 'radial-gradient(circle, transparent 62%, #000 66%)',
    animation: 'cosmic-corona 9s linear infinite',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  },
  // The umbra, lit off-centre the way the mascot's disc is.
  '&::before': {
    inset: '9%',
    background: 'radial-gradient(circle at 38% 32%, #334155, #0f172a 72%)',
    animation: 'cosmic-flare 3.6s ease-in-out infinite',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  },
};

const panelSx = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  p: 3,
  color: '#e2e8f0',
  textAlign: 'center',
};

const buttonSx = {
  px: 2,
  py: 1,
  borderRadius: 2,
  border: '1px solid rgba(245,158,11,0.6)',
  background: 'rgba(245,158,11,0.14)',
  color: '#fcd34d',
  font: 'inherit',
  cursor: 'pointer',
  '&:hover': { background: 'rgba(245,158,11,0.3)' },
  '&:disabled': { opacity: 0.55, cursor: 'progress' },
};

/**
 * Collapses to a point rather than sliding away: a contained dialog is positioned against its
 * host, and a translate past the host's edge would grow the page's scroll area.
 */
const GATE_ANIMATION = {
  entrance: { opacity: 1, transform: 'scale(1)', filter: 'brightness(1)' },
  exit: { opacity: 0, transform: 'scale(0.05)', filter: 'brightness(2.2)' },
  duration: 520,
  exitDuration: 340,
  transitionProperty: 'opacity, transform, filter',
};

/** The other way an eclipse ends: the shadow passes and light floods. */
const WARP_ANIMATION = {
  entrance: { opacity: 1, transform: 'scale(1) rotateX(0deg)', filter: 'brightness(1) blur(0px)' },
  exit: { opacity: 0, transform: 'scale(1.7) rotateX(35deg)', filter: 'brightness(2) blur(14px)' },
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

  // The same table `useModal` places its dialog with, read as plain data — a hand-built host
  // outside React applies exactly this.
  const placement = dialogPlacement({ nonModal: true, portal: false });

  const warp = useModal<string, 'abort' | 'engage'>({
    id: WARP_ID,
    ariaLabel: 'Warp core',
    // The label a cross-cutting listener sees, the way `useSlideModal` reports 'slide'.
    template: 'cosmic',
    animation: WARP_ANIMATION,
    dismissKey: Key.Escape,
    // The backdrop is the artwork here, so a stray click on it should not end the demo; Escape
    // and Abort remain.
    dismissOnBackdropClick: false,
    render: ({ handle, action, error }) => {
      // Every field an action hands out is a real DOM prop, so the set spreads onto a raw
      // `<button>`: `aria-keyshortcuts` rides along to find the Enter hotkey, running state
      // reads back off `data-loading`.
      const engage = action('engage', {
        hotkey: Key.Enter,
        onAction: async (close) => {
          // Throws now and then, which is the point: a failed action keeps the modal open and
          // leaves the reason on `error`.
          await simulateApiCall('Warp charge', 900);
          close(pickSector());
        },
      });

      return (
        <Box
          sx={{
            ...panelSx,
            width: '80vw',
            maxWidth: 560,
            // Full height on a phone (`panelSx` centres the content), because the pulse is a 90px
            // `box-shadow` and the `<dialog>` clips as a scroll container: content-sized, the disc
            // sat within 30px of the top and the glow was cut off in a straight line above it.
            // `60vh` is the desktop proportion but a trap under 400px, where the content overflows
            // and centred overflow spills out of both ends.
            height: { xs: '100dvh', md: '60vh' },
          }}
        >
          <Box sx={eclipseSx} />
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, letterSpacing: '0.12em', color: '#fcd34d' }}
          >
            WARP CORE ONLINE
          </Typography>
          <Typography variant="body2" sx={{ maxWidth: 460, opacity: 0.85 }}>
            The corona burning behind this panel is the browser&apos;s own <code>::backdrop</code>,
            restyled by one selector in this file — clicking it does nothing, because this modal
            refuses that dismissal. Escape still works, and Enter engages, because the action
            declared the hotkey and nothing else had to.
          </Typography>
          <Stack direction="row" sx={{ gap: 1.5 }}>
            <Box component="button" sx={buttonSx} {...engage}>
              {engage['data-loading'] ? 'Charging…' : <>Engage</>}
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
    // Named even though it never takes focus: a non-modal `<dialog>` stays in the accessibility
    // tree, so a virtual cursor walks into it and an unnamed one announces as just "dialog".
    ariaLabel: 'Warp gate',
    template: 'cosmic',
    nonModal: true,
    // A non-modal lets clicks through, so click-outside would dismiss the gate the moment you
    // reach for anything else on the page — the code viewer for this example included.
    dismissOnClickOutside: false,
    /**
     * Wrap Tab inside the gate, which a non-modal dialog does not get for free: `showModal()`
     * makes everything behind it inert and the browser traps focus, `show()` does neither, so Tab
     * walked off Close and into the sector behind. Off by default because the commonest non-modal
     * surface is a toast or popover, where trapping the keyboard is the defect rather than the fix.
     */
    containFocus: true,
    animation: GATE_ANIMATION,
    /**
     * Fill the sector rather than sit centred in it at content size. The UA gives every `<dialog>`
     * `margin: auto` and `fit-content` sizing, and those beat `inset: 0` — an absolutely positioned
     * box with auto margins and a non-`auto` size is over-constrained, so CSS centres instead of
     * stretching. Measured in this 340px sector the dialog came out 337.44px, a 1.3px sliver of
     * starfield at each end that reads as a seam.
     *
     * Asked for here rather than fixed in `dialogPlacement`, because content-sizing keeps the
     * region *around* a contained dialog clickable and the core tests hold it to that. Covering the
     * sector is this demo's choice — the trigger is unmounted and click-outside already refused.
     */
    style: { margin: 0, width: 'auto', height: 'auto' },
    render: ({ handle }) => {
      return (
        <Box
          sx={{
            ...panelSx,
            gap: 1.5,
            // 20px, not the shared 24: `height: 100%` resolves against a host with no height of
            // its own, so the panel is content-sized and a 24px band at each end pushed it past
            // the clipping dialog, taking the rim with it — top and bottom only, never the sides.
            p: 2.5,
            overflow: 'hidden',
            background: 'linear-gradient(160deg, rgba(30,41,59,0.92), rgba(2,6,23,0.96))',
            /**
             * Inset, and opaque enough to survive being split. Measured at DPR 1: left/right land
             * on whole pixels (41.000, 334.000) while top/bottom are fractional (222.4375,
             * 567.875), so a 1px band there spreads over two device pixels at ~56/44 — at the 0.45
             * alpha this used to carry, each half lands near 0.25 against a dark gradient and
             * vanishes. Geometry belongs to the ancestors; alpha is the fixable half.
             */
            boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.9)',
            borderRadius: 3,
          }}
        >
          <Box sx={{ ...eclipseSx, width: 72, height: 72 }} />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, letterSpacing: '0.1em', color: '#fcd34d' }}
          >
            GATE OPEN
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8, maxWidth: 420 }}>
            Positioned <code>{String(placement.dialog.position)}</code> against a host the library
            owns, so it answers to this sector rather than the viewport and no transformed ancestor
            can drag it away. Sized by its own content. Click-outside is refused, so it closes on
            the button.
          </Typography>
          <Stack direction="row" sx={{ gap: 1.5 }}>
            <Box
              component="button"
              sx={buttonSx}
              onClick={() => {
                void warp.open();
              }}
            >
              Enter
            </Box>
            <Box
              component="button"
              sx={buttonSx}
              onClick={() => {
                handle.close('closed');
              }}
            >
              Close
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

      {/* The sector: a sized, positioned region of your app — the "the host must have a size"
          half of the contained-placement contract. */}
      <Box
        sx={{
          position: 'relative',
          height: 340,
          overflow: 'hidden',
          borderRadius: 3,
          // No flex centering: the library's host is a child of this box, and `align-items:
          // center` would shrink it to its content so the panel sized itself instead of the
          // sector — contained placement's documented failure mode.
          background:
            'radial-gradient(1.5px 1.5px at 15% 25%, #fde68a, transparent),' +
            'radial-gradient(1px 1px at 65% 40%, #fbbf24, transparent),' +
            'radial-gradient(2px 2px at 85% 75%, #f59e0b, transparent),' +
            'radial-gradient(ellipse at 30% 110%, #422006 0%, #020617 65%)',
        }}
      >
        {!gate.isVisible && (
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
