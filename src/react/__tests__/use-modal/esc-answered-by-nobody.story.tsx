import { useEffect, useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

const INSTANT = {
  entrance: { opacity: 1 },
  exit: { opacity: 0 },
  duration: 0,
  exitDuration: 0,
  transitionProperty: 'opacity',
} as const;

/**
 * The one configuration in which no dialog answers the dismiss key: a modal with
 * `dismissKey: false` in front of a non-modal panel. Each half correctly declines — the panel is no
 * longer the foreground, the modal was told not to listen — and nothing closing is the right
 * outcome, since dismissing the panel behind would close what the user cannot see. So the question
 * is not "does something close" but "is the press still available to the page": a library that
 * swallows a key it refuses to act on leaves the application with a dead keyboard.
 */
export function EscAnsweredByNobodyHarness() {
  const [pressesSeenByPage, setPressesSeenByPage] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPressesSeenByPage((count) => {
          return count + 1;
        });
      }
    };
    // Bubble phase on `document`, the last listener that could hear it; the library's captures.
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
  const [panelReason, setPanelReason] = useState('');
  const [modalReason, setModalReason] = useState('');

  const front = useModal<void, 'confirm'>({
    id: 'esc-gap-modal',
    // The whole point of the configuration: this dialog is in front and does not listen.
    dismissKey: false,
    animation: INSTANT,
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <p>Front modal, deaf to the dismiss key</p>
          {/* Inside the render, because a `showModal()` dialog puts everything else out of reach. */}
          <button data-testid="close-modal" {...action('confirm')}>
            Close modal
          </button>
        </div>
      );
    },
    onClose: (result) => {
      setModalReason(result.reason);
    },
  });

  const panel = useModal<void, 'close'>({
    id: 'esc-gap-panel',
    nonModal: true,
    animation: INSTANT,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Panel behind</p>
          <button
            data-testid="open-modal"
            onClick={() => {
              void front.open();
            }}
          >
            Open the modal over it
          </button>
          <button
            data-testid="close-panel"
            onClick={() => {
              handle.close('close');
            }}
          >
            Close panel
          </button>
        </div>
      );
    },
    onClose: (result) => {
      setPanelReason(result.reason);
    },
  });

  return (
    <div>
      <button
        data-testid="open-panel"
        onClick={() => {
          void panel.open();
        }}
      >
        Open panel
      </button>
      <span data-testid="panel-visible">{panel.isVisible ? 'open' : 'closed'}</span>
      <span data-testid="modal-visible">{front.isVisible ? 'open' : 'closed'}</span>
      <span data-testid="panel-reason">{panelReason}</span>
      <span data-testid="modal-reason">{modalReason}</span>
      <span data-testid="presses-seen">{pressesSeenByPage}</span>
      {panel.Modal}
      {front.Modal}
    </div>
  );
}
