import { CodeBlock } from '@/shared/ui/CodeBlock/CodeBlock';
import { MoonPhase, type Phase } from '@/shared/ui/MoonPhase';
import { UmbraMoon } from '@/shared/ui/PeekingMoon/UmbraMoon';
import { Box, Button, Chip, Stack, Typography, useTheme } from '@mui/material';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Key, useMessageModal } from 'umbra/react';

const REPO = 'https://github.com/francisdesjardins/umbra';

const GETTING_IT = `git clone https://github.com/francisdesjardins/umbra.git
cd umbra && yarn install && yarn dev

# Or lift what you need out of src/ — plain TypeScript, MIT, no ceremony.
import { dialogManager } from 'umbra';   // the root: no framework needed
import { useModal } from 'umbra/react';  // the React binding
import { useModal } from 'umbra/solid';  // …or the Solid one, same surface
import { bindDialog } from 'umbra/vanilla'; // …or none: drive your own <dialog>`;

const HELLO = `const modal = useModal<void, 'confirm' | 'cancel'>({
  id: 'hello',
  ariaLabel: 'Hello',
  // Every field an action returns is a DOM prop, so this spread fits a bare
  // <button>, MUI's, or your own. Running state rides as \`data-loading\`.
  render: ({ action }) => (
    <>
      <button {...action('cancel', { focusOnOpen: true })}>Not now</button>
      <button {...action('confirm', { hotkey: Key.Enter })}>Confirm</button>
    </>
  ),
  onClose: (result) => report(result.reason), // 'confirm' | 'cancel' | 'dismiss'
});`;

/** What the site says before it starts explaining: what this is, how to get it, and one live modal. */
export const HomePage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [lastReason, setLastReason] = useState<string | null>(null);

  const hello = useMessageModal<void, 'confirm' | 'cancel'>({
    id: 'home-hello',
    ariaLabelledBy: 'home-hello-title',
    onClose: (result) => {
      // Shows the panel's claim rather than asserting it: the reason is typed and exhaustive.
      switch (result.reason) {
        case 'confirm':
          setLastReason('confirm');
          return;
        case 'cancel':
          setLastReason('cancel');
          return;
        case 'dismiss':
          setLastReason('dismiss (Escape or the backdrop)');
          return;
      }
    },
    render: ({ action }) => {
      return (
        <Box
          sx={{
            // The library ships no UI: unstyled, a dialog is text on the backdrop. Consumers bring
            // this, front page included.
            p: 3,
            maxWidth: 'min(420px, 88vw)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            boxShadow: 8,
          }}
        >
          <Typography id="home-hello-title" variant="h6" sx={{ fontWeight: 700 }}>
            This is the whole thing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A native <code>&lt;dialog&gt;</code> in the top layer, animated by CSS you wrote, closed
            with a reason your <code>onClose</code> can switch on exhaustively. Focus starts on{' '}
            <em>Not now</em> because that action asked for it. <kbd>Enter</kbd> confirms,{' '}
            <kbd>Escape</kbd> dismisses.
          </Typography>
          <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end', mt: 1 }}>
            <Button size="small" {...action('cancel', { focusOnOpen: true })}>
              Not now
            </Button>
            {/* No `onClick` of our own: after the spread it would replace the action's and the
                action would never run. A handler-less action closes with its own reason. */}
            <Button size="small" variant="contained" {...action('confirm', { hotkey: Key.Enter })}>
              Confirm
            </Button>
          </Stack>
        </Box>
      );
    },
  });

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
      {/* Hero */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ alignItems: 'center', gap: { xs: 3, md: 6 }, py: { xs: 4, md: 7 }, minWidth: 0 }}
      >
        {/* The corona paints past the SVG's box, so the art is inset in a square that clips
            nothing: the wrapper bounds the layout and the disc sits at 78% of it. */}
        <Box
          sx={{
            width: { xs: 176, md: 220 },
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

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontSize: { xs: '2rem', md: '3rem' },
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            {/* Sized to the heading's two steps: the mark is part of the lockup, not a bullet. */}
            <Box component="span" sx={{ display: { xs: 'none', md: 'flex' } }}>
              <MoonPhase phase="first-quarter" size={40} />
            </Box>
            <Box component="span" sx={{ display: { xs: 'flex', md: 'none' } }}>
              <MoonPhase phase="first-quarter" size={28} />
            </Box>
            Umbra
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
            Headless dialogs on the native top layer.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
            A dialog manager whose core is plain TypeScript — it resolves and runs with no framework
            installed at all. React and Solid ship as two bindings over it with the same surface —
            same hooks, same options, same typed close — and vanilla as a third that renders
            nothing: a controller for a &lt;dialog&gt; you wrote yourself. Zero UI components either
            way: the markup, the animation and the styling stay yours.
          </Typography>

          {lastReason ? (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 2, fontFamily: 'monospace', color: 'accent.onSurface' }}
            >
              onClose → result.reason === &apos;{lastReason}&apos;
            </Typography>
          ) : null}

          <Stack direction="row" sx={{ gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Chip size="small" label="0 runtime dependencies" />
            <Chip size="small" label="native <dialog>" />
            <Chip size="small" label="typed close payloads" />
            <Chip size="small" label="React · Solid · vanilla" />
            <Chip size="small" label="React Compiler ready" />
            {/* "Measured" is the claim, not "accessible": the README's Accessibility chapter and
                the WCAG rows of the compatibility matrix cite the test behind each cell. */}
            <Chip size="small" label="WCAG 2.2 · measured" />
          </Stack>

          <Stack direction="row" sx={{ gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={async () => {
                setLastReason(null);
                await hello.open();
              }}
            >
              Open a modal
            </Button>
            <Button component={Link} to="/getting-started" variant="outlined">
              Get started
            </Button>
            <Button href={REPO} target="_blank" rel="noreferrer">
              GitHub
            </Button>
          </Stack>
        </Box>
      </Stack>

      {/* Stacked, not side by side: at half width both snippets get a horizontal scrollbar. */}
      <Stack sx={{ gap: 3, mb: 5, minWidth: 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
          >
            <MoonPhase phase="first-quarter" size={14} />
            Getting it
          </Typography>
          <CodeBlock code={GETTING_IT} language="bash" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
          >
            <MoonPhase phase="last-quarter" size={14} />
            The whole API of a confirm dialog
          </Typography>
          <CodeBlock code={HELLO} language="tsx" />
        </Box>
      </Stack>

      {/* Where to go next — the three things worth seeing first. */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, pb: 6 }}>
        {(
          [
            {
              to: '/getting-started',
              phase: 'full',
              title: 'Start here',
              body: 'Open, render, close — and the typed reason that comes back.',
            },
            {
              to: '/advanced',
              phase: 'first-quarter',
              title: 'Stacking and focus',
              body: 'One Escape closes one modal; a shared hotkey fires at one level only.',
            },
            {
              to: '/api',
              phase: 'last-quarter',
              title: 'API reference',
              body: 'Generated from the source, so it cannot drift from the code.',
            },
            // `satisfies`, so each `phase` narrows to its literal instead of widening to `string`.
          ] satisfies readonly { to: string; phase: Phase; title: string; body: string }[]
        ).map((card) => {
          return (
            <Box
              key={card.to}
              component={Link}
              to={card.to}
              sx={{
                flex: 1,
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color 120ms, transform 120ms',
                '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <MoonPhase phase={card.phase} size={16} />
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {card.body}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      {/* Decoration, marked as such, and carrying no `opacity`: over `text.secondary` that
          measured 4.3:1, and an ornament is not worth a contrast exception. `MoonPhase` rather
          than shade-block glyphs, which carry the sizing problem it exists to solve. */}
      <Stack
        aria-hidden="true"
        direction="row"
        sx={{ gap: 1.5, pb: 4, color: 'text.secondary', justifyContent: 'center' }}
      >
        {(
          [
            'waxing-crescent',
            'first-quarter',
            'waxing-gibbous',
            'full',
            'waning-gibbous',
            'last-quarter',
            'waning-crescent',
          ] satisfies readonly Phase[]
        ).map((phase) => {
          return <MoonPhase key={phase} phase={phase} size={14} />;
        })}
      </Stack>

      {hello.Modal}
    </Box>
  );
};
