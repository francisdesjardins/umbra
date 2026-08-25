import { useEffect, useRef, useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A portal that lands somewhere other than `document.body`.
 *
 * The host is a themed container: what a dialog portaled to the body loses is whatever the tree it
 * left was providing — a custom property, a scoping class, a cascade layer — silently, since the
 * dialog still renders and only looks wrong. The harness reads a CSS variable declared on the host
 * so the loss is measurable rather than argued.
 *
 * **The host is mounted before the modal is**, which is the arrangement `PortalTarget` requires and
 * the one it describes: a design-system root, a themed shell, a microfrontend's mount point. A host
 * rendered as the modal's own sibling is not one — the getter would answer `null` on the render
 * that places the dialog, and the fallback to the body is what a caller would see.
 */
function PortaledModal({ host }: { readonly host: Element }) {
  const [inheritedInk, setInheritedInk] = useState('');

  const { open, Modal } = useDialog({
    id: 'portal-host',
    ariaLabel: 'Portaled into a themed host',
    // A getter rather than the element, because the option is read where the dialog is placed
    // rather than where it is written — see `PortalTarget`.
    portal: () => {
      return host;
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
      const dialog = document.querySelector('[data-testid="dialog-portal-host"]');
      setInheritedInk(
        dialog ? getComputedStyle(dialog).getPropertyValue('--story-ink').trim() : 'no dialog'
      );
    },
  });

  return (
    <>
      <button
        onClick={async () => {
          await open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="inherited-ink">{inheritedInk}</span>
      {Modal}
    </>
  );
}

export function PortalHostHarness() {
  const hostRef = useRef<HTMLDivElement>(null);
  // The modal mounts on the pass after the host, which is what makes the getter answer an element
  // rather than `null` — the same order an app shell and a feature component are already in.
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    setHost(hostRef.current);
  }, []);

  return (
    <div data-testid="container">
      {/* The theme the dialog would have lost by going to the body. */}
      <div
        data-testid="themed-host"
        ref={hostRef}
        style={{ '--story-ink': 'rebeccapurple' } as React.CSSProperties}
      />
      {host ? <PortaledModal host={host} /> : null}
    </div>
  );
}
