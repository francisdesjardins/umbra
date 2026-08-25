import { createPortal } from 'react-dom';
import { useState } from 'react';
import { isKeyClaimedByPopup, useDialog } from '../../react.js';

// The two shapes an open overlay comes in, where the capturing window listener running first is
// wrong: a control reporting its own open list, and a popup portaled out of the dialog holding
// focus. Declared with `aria-expanded` and a popup role, because those are what the guard reads.
export function DismissKeyOwnershipHarness() {
  const [listOpen, setListOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  const modal = useDialog({
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

// The predicate on its own, asked directly rather than through a dismissal: a caller that imports
// it gets the function and not the listener around it.
export function KeyClaimProbeHarness() {
  const [answers, setAnswers] = useState<string>('');

  return (
    <>
      <div data-testid="answers">{answers}</div>
      {/* Named, and the option carries the role its parent requires. The guard reads ancestor roles
          and `aria-expanded`, so none of that changes what is under test — and an unnamed dialog
          beside a listbox full of buttons is four axe violations on a page that ships. */}
      <div aria-label="Key ownership scope" data-testid="scope" role="dialog">
        <button data-testid="plain" type="button">
          Plain
        </button>
        {/* `aria-controls` points at the list below, which is the arrangement the case is named
            for: the control is inside the dialog and its popup is rendered outside it. */}
        <input
          aria-controls="ownership-elsewhere"
          aria-expanded="true"
          aria-label="Expanded combobox"
          data-testid="expanded"
          readOnly
          role="combobox"
        />
      </div>
      <div
        aria-label="A popup outside the scope"
        data-testid="elsewhere"
        id="ownership-elsewhere"
        role="listbox"
      >
        <button data-testid="in-listbox" role="option" type="button">
          Option
        </button>
      </div>
      <button
        data-testid="ask"
        onClick={() => {
          const scope = document.querySelector<HTMLElement>('[data-testid="scope"]');
          const at = (id: string) => {
            return document.querySelector(`[data-testid="${id}"]`);
          };
          if (scope === null) {
            return;
          }
          setAnswers(
            [
              `plain=${String(isKeyClaimedByPopup(scope, at('plain')))}`,
              `expanded=${String(isKeyClaimedByPopup(scope, at('expanded')))}`,
              `listbox=${String(isKeyClaimedByPopup(scope, at('in-listbox')))}`,
              `nothing=${String(isKeyClaimedByPopup(scope, null))}`,
            ].join(' ')
          );
        }}
        type="button"
      >
        Ask
      </button>
    </>
  );
}
