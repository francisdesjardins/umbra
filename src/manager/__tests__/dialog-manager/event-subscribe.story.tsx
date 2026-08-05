import { useEffect, useState } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests dialogManager.subscribe() — records open/close events as a CSV string.
 * Close button is inside the modal for top-layer compatibility.
 */
export function EventSubscribeHarness() {
  const [events, setEvents] = useState<string[]>([]);

  const { Modal, dialogManager } = useModal<void, 'close'>({
    id: 'dm-events',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close
          </button>
        </div>
      );
    },
  });

  useEffect(() => {
    return dialogManager.subscribe((event) => {
      setEvents((prev) => {
        return [...prev, `${event.type}:${event.id}`];
      });
    });
  }, [dialogManager]);

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('dm-events');
        }}
      >
        Open
      </button>
      <span data-testid="events">{events.join(',')}</span>
      {Modal}
    </div>
  );
}
