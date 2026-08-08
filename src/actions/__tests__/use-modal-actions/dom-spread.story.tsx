import { dialogStyle } from '../../../core/__tests__/story-styles.js';
import { useModal } from '../../../core/use-modal.js';
import { Key } from '../../../utils/keys.js';

/**
 * `action.dom()` against `action()`, on two bare `<button>` elements.
 *
 * The claim being tested is narrow and has two halves, and only checking the first is how a
 * guard passes while the thing it guards is broken: `dom` must drop `loading` — the one field
 * React refuses to put on a DOM element — and it must drop *nothing else*. `aria-keyshortcuts`
 * and `data-focus-on-open` are what make the hotkey and the opening focus work with no wrapper,
 * so a `dom` that over-trimmed would silently disable both.
 *
 * The attributes are read back off the rendered element rather than off the returned object,
 * because what a caller spreads is not what React necessarily emits — that gap is exactly why
 * `data-focus-on-open` exists instead of `autoFocus`.
 */
export function DomSpreadHarness() {
  const { open, Modal } = useModal<void, 'plain' | 'fancy'>({
    id: 'dom-spread',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            data-testid="dom-btn"
            {...action.dom('plain', { hotkey: Key.Enter, focusOnOpen: true })}
          >
            Dom
          </button>
          {/* The default spread, for contrast: React drops `loading` and warns about it. */}
          <button data-testid="full-btn" {...action('fancy')}>
            Full
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
