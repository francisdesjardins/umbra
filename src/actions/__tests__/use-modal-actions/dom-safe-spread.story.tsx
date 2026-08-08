import { dialogStyle } from '../../../core/__tests__/story-styles.js';
import { useModal } from '../../../core/use-modal.js';
import { Key } from '../../../utils/keys.js';

/**
 * The claim the whole action API rests on: what `action()` returns is **only** DOM props.
 *
 * The library is agnostic of the UI put into it, so it cannot ship a prop named for one family
 * of component libraries — `loading` for MUI and Mantine, something else everywhere else, and
 * nothing at all in a headless one. The running state travels as `data-loading`, an attribute
 * any element takes and any wrapper can map.
 *
 * Two halves, and checking only the first is how a guard passes over the bug it exists for:
 * nothing React refuses to put on an element may reach it, **and** nothing else may be missing.
 * `aria-keyshortcuts` and `data-focus-on-open` are what make the hotkey and the opening focus
 * work with no wrapper, so a set that over-trimmed would disable both without a sound.
 *
 * Read back off the rendered element rather than off the returned object, because what a caller
 * spreads is not necessarily what React emits — that gap is why `data-focus-on-open` exists
 * instead of `autoFocus`.
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
