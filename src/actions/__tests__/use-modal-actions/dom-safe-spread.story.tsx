import { dialogStyle } from '../../../__tests__/story-styles.js';
import { useModal } from '../../../react/use-modal.js';
import { Key } from '../../../utils/keys.js';

/**
 * The claim the action API rests on: what `action()` returns is only DOM props. The library is
 * agnostic of the UI put into it, so the running state travels as `data-loading` rather than a
 * `loading` prop named for one component family. Two halves: nothing React refuses on an element
 * may reach it, and nothing may be missing — `aria-keyshortcuts` and `data-focus-on-open` are what
 * make the hotkey and the opening focus work bare. Read back off the rendered element, because
 * what a caller spreads is not what React emits.
 */
export function DomSafeSpreadHarness() {
  const { open, Modal } = useModal<void, 'plain'>({
    id: 'dom-safe-spread',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            data-testid="dom-btn"
            {...action('plain', { hotkey: Key.Enter, focusOnOpen: true })}
          >
            Done
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Dom Spread
      </button>
      {Modal}
    </div>
  );
}
