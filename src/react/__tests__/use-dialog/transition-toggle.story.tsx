import { useEffect, useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { setLogLevel } from '../../../utils/logger.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

const claimLogging = () => {
  setLogLevel('*');
};
const dropLogging = () => {
  setLogLevel(false);
};

const DISABLE_RULE = `dialog[data-testid='dialog-transition-toggle'] { transition: none !important; }`;

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

  // The level is global, so it is claimed for the open that needs it and dropped at the close: on
  // mount it would run a page hosting a hundred harnesses with every namespace on.
  useEffect(() => {
    return dropLogging;
  }, []);

  const { open, isVisible, Dialog } = useDialog<void, 'done'>({
    id: 'transition-toggle',
    onClose: dropLogging,
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
          claimLogging();
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
      <span data-testid="toggle-is-visible">{isVisible ? 'open' : 'closed'}</span>
      {Dialog}
    </div>
  );
}
