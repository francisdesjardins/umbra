import { useEffect, useState } from 'react';
import { useDialog } from '../../react.js';

/**
 * A dialog with four controls of three different kinds, walked by a listener rather than a button.
 *
 * The kinds are the point: an adapter outside the library finds the action buttons by their
 * `data-action-reason` and nothing else, so the field and the declared region are the half it
 * cannot reach. Driven from a key listener because that is the shape of the caller — a poll loop
 * or a device adapter, which moves nothing itself; a button would take the focus under test.
 */
export function MoveFocusHarness({ nested = false }: { readonly nested?: boolean }) {
  const [took, setTook] = useState<string>('—');

  const inner = useDialog<void, 'done'>({
    id: 'move-focus-inner',
    // Non-modal, so it can be open at the same time without taking the foreground and the keyboard
    // with it — what is under test is the scan, not the stack.
    nonModal: true,
    ariaLabel: 'Inner',
    render: ({ action }) => {
      return (
        <button data-testid="inner-close" {...action('done')}>
          Inner close
        </button>
      );
    },
  });

  const dialog = useDialog<void, 'done'>({
    id: 'move-focus',
    ariaLabel: 'Walkable',
    render: ({ action, handle }) => {
      return (
        <>
          <button data-testid="first" {...action('done')}>
            First
          </button>
          <input aria-label="Field" data-testid="field" />
          {/* A declared stop rather than a control — the shape `useScrollRegion` produces. */}
          <div aria-label="Region" data-testid="region" role="region" tabIndex={0}>
            Region
          </div>
          <button
            data-testid="last"
            onClick={() => {
              handle.close('done');
            }}
            type="button"
          >
            Last
          </button>
          {nested ? (
            <>
              <button
                data-testid="open-inner"
                onClick={() => {
                  void inner.open();
                }}
                type="button"
              >
                Open inner
              </button>
              {inner.Dialog}
            </>
          ) : null}
        </>
      );
    },
  });

  const { handle } = dialog;

  useEffect(() => {
    const walk = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        setTook(String(handle.moveFocus('next')));
      }
      if (event.key === 'ArrowUp') {
        setTook(String(handle.moveFocus('previous')));
      }
    };
    window.addEventListener('keydown', walk);
    return () => {
      window.removeEventListener('keydown', walk);
    };
  }, [handle]);

  return (
    <>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="took">{took}</span>
      {dialog.Dialog}
    </>
  );
}
