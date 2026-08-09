import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests that two non-modal dialogs stack correctly via z-index.
 */
export function NonModalStackHarness() {
  const first = useModal<void, 'close'>({
    id: 'non-modal-first',
    nonModal: true,
    animation: {
      entrance: { opacity: 1 },
      exit: { opacity: 0 },
      duration: 0,
      exitDuration: 0,
      transitionProperty: 'opacity',
    },
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>First panel</p>
          <button
            onClick={() => {
              void second.open();
            }}
          >
            Open Second
          </button>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close First
          </button>
        </div>
      );
    },
  });

  const second = useModal<void, 'close'>({
    id: 'non-modal-second',
    nonModal: true,
    animation: {
      entrance: { opacity: 1 },
      exit: { opacity: 0 },
      duration: 0,
      exitDuration: 0,
      transitionProperty: 'opacity',
    },
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Second panel</p>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close Second
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          void first.open();
        }}
      >
        Open First
      </button>
      <span data-testid="body-overflow">
        {document.body.hasAttribute('data-dialog-open') ? 'locked' : 'free'}
      </span>
      {first.Modal}
      {second.Modal}
    </div>
  );
}
