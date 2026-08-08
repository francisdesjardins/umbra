import { useState } from 'react';
import { useMessageModal } from '../../../templates/use-message-modal.js';
import { useSlideModal } from '../../../templates/use-slide-modal.js';
import { Key } from '../../../utils/keys.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Three modals of different kinds, stacked, each rendered **inside** the one below it.
 *
 * That nesting is not a contrivance: a modal in the top layer swallows every click outside
 * itself, so anything that opens a second modal has to live in the first one's `render` — and a
 * component used there (a picker, a wizard step) brings its own `useModal` with it. The second
 * `<dialog>` then sits in the first one's subtree, and every event raised in the inner one
 * bubbles through the outer.
 *
 * All three declare `Enter`, which is the overlap under test: the same key means something
 * different at each level, and only the level in front should hear it.
 *
 * The log records what closed, in order, so a test can assert that a dismiss key unwinds the
 * stack one modal per press rather than collapsing it.
 */
export function StackedModalsHarness() {
  const [log, setLog] = useState<string[]>([]);
  const [acks, setAcks] = useState(0);
  const [saves, setSaves] = useState(0);

  const record = (entry: string) => {
    setLog((previous) => {
      return [...previous, entry];
    });
  };

  // ── Innermost: a message modal ─────────────────────────────────────────────
  const message = useMessageModal<void, 'ack'>({
    id: 'stack-message',
    ariaLabel: 'Message',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('ack', {
              hotkey: Key.Enter,
              onAction: (close) => {
                setAcks((n) => {
                  return n + 1;
                });
                close();
              },
            })}
            data-testid="msg-ack"
          >
            Acknowledge
          </button>
        </div>
      );
    },
    onClose: (result) => {
      record(`message:${result.reason}`);
    },
  });

  // ── Middle: a blocking modal, holding the message modal in its own subtree ──
  const middle = useModal<void, 'save'>({
    id: 'stack-middle',
    ariaLabel: 'Middle',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('save', {
              hotkey: Key.Enter,
              onAction: (close) => {
                setSaves((n) => {
                  return n + 1;
                });
                close();
              },
            })}
            data-testid="mid-save"
          >
            Save
          </button>
          <button
            onClick={async () => {
              await message.open();
            }}
            data-testid="mid-open-message"
          >
            Open message
          </button>
          {message.Modal}
        </div>
      );
    },
    onClose: (result) => {
      record(`middle:${result.reason}`);
    },
  });

  // ── Bottom: a non-modal slide panel, holding the modal in its own subtree ───
  const panel = useSlideModal<void, 'close'>({
    id: 'stack-panel',
    ariaLabel: 'Panel',
    direction: 'right',
    nonModal: true,
    portal: true,
    // On, so a click landing anywhere else is a real question rather than a no-op: with a modal
    // on top of it, the panel has to stand down even though nothing blocks the pointer for it.
    dismissOnClickOutside: true,
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button {...action('close')} data-testid="panel-close">
            Close panel
          </button>
          <button
            onClick={async () => {
              await middle.open();
            }}
            data-testid="panel-open-middle"
          >
            Open middle
          </button>
          {middle.Modal}
        </div>
      );
    },
    onClose: (result) => {
      record(`panel:${result.reason}`);
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await panel.open();
        }}
      >
        Open Panel
      </button>
      <span data-testid="stack-log">{log.join(' | ')}</span>
      <span data-testid="stack-visible">
        {[panel.isVisible && 'panel', middle.isVisible && 'middle', message.isVisible && 'message']
          .filter(Boolean)
          .join(',')}
      </span>
      <span data-testid="stack-acks">{acks}</span>
      <span data-testid="stack-saves">{saves}</span>
      {panel.Modal}
    </div>
  );
}
