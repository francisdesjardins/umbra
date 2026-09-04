import styles from '@/pages/microfrontends/examples/host-frame.module.css';
import { useTheme } from '@/shared/lib/theme-context';
import { AppButton } from '@/shared/ui/AppButton';
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
 * nothing about the import map. `dialogManager` is a module-level singleton, so pointing every side
 * at one build is the whole mechanism; four copies would be four registries finding nothing.
 *
 * The four are written four ways on purpose: Checkout with `useDialog` from `umbra/react`, Support
 * from `umbra/solid`, Billing with `umbra/vanilla` over a hand-written `<dialog>`, Audit as a web
 * component whose dialog lives in a shadow root. They address each other regardless, because what
 * they share is the manager and not the renderer.
 */
export function HostFrame() {
  const [reloadKey, setReloadKey] = useState(0);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { isDarkMode } = useTheme();

  /**
   * Take the height from the document inside, not from breakpoints: breakpoints key off the
   * **viewport** while the host's grid keys off the **frame's width**, and the two diverge by the
   * sidebar plus the page padding.
   *
   * **The body, not `documentElement`** — that is the difference between measuring and latching.
   * `documentElement.scrollHeight` is never less than its viewport, which here *is* the frame this
   * sets the height of, so it can grow but never shrink. Same origin, so `contentDocument` is
   * readable, and the `ResizeObserver` covers what `load` cannot — a width crossing a host-grid
   * breakpoint re-lays the panels.
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
    <div className={styles['stack']}>
      <div className={styles['controls']}>
        <AppButton
          variant="contained"
          size="small"
          onClick={() => {
            setReloadKey((n) => {
              return n + 1;
            });
          }}
        >
          Restart the host
        </AppButton>
        <span className={styles['hint']}>
          Ask across a boundary in any direction, then read all four logs.
        </span>
      </div>

      {/* The phone-height cap and its reasoning live in the CSS module beside this file. */}
      <iframe
        key={reloadKey}
        ref={frameRef}
        src={`${import.meta.env.BASE_URL}mfe/host.html`}
        title="Microfrontend host — four microfrontends sharing one dialog manager"
        // It carries its own copy of the library, React and Solid, and sits low on the page.
        loading="lazy"
        className={styles['frame']}
        // Measured from the document inside — see the effect above.
        style={{ height }}
      />
    </div>
  );
}
