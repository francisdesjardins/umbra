import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Visually hidden, present for assistive technology — the classic clip pattern, inline so the
 * hook has no stylesheet to forget.
 */
const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * A live region that exists **before** it has anything to say — which is the entire trick.
 *
 * Screen readers announce a live region's *changes*; a region inserted into the accessibility
 * tree already holding its text is the case they miss or announce inconsistently. That is exactly
 * what rendering `role="status"` inside a modal's `render` produces: the library mounts the
 * content in the same pass that shows the `<dialog>`, so the region is born full and the toast
 * appears silently. The fix is structural, not an attribute — the region lives *outside* the
 * dialog, mounted from the first render, and the dialog stays what it is: the visual shell.
 *
 * `announce` clears the region and writes a frame later, so two identical toasts in a row are two
 * announcements — a live region that goes `"Saved"` → `"Saved"` has, as far as the platform is
 * concerned, never changed.
 *
 * The library deliberately ships nothing like this: a dialog manager is not where anyone looks
 * for a live region, and `role: 'status'` on a `<dialog>` is refused for the same reason. Copy
 * this next to whatever raises your notifications.
 *
 * @example
 * const { announce, region } = useAnnouncer();
 * return (
 *   <>
 *     <button onClick={() => { announce('Changes saved'); void toast.open(); }}>Save</button>
 *     {region}
 *     {toast.Modal}
 *   </>
 * );
 */
export function useAnnouncer(): {
  readonly announce: (message: string) => void;
  readonly region: ReactNode;
} {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);

  const announce = (message: string) => {
    const region = regionRef.current;
    if (region === null) {
      return;
    }
    region.textContent = '';
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      region.textContent = message;
    });
  };

  // `aria-live` and `aria-atomic` restate what `role="status"` already implies, on purpose — the
  // redundancy is what older screen reader and browser pairings actually key on.
  const region = (
    <div
      aria-atomic="true"
      aria-live="polite"
      ref={regionRef}
      role="status"
      style={VISUALLY_HIDDEN}
    />
  );

  return { announce, region };
}
