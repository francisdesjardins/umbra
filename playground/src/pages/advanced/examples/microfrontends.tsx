import { Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';

/**
 * Three microfrontends, one shared manager, in an iframe.
 *
 * The page inside is deliberately not part of this app: plain HTML, an import map, and three
 * `<script type="module">`. No bundler runs on it, which is the only way to show what the import
 * map is doing — a build step that resolved `umbra` for all three would prove nothing.
 *
 * It demonstrates the claim `requestOpen` exists for: a dialog owned by one microfrontend,
 * addressed by another that never imports it. `dialogManager` is a module-level singleton, so
 * pointing every side at one build is the whole mechanism — three copies would be three
 * registries and the requests would find nothing.
 *
 * The three sides are written three different ways on purpose, and that is the second claim.
 * Checkout drives its dialog with `useModal` from `umbra/react`; Support does the same with
 * `useModal` from `umbra/solid` — the same call, the same options, the same return; Billing uses
 * no binding at all and registers its own `<dialog>` with the store engine in about forty lines.
 * They address each other regardless, because what they share is the manager and not the
 * framework.
 *
 * Push Checkout past Billing's approval limit to see a request cross all three: React asks plain
 * JS, plain JS refuses and hands the refusal to Solid, and the answer travels back.
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
          Ask across a boundary in any direction, then read all three logs.
        </Typography>
      </Stack>

      <Box
        key={reloadKey}
        component="iframe"
        src={`${import.meta.env.BASE_URL}mfe/host.html`}
        title="Microfrontend host — three microfrontends sharing one dialog manager"
        // The frame carries its own copy of the library, of React and of Solid; it sits low on
        // the page, so it should not be fetched by anyone who never scrolls to it.
        loading="lazy"
        sx={{
          width: '100%',
          // Measured, not guessed: the panels drop to one column below ~560px and the content
          // then wants ~1300px, so a shorter frame gets its own scrollbar inside the page's.
          // Anything left over is absorbed by the logs, which are `flex: 1` — a generous height
          // costs nothing.
          height: { xs: 1320, sm: 860, md: 470 },
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      />
    </Stack>
  );
}
