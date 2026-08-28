import { useState } from 'react';
import { useDialog } from '../../react.js';

/**
 * A three-row list and a panel showing one of them — the arrangement `restoreFocusTo` exists for:
 * the row that opened the panel stops being the row the reader is looking at.
 *
 * `Next row` stands in for the arrow keys. It moves the selection without moving focus, so the
 * captured opener and the selected row disagree by the time anything closes, and the two harnesses
 * differ only in the variant, which is what decides whether the platform restores or strands.
 */
const ROWS = [0, 1, 2];

/** The selected row, re-queried at the close rather than captured when the panel opened. */
const rowAt = (index: number): HTMLElement | null => {
  return document.querySelector<HTMLElement>(`[data-testid="row-${String(index)}"]`);
};

function Rows({ onOpen }: { readonly onOpen: (index: number) => void }) {
  return (
    <>
      {ROWS.map((index) => {
        return (
          <button
            data-testid={`row-${String(index)}`}
            key={index}
            onClick={() => {
              onOpen(index);
            }}
            type="button"
          >
            Row {index}
          </button>
        );
      })}
      {/* Somewhere real outside the panel, so a close can land on a caret the reader chose. */}
      <input data-testid="page-field" />
    </>
  );
}

export function RestoreFocusToPanelHarness({ override }: { readonly override: boolean }) {
  const [selected, setSelected] = useState(0);
  const next = () => {
    setSelected((current) => {
      return current + 1;
    });
  };
  const dialog = useDialog<void, 'done'>({
    id: 'restore-focus-to-panel',
    nonModal: true,
    ariaLabel: 'Row details',
    ...(override && {
      restoreFocusTo: () => {
        return rowAt(selected);
      },
    }),
    render: ({ action }) => {
      return (
        <>
          <span data-testid="showing">Row {selected}</span>
          <button data-testid="next-row" onClick={next} type="button">
            Next row
          </button>
          <button data-testid="panel-close" {...action('done')}>
            Close
          </button>
        </>
      );
    },
  });

  return (
    <>
      <Rows
        onOpen={(index) => {
          setSelected(index);
          void dialog.open();
        }}
      />
      {dialog.Dialog}
    </>
  );
}

export function RestoreFocusToModalHarness({ override }: { readonly override: boolean }) {
  const [selected, setSelected] = useState(0);
  const next = () => {
    setSelected((current) => {
      return current + 1;
    });
  };
  const dialog = useDialog<void, 'done'>({
    id: 'restore-focus-to-modal',
    ariaLabel: 'Row details',
    ...(override && {
      restoreFocusTo: () => {
        return rowAt(selected);
      },
    }),
    render: ({ action }) => {
      return (
        <>
          <span data-testid="showing">Row {selected}</span>
          <button data-testid="next-row" onClick={next} type="button">
            Next row
          </button>
          <button data-testid="panel-close" {...action('done')}>
            Close
          </button>
        </>
      );
    },
  });

  return (
    <>
      <Rows
        onOpen={(index) => {
          setSelected(index);
          void dialog.open();
        }}
      />
      {dialog.Dialog}
    </>
  );
}
