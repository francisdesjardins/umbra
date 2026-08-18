import { useTheme } from '@/shared/lib/theme-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';

/**
 * Height for the instant between mount and the first measurement — the two-column layout's,
 * measured. It has to be close because `loading="lazy"` fetches the frame as it scrolls into view,
 * so the correction lands exactly when the reader arrives; wrong by four hundred pixels it is the
 * page walking down under them. Below 560px the host goes single-column and is taller, but the
 * `maxHeight` caps what a phone renders, so that correction is bounded.
 */
const INITIAL_HEIGHT = 660;

/**
 * Four microfrontends, one shared manager, in an iframe.
 *
 * The page inside is deliberately not part of this app — plain HTML, an import map, four
 * `<script type="module">` — because a build step that resolved `umbra` for all four would prove
 * nothing about the import map. It demonstrates what `requestOpen` exists for: a dialog owned by
 * one microfrontend, addressed by another that never imports it. `dialogManager` is a module-level
 * singleton, so pointing every side at one build is the whole mechanism; four copies would be four
 * registries finding nothing.
 *
 * The four are written four ways on purpose: Checkout with `useModal` from `umbra/react`, Support
 * with the same call from `umbra/solid`, Billing with `umbra/vanilla` over a hand-written
 * `<dialog>`, Audit as a web component whose dialog lives in a shadow root — a different DOM tree
 * rather than a different framework. They address each other regardless, because what they share
 * is the manager and not the renderer. Push Checkout past Billing's approval limit and a request
 * crosses three of them: React asks plain JS, plain JS refuses and hands the refusal to Solid.
 *
 * No `ExampleLayout`: no trigger row, no modal of ours, no result — it all happens in the frame.
 */
export function HostFrame() {
  const [reloadKey, setReloadKey] = useState(0);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { isDarkMode } = useTheme();

  /**
   * Take the height from the document inside, not from breakpoints: MUI's key off the **viewport**
   * while the host's grid keys off the **frame's width**, and the two diverge by the sidebar plus
   * the page padding — a `md` height computed for a 1200px viewport applied to a 604px frame that
   * had reflowed to two columns and wanted twice as much.
   *
   * **The body, not `documentElement`** — that is the difference between measuring and latching.
   * `documentElement.scrollHeight` is never less than its viewport, which here *is* the frame this
   * sets the height of, so the two agree at the tallest layout ever produced and stay there: it can
   * grow but never shrink. The body is sized by its content instead. Same origin, so
   * `contentDocument` is readable and no `postMessage` handshake is needed, and the
   * `ResizeObserver` covers what `load` cannot — the frame's width crossing a host-grid breakpoint
   * re-lays the panels and changes the document's height.
   */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    let observer: ResizeObserver | null = null;

    const measure = () => {
      const inner = frame.contentDocument?.body;
      if (!inner) {
        return;
      }
      // Plus the frame's border: `box-sizing: border-box` is global, so a height of exactly the
      // content leaves the inner viewport two pixels short and grows a scrollbar. Read rather than
      // hard-coded, because the border is a style.
      const chrome = frame.offsetHeight - frame.clientHeight;
      setHeight(Math.ceil(inner.scrollHeight) + chrome);
    };

    /**
     * Hand the frame the theme the top bar is showing: its own document has its own
     * `prefers-color-scheme`, which answers the OS and knows nothing about this app's toggle. Same
     * origin, so the attribute is simply written and `host.html`'s `light-dark()` tokens follow.
     * Riding along with the measurement effect because both need a document that exists, and
     * `attach` already knows when the frame has finished loading.
     */
    const applyTheme = () => {
      const root = frame.contentDocument?.documentElement;
      if (root) {
        root.dataset['theme'] = isDarkMode ? 'dark' : 'light';
      }
    };

    const attach = () => {
      const inner = frame.contentDocument?.body;
      if (!inner) {
        return;
      }
      applyTheme();
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
  }, [reloadKey, isDarkMode]);

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
        // It carries its own copy of the library, React and Solid, and sits low on the page.
        loading="lazy"
        sx={{
          width: '100%',
          // Measured from the document inside — see the effect above.
          height,
          /**
           * Capped on a phone so it scrolls itself, and that is about the modals: `showModal()`
           * centres in **its own** viewport, and an iframe sized to its whole document has one as
           * tall as that document — 1802px at a 390px screen, so the dialog centres 900px down and
           * the reader sees nothing. Capping makes the frame's viewport what is on screen; the
           * cost is a nested scroll area, cheaper than dialogs opening out of sight.
           *
           * A viewport unit and a breakpoint rather than the measured height and the frame's own
           * width: this is the reader's screen, not the content height the effect above tracks.
           */
          maxHeight: { xs: '80vh', sm: 'none' },
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      />
    </Stack>
  );
}
