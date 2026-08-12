import { useState } from 'react';
import { useModal } from '../../react.js';

/**
 * A non-modal panel with three stops, and a button outside it to tab into.
 *
 * `containFocus` is what is under test, so it is a prop of the harness rather than a constant: the
 * same three stops have to walk out when it is off and wrap when it is on, or the test is measuring
 * something else.
 *
 * The outside button sits *before* the panel in document order so a forward Tab from the last stop
 * has somewhere to go that is not the address bar — otherwise "focus left the dialog" and "focus
 * left the page" look the same to `document.activeElement`.
 */
export function FocusContainmentHarness({ containFocus }: { readonly containFocus: boolean }) {
  const modal = useModal({
    id: 'focus-containment',
    nonModal: true,
    containFocus,
    ariaLabel: 'Contained panel',
    render: () => {
      return (
        <>
          <button data-testid="inside-first" type="button">
            First
          </button>
          <button data-testid="inside-middle" type="button">
            Middle
          </button>
          <button data-testid="inside-last" type="button">
            Last
          </button>
        </>
      );
    },
  });

  return (
    <>
      <button data-testid="outside" type="button">
        Outside
      </button>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}

/**
 * A dialog holding a toolbar built the way toolbars are built: one tab stop, arrow keys inside.
 *
 * This is the shape that defeated the first implementation, and no harness made of ordinary
 * buttons can show it. A *roving tabindex* toolbar gives one button `tabindex="0"` and every other
 * `tabindex="-1"`, so a selector that matches `button:not([disabled])` collects them all while the
 * browser stops on one. The extras land *after* the dialog's real last stop in document order,
 * which is what makes the comparison against "the last one" answer never — the wrap does not fire
 * and the keyboard walks out, with the containment looking present the whole time.
 */
export function RovingToolbarHarness() {
  const modal = useModal({
    id: 'focus-containment-toolbar',
    nonModal: true,
    containFocus: true,
    ariaLabel: 'Panel with a toolbar',
    render: () => {
      return (
        <>
          <button data-testid="inside-first" type="button">
            First
          </button>
          <button data-testid="inside-last" type="button">
            Last
          </button>
          {/* After the real last stop, and none of it tabbable. */}
          <div aria-label="Formatting" role="toolbar">
            <button data-testid="tool-bold" tabIndex={-1} type="button">
              B
            </button>
            <button data-testid="tool-italic" tabIndex={-1} type="button">
              I
            </button>
            <button data-testid="tool-underline" tabIndex={-1} type="button">
              U
            </button>
          </div>
          {/* The other shape that is not a stop, and the one bare `checkVisibility()` waves
              through: a wrapper hidden with `visibility`, carrying a `tabindex` and sitting last.
              A hidden file input inside a visible layout is exactly this. */}
          <div
            data-testid="hidden-wrapper"
            role="presentation"
            style={{ visibility: 'hidden' }}
            tabIndex={0}
          >
            <input data-testid="hidden-file" type="file" />
          </div>
        </>
      );
    },
  });

  return (
    <>
      <button data-testid="outside" type="button">
        Outside
      </button>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}

/**
 * A panel whose middle stop can be hidden, to check what counts as a destination.
 *
 * The hidden one is `display: none` rather than `disabled`, because the selector already excludes
 * a disabled control and would pass this test without ever consulting visibility.
 */
export function HiddenStopHarness() {
  const [hideMiddle, setHideMiddle] = useState(false);

  const modal = useModal({
    id: 'focus-containment-hidden',
    nonModal: true,
    containFocus: true,
    ariaLabel: 'Panel with a hidden stop',
    render: () => {
      return (
        <>
          <button data-testid="inside-first" type="button">
            First
          </button>
          <button
            data-testid="inside-middle"
            style={hideMiddle ? { display: 'none' } : undefined}
            type="button"
          >
            Middle
          </button>
          <button data-testid="inside-last" type="button">
            Last
          </button>
        </>
      );
    },
  });

  return (
    <>
      <button
        data-testid="hide-middle"
        onClick={() => {
          setHideMiddle(true);
        }}
        type="button"
      >
        Hide the middle
      </button>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}
