import { createPortal } from 'react-dom';
import { useState } from 'react';
import { isKeyClaimedByPopup, useModal } from '../../react.js';

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

/**
 * The predicate on its own, now that it is public.
 *
 * Asked directly rather than only through a dismissal, because a caller that imports it gets the
 * function and not the listener around it — and the two clauses are what that caller is relying on.
 */
export function KeyClaimProbeHarness() {
  const [answers, setAnswers] = useState<string>('');

  return (
    <>
      <div data-testid="answers">{answers}</div>
      <div data-testid="scope" role="dialog">
        <button data-testid="plain" type="button">
          Plain
        </button>
        <input aria-expanded="true" data-testid="expanded" readOnly role="combobox" />
      </div>
      <div data-testid="elsewhere" role="listbox">
        <button data-testid="in-listbox" type="button">
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
