import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * `nonModal` flipped while the dialog is open — the option changing under a live element.
 *
 * The toggle is *inside* the dialog because a modal one owns the top layer and a button outside it
 * is unclickable, so this is the only control that works in both halves of the test.
 */
export function ModalitySwitchHarness() {
  const [nonModal, setNonModal] = useState(true);
  const [closes, setCloses] = useState<string[]>([]);
  const [settled, setSettled] = useState('pending');

  const { openAndWait, isVisible, Dialog } = useDialog({
    id: 'modality-switch',
    nonModal,
    onClose: (result) => {
      setCloses((was) => {
        return [...was, result.reason];
      });
    },
    render: () => {
      return (
        <div style={dialogStyle}>
          <p data-testid="declared">{nonModal ? 'non-modal' : 'modal'}</p>
          <button
            data-testid="flip"
            onClick={() => {
              setNonModal((was) => {
                return !was;
              });
            }}
          >
            Flip
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          const [error, result] = await openAndWait();
          setSettled(error ? `error:${error.message}` : `settled:${result.reason}`);
        }}
      >
        Open Switch
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="closes">{closes.join(',') || 'none'}</span>
      <span data-testid="settled">{settled}</span>
      {Dialog}
    </div>
  );
}
