import { useEffect, useState } from 'react';
import { reconcileOpen, useDialog } from '../../react.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * A dialog carrying the platform's own way of closing itself: `<form method="dialog">`.
 *
 * Submitting it calls the element's close steps directly — no action, no handle, nothing the
 * library was told about — which is the shape any `dialog.close()` from user land has.
 */
export function NativeFormCloseHarness() {
  const dialog = useDialog<void, 'ok'>({
    id: 'native-form-close',
    ariaLabel: 'Native form close',
    render: () => {
      return (
        <div style={dialogStyle}>
          <form method="dialog">
            <button data-testid="submit" type="submit" value="ok">
              Close natively
            </button>
          </form>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="visible">{dialog.isVisible ? 'open' : 'closed'}</span>
      <span data-testid="phase">{dialog.phase}</span>
      {dialog.Dialog}
    </div>
  );
}

/**
 * The same native close under a surface whose `open` is state above the dialog.
 *
 * The reconciliation is authoritative by design, so the question the fix raises is whether
 * `onClose` reaches the flag before the next pass reads it — if it does not, the owner puts the
 * dialog it never meant to close straight back on screen.
 */
export function ControlledNativeCloseHarness() {
  const [open, setOpen] = useState(false);
  const [closes, setCloses] = useState(0);

  const dialog = useDialog<void, 'close'>({
    id: 'controlled-native-close',
    ariaLabel: 'Controlled native close',
    onClose: () => {
      setCloses((count) => {
        return count + 1;
      });
      setOpen(false);
    },
    render: () => {
      return (
        <div style={dialogStyle}>
          <form method="dialog">
            <button data-testid="submit-controlled" type="submit" value="ok">
              Close natively
            </button>
          </form>
        </div>
      );
    },
  });

  const { phase } = dialog;

  useEffect(() => {
    const next = reconcileOpen(phase, open);
    if (next === 'open') {
      void dialog.open();
    } else if (next === 'close') {
      dialog.handle.close('close');
    }
  }, [phase, open, dialog]);

  return (
    <div>
      <button
        data-testid="open-controlled"
        onClick={() => {
          setOpen(true);
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="flag">{open ? 'open' : 'closed'}</span>
      <span data-testid="closes">{closes}</span>
      <span data-testid="controlled-phase">{dialog.phase}</span>
      {dialog.Dialog}
    </div>
  );
}
