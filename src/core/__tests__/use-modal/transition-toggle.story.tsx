import { useEffect, useState } from 'react';
import { useModal } from '../../use-modal.js';
import { setLogLevel } from '../../../utils/logger.js';
import { dialogStyle } from '../story-styles.js';

const DISABLE_RULE = `dialog[data-testid='modal-transition-toggle'] { transition: none !important; }`;

/**
 * The same `<dialog>` element, opened once with CSS transitions live and once with them
 * disabled by a stylesheet toggled between the two cycles.
 *
 * Whether transitions are disabled decides how the close path finalizes: immediately, or after
 * waiting for `transitionend`. The answer is cached per element, so it has to be re-measured
 * per open — the element outlives every open/close cycle.
 */
export function TransitionToggleHarness() {
  const [transitionsDisabled, setTransitionsDisabled] = useState(false);

  useEffect(() => {
    setLogLevel('*');
    return () => {
      setLogLevel(false);
    };
  }, []);

  const { open, isOpen, Modal } = useModal<void, 'done'>({
    id: 'transition-toggle',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Transition toggle</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      {transitionsDisabled ? <style>{DISABLE_RULE}</style> : null}
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Toggle
      </button>
      <button
        onClick={() => {
          setTransitionsDisabled(true);
        }}
      >
        Disable Transitions
      </button>
      <span data-testid="toggle-is-open">{isOpen ? 'open' : 'closed'}</span>
      {Modal}
    </div>
  );
}
