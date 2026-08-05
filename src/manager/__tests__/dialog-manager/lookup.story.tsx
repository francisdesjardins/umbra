import { useState } from 'react';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests lookup(id) for registered and unregistered modals.
 * Registers two modals, opens one, and displays ModalInfo for both.
 * Queries are triggered by button clicks (after registration).
 */
export function LookupFindHarness() {
  const [result, setResult] = useState('');

  const { Modal: Modal1, dialogManager } = useModal({
    id: 'lookup-a',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal A</p>
          <button
            onClick={() => {
              const info = dialogManager.lookup('lookup-a');
              const infoB = dialogManager.lookup('lookup-b');
              const infoUnknown = dialogManager.lookup('unknown-id');
              setResult(
                [
                  `a-exists:${String(info.exists)}`,
                  `a-open:${String(info.isOpen)}`,
                  `a-phase:${info.phase}`,
                  `a-fg:${String(info.isForeground)}`,
                  // `modalType` is a registration-time fact, so it only exists on the
                  // `exists: true` branch — narrowing is what makes it readable.
                  `a-type:${info.exists ? info.modalType : ''}`,
                  `b-exists:${String(infoB.exists)}`,
                  `b-open:${String(infoB.isOpen)}`,
                  `unknown-exists:${String(infoUnknown.exists)}`,
                  `unknown-open:${String(infoUnknown.isOpen)}`,
                  `unknown-phase:${infoUnknown.phase}`,
                  `unknown-fg:${String(infoUnknown.isForeground)}`,
                ].join('|')
              );
            }}
          >
            Query
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close A
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useModal({
    id: 'lookup-b',
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>Modal B</p>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('lookup-a');
        }}
      >
        Open A
      </button>
      <button
        onClick={() => {
          const info = dialogManager.lookup('lookup-a');
          const infoB = dialogManager.lookup('lookup-b');
          setResult(
            [
              `a-exists:${String(info.exists)}`,
              `a-open:${String(info.isOpen)}`,
              `a-phase:${info.phase}`,
              `b-exists:${String(infoB.exists)}`,
              `b-open:${String(infoB.isOpen)}`,
            ].join('|')
          );
        }}
      >
        Query Closed
      </button>
      <span data-testid="result">{result}</span>
      {Modal1}
      {Modal2}
    </div>
  );
}

/**
 * Tests collection-level queries: getOpen, getClosed, counts.
 * Registers three modals, opens two.
 */
export function LookupCollectionHarness() {
  const [stats, setStats] = useState('');

  const { Modal: Modal1, dialogManager } = useModal({
    id: 'col-a',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Col A</p>
          <button
            onClick={() => {
              dialogManager.open('col-b');
            }}
          >
            Open B
          </button>
          <button
            onClick={() => {
              const q = dialogManager.lookup();
              const open = q.getOpen();
              const closed = q.getClosed();
              const openIds = open
                .map((m) => {
                  return m.id;
                })
                .join(',');
              const closedIds = closed
                .map((m) => {
                  return m.id;
                })
                .join(',');
              setStats(
                `count:${String(q.getRegisteredCount())}|open:${String(open.length)}:${openIds}|closed:${String(closed.length)}:${closedIds}`
              );
            }}
          >
            Query
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close A
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useModal({
    id: 'col-b',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Col B</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close B
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal3 } = useModal({
    id: 'col-c',
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>Col C</p>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('col-a');
        }}
      >
        Open A
      </button>
      <span data-testid="stats">{stats}</span>
      {Modal1}
      {Modal2}
      {Modal3}
    </div>
  );
}

/**
 * Tests getForeground and isForeground with two stacked modals.
 */
export function LookupForegroundHarness() {
  const [foregroundId, setForegroundId] = useState('');
  const [isFgA, setIsFgA] = useState('');
  const [isFgB, setIsFgB] = useState('');

  const { Modal: Modal1, dialogManager } = useModal({
    id: 'fg-a',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>FG A</p>
          <button
            onClick={() => {
              dialogManager.open('fg-b');
            }}
          >
            Open B
          </button>
          <button
            onClick={() => {
              const q = dialogManager.lookup();
              setForegroundId(q.getForeground()?.id ?? 'none');
              setIsFgA(String(q.isForeground('fg-a')));
              setIsFgB(String(q.isForeground('fg-b')));
            }}
          >
            Check FG from A
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close A
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useModal({
    id: 'fg-b',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>FG B</p>
          <button
            onClick={() => {
              const q = dialogManager.lookup();
              setForegroundId(q.getForeground()?.id ?? 'none');
              setIsFgA(String(q.isForeground('fg-a')));
              setIsFgB(String(q.isForeground('fg-b')));
            }}
          >
            Check FG from B
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close B
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('fg-a');
        }}
      >
        Open A
      </button>
      <span data-testid="foreground-id">{foregroundId}</span>
      <span data-testid="is-fg-a">{isFgA}</span>
      <span data-testid="is-fg-b">{isFgB}</span>
      {Modal1}
      {Modal2}
    </div>
  );
}

/**
 * Tests lookup(id) null-object default for unregistered ids.
 * Query triggered via button click (after mount).
 */
export function LookupUnregisteredHarness() {
  const [result, setResult] = useState('');

  const { Modal, dialogManager } = useModal({
    id: 'exists-anchor',
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>Anchor</p>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          const info = dialogManager.lookup('does-not-exist');
          setResult(
            [
              `exists:${String(info.exists)}`,
              `open:${String(info.isOpen)}`,
              `fg:${String(info.isForeground)}`,
              `phase:${info.phase}`,
              `id:${info.id}`,
              `at:${String(info.openedAt)}`,
            ].join('|')
          );
        }}
      >
        Query Unknown
      </button>
      <span data-testid="result">{result}</span>
      {Modal}
    </div>
  );
}
