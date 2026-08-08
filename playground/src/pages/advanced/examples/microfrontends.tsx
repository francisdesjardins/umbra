import { Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';

/**
 * Two microfrontends, one shared manager, in an iframe.
 *
 * The page inside is deliberately not part of this app: plain HTML, an import map, and two
 * `<script type="module">`. No bundler runs on it, which is the only way to show what the import
 * map is doing — a build step that resolved `umbra` for both sides would prove nothing.
 *
 * It demonstrates the claim `requestOpen` exists for: a dialog owned by one microfrontend,
 * addressed by another that never imports it. `dialogManager` is a module-level singleton, so
 * pointing both at one URL is the whole mechanism — two copies would be two registries and the
 * request would find nothing.
 *
 * The two sides use different bindings on purpose. Checkout is React and drives its dialog with
 * `useModal`; Billing is plain JavaScript and registers its own `<dialog>` with the store engine
 * in about forty lines. They address each other regardless, because what they share is the
 * manager and not the framework.
 *
 * No `ExampleLayout` here: there is no trigger row, no modal of ours and no result to report —
 * everything happens in the frame, which is a document and a realm of its own.
 */
export function MicrofrontendsExample() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <Stack sx={{ gap: 1.5, width: '100%', minWidth: 0 }}>
      <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setReloadKey((n) => {
              return n + 1;
            });
          }}
        >
          Restart the host
        </Button>
        <Typography variant="caption" color="text.secondary">
          Ask across the boundary in either direction, then read both logs.
        </Typography>
      </Stack>

      <Box
        key={reloadKey}
        component="iframe"
        src={`${import.meta.env.BASE_URL}mfe/host.html`}
        title="Microfrontend host — two microfrontends sharing one dialog manager"
        // The frame carries its own copy of the library and of React; it sits low on the page,
        // so it should not be fetched by anyone who never scrolls to it.
        loading="lazy"
        sx={{
          width: '100%',
          // Measured, not guessed: at 390px the panels stack and the content wants ~860px, so a
          // shorter frame gets its own scrollbar inside the page's. Anything left over is
          // absorbed by the logs, which are `flex: 1` — a generous height costs nothing.
          height: { xs: 900, sm: 470 },
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      />
    </Stack>
  );
}
