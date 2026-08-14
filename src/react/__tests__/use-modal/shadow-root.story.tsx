import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A React modal whose `<dialog>` lives in a **shadow root**.
 *
 * The shape a real application hits: a web component hosting a React tree, or a widget mounted
 * into a shadow root to keep the host page's CSS out. `createPortal` is what React offers for it —
 * the component tree stays where it is and the DOM node goes somewhere else, which is exactly the
 * case that breaks the two things a shadow boundary breaks.
 *
 * **Both were silently wrong before the core learned about roots**, and both fail quietly rather
 * than throwing: `adoptedStyleSheets` does not cross the boundary, so the dialog falls back to the
 * UA backdrop, and `document.activeElement` answers with the *host* element, so a focus policy
 * reading it concludes focus has left the dialog on every check.
 *
 * `umbra/vanilla` has carried a test for this since the microfrontend frame found it. React
 * claimed the same support with nothing verifying it, which is what this closes.
 */
export function ShadowRootHarness() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) {
      return;
    }
    setShadow(host.attachShadow({ mode: 'open' }));
  }, []);

  const modal = useModal<void, 'confirm'>({
    id: 'react-shadow',
    ariaLabel: 'Inside a shadow root',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <p>Rendered into a shadow root.</p>
          <button {...action('confirm', { focusOnOpen: true })} id="shadow-confirm">
            Confirm
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="open"
        onClick={async () => {
          await modal.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="is-visible">{modal.isVisible ? 'open' : 'closed'}</span>
      <div data-testid="shadow-host" ref={hostRef} />
      {/* The dialog's node goes into the shadow root; the component stays in this tree, so the
          hook, its state and its actions are untouched by the move. */}
      {shadow !== null && createPortal(modal.Modal, shadow)}
    </div>
  );
}
