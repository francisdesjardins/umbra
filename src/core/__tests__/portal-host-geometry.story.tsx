import { useState } from 'react';
import { useSlideDialog } from '../../react/templates/use-slide-dialog.js';

/**
 * A slide panel portaled into a host the caller names, rather than into `document.body`.
 *
 * A getter names *where* the element lives — useful for a stacking context or a shadow root — and
 * never how it is positioned, so the panel is anchored to the viewport like any other portaled one.
 * Two readers answer this: the placement the runtime resolves, and the geometry the template
 * writes onto the element.
 */
export function PortalHostGeometryHarness({ named }: { readonly named: boolean }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  const panel = useSlideDialog<void, 'ok'>({
    id: 'portal-host-geometry',
    direction: 'right',
    nonModal: true,
    ariaLabel: 'Portaled panel',
    ...(named
      ? {
          portal: () => {
            return host;
          },
        }
      : { portal: false }),
    render: () => {
      return <p data-testid="panel-body">Panel</p>;
    },
  });

  return (
    <div>
      <div
        data-testid="host"
        ref={setHost}
        style={{ height: 300, position: 'relative', width: 400 }}
      />
      <button
        data-testid="open"
        onClick={() => {
          void panel.open();
        }}
        type="button"
      >
        Open
      </button>
      {panel.Dialog}
    </div>
  );
}
