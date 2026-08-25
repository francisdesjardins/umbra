import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/** The classic clip pattern, inline so the hook has no stylesheet to forget. */
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
 * A live region that exists **before** it has anything to say, which is the whole trick. Screen
 * readers announce a region's *changes*, and one inserted into the accessibility tree already
 * holding its text is the case they miss — exactly what `role="status"` inside a modal's `render`
 * produces, since the content mounts in the same pass that shows the `<dialog>`. The fix is
 * structural: the region lives *outside* the dialog, mounted from the first render.
 *
 * `announce` clears the region and writes a frame later, so two identical toasts are two
 * announcements — `"Saved"` → `"Saved"` has, to the platform, never changed. The library ships
 * nothing like this on purpose (and refuses `role: 'status'` on a `<dialog>` for the same reason);
 * copy it next to whatever raises your notifications.
 *
 * @example
 * const { announce, region } = useAnnouncer();
 * return (
 *   <>
 *     <button onClick={() => { announce('Changes saved'); void toast.open(); }}>Save</button>
 *     {region}
 *     {toast.Dialog}
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

  // `aria-live`/`aria-atomic` restate what `role="status"` implies on purpose: older screen reader
  // and browser pairings key on the redundancy.
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
