import { useRef, useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A portal that lands somewhere other than `document.body`.
 *
 * The host is a themed container: what a dialog portaled to the body loses is whatever the tree it
 * left was providing — a custom property, a scoping class, a cascade layer — silently, since the
 * dialog still renders and only looks wrong. The harness reads a CSS variable declared on the host
 * so the loss is measurable rather than argued.
 */
export function PortalHostHarness() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [inheritedInk, setInheritedInk] = useState('');

  const { open, Modal } = useModal({
    id: 'portal-host',
    ariaLabel: 'Portaled into a themed host',
    // A getter, not the element: this runs while the host below is still being rendered, and a
    // caller naming `hostRef.current` at hook-call time would be naming `null`.
    portal: () => {
      return hostRef.current;
    },
    animation: {
      entrance: { opacity: 1 },
      exit: { opacity: 0 },
      duration: 0,
      exitDuration: 0,
      transitionProperty: 'opacity',
    },
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>In the themed host</p>
        </div>
      );
    },
    prepare: () => {
      const dialog = document.querySelector('[data-testid="modal-portal-host"]');
      setInheritedInk(
        dialog ? getComputedStyle(dialog).getPropertyValue('--story-ink').trim() : 'no dialog'
      );
    },
  });

  return (
    <div data-testid="container">
      <button
        onClick={async () => {
          await open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="inherited-ink">{inheritedInk}</span>
      {/* The theme the dialog would have lost by going to the body. */}
      <div
        data-testid="themed-host"
        ref={hostRef}
        style={{ '--story-ink': 'rebeccapurple' } as React.CSSProperties}
      />
      {Modal}
    </div>
  );
}
