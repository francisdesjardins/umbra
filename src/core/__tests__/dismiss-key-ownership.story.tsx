import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useModal } from '../../react.js';

/**
 * A non-modal panel holding the two shapes an open overlay comes in.
 *
 * The window-level dismiss listener captures, so it runs before every other handler in the page.
 * These two harness states are the cases where running first is wrong: a control that reports its
 * own open list, and a popup portaled out of the dialog that holds focus itself.
 *
 * Both are declared with the attributes a real widget declares — `aria-expanded` and a popup role —
 * rather than by simulating a library, because the attributes are what the guard reads.
 */
export function DismissKeyOwnershipHarness() {
  const [listOpen, setListOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  const modal = useModal({
    id: 'dismiss-ownership',
    nonModal: true,
    ariaLabel: 'Panel with overlays',
    onClose: () => {
      setClosed(true);
    },
    render: () => {
      return (
        <>
          {/* A combobox keeps focus on itself and says the list is open beside it. */}
          <input
            aria-expanded={listOpen}
            data-testid="combobox"
            onClick={() => {
              setListOpen(true);
            }}
            readOnly
            role="combobox"
          />
          <button data-testid="plain-button" type="button">
            A control that owns nothing
          </button>
          <button
            data-testid="open-picker"
            onClick={() => {
              setPickerOpen(true);
            }}
            type="button"
          >
            Open the picker
          </button>
        </>
      );
    },
  });

  return (
    <>
      <div data-testid="closed-flag">{closed ? 'closed' : 'open'}</div>
      <button
        data-testid="open-panel"
        onClick={() => {
          setClosed(false);
          void modal.open();
        }}
        type="button"
      >
        Open the panel
      </button>
      {modal.Modal}

      {/* Portaled out of the dialog, the way a picker mounts its popup — and holding focus. */}
      {pickerOpen &&
        createPortal(
          <div data-testid="picker-popup" role="dialog">
            <button data-testid="picker-day" type="button">
              12
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
