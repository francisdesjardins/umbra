import { Box, Button, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

/**
 * Height for the instant between mount and the first measurement — the two-column layout's,
 * measured, rather than a number chosen to be inoffensive.
 *
 * It has to be close, and `loading="lazy"` is why: the frame is fetched as it scrolls into view,
 * so the correction from this value to the real one lands exactly when the reader arrives at it.
 * Wrong by four hundred pixels, that is the page walking down under them at the worst moment —
 * which is what a placeholder left over from the four-column layout was doing.
 *
 * The common case, not a universal one: below 560px the host goes single-column and is nearly
 * twice this. A phone corrects upward on the first frame; it is the desktop read that this
 * spares.
 */
const INITIAL_HEIGHT = 869;

/**
 * Four microfrontends, one shared manager, in an iframe.
 *
 * The page inside is deliberately not part of this app: plain HTML, an import map, and four
 * `<script type="module">`. No bundler runs on it, which is the only way to show what the import
 * map is doing — a build step that resolved `umbra` for all four would prove nothing.
 *
 * It demonstrates the claim `requestOpen` exists for: a dialog owned by one microfrontend,
 * addressed by another that never imports it. `dialogManager` is a module-level singleton, so
 * pointing every side at one build is the whole mechanism — four copies would be four
 * registries and the requests would find nothing.
 *
 * The four sides are written four different ways on purpose, and that is the second claim.
 * Checkout drives its dialog with `useModal` from `umbra/react`; Support does the same with
 * `useModal` from `umbra/solid` — the same call, the same options, the same return; Billing uses
 * `umbra/vanilla` over a `<dialog>` written by hand in the host page; and Audit is a web
 * component whose dialog lives in a shadow root, which is a different DOM tree rather than a
 * different framework. They address each other regardless, because what they share is the
 * manager and not the renderer.
 *
 * Push Checkout past Billing's approval limit to see a request cross three of them: React asks
 * plain JS, plain JS refuses and hands the refusal to Solid, and the answer travels back.
 *
 * No `ExampleLayout` here: there is no trigger row, no modal of ours and no result to report —
 * everything happens in the frame, which is a document and a realm of its own.
 */
export function HostFrame() {
  const [reloadKey, setReloadKey] = useState(0);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const frameRef = useRef<HTMLIFrameElement>(null);

  /**
   * Take the height from the document inside, rather than from breakpoints.
   *
   * Breakpoints cannot answer this. MUI's key off the **viewport** while the host's own grid
   * keys off the **frame's width**, and the two diverge by the sidebar plus the page padding —
   * so a `md` height computed for a 1200px viewport was being applied to a 604px frame that had
   * reflowed to two columns and wanted twice as much. Every hard-coded value here was wrong at
   * some width, and adding a fourth panel made most of them wrong at once.
   *
   * Same origin, so `contentDocument` is readable and no `postMessage` handshake is needed. The
   * `ResizeObserver` covers what `load` cannot: the frame's own width crossing one of the host
   * grid's breakpoints re-lays the panels into two columns or one, and the document is a
   * different height on the other side of it. It is no longer clicking that moves this — the
   * logs are fixed boxes that scroll, so the height a panel reports is the height it keeps.
   */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    let observer: ResizeObserver | null = null;

    const measure = () => {
      const inner = frame.contentDocument?.documentElement;
      if (!inner) {
        return;
      }
      // Plus the frame's own border. `box-sizing: border-box` is global here, so a height of
      // exactly the content leaves the inner viewport two pixels short and the frame grows a
      // scrollbar for them. Read the difference rather than hard-coding it — the border is a
      // style, and a style can change.
      const chrome = frame.offsetHeight - frame.clientHeight;
      setHeight(Math.ceil(inner.scrollHeight) + chrome);
    };

    const attach = () => {
      const inner = frame.contentDocument?.documentElement;
      if (!inner) {
        return;
      }
      measure();
      observer = new ResizeObserver(measure);
      observer.observe(inner);
    };

    frame.addEventListener('load', attach);
    // Already loaded by the time this effect runs — a cached frame never fires `load` again.
    if (frame.contentDocument?.readyState === 'complete') {
      attach();
    }

    return () => {
      frame.removeEventListener('load', attach);
      observer?.disconnect();
    };
  }, [reloadKey]);

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
          Ask across a boundary in any direction, then read all four logs.
        </Typography>
      </Stack>

      <Box
        key={reloadKey}
        ref={frameRef}
        component="iframe"
        src={`${import.meta.env.BASE_URL}mfe/host.html`}
        title="Microfrontend host — four microfrontends sharing one dialog manager"
        // The frame carries its own copy of the library, of React and of Solid; it sits low on
        // the page, so it should not be fetched by anyone who never scrolls to it.
        loading="lazy"
        sx={{
          width: '100%',
          // Measured from the document inside — see the effect above.
          height,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      />
    </Stack>
  );
}
