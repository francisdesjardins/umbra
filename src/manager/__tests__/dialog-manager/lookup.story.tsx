import { useState } from 'react';
import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/** `lookup(id)` over two registered dialogs and an unknown id; queries fire from button clicks. */
export function LookupFindHarness() {
  const [result, setResult] = useState('');

  const { Dialog: Dialog1, dialogManager } = useDialog<void, 'done'>({
    id: 'lookup-a',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Dialog A</p>
          <button
            onClick={() => {
              const info = dialogManager.lookup('lookup-a');
              const infoB = dialogManager.lookup('lookup-b');
              const infoUnknown = dialogManager.lookup('unknown-id');
              setResult(
                [
                  `a-exists:${String(info.exists)}`,
                  `a-open:${String(info.isVisible)}`,
                  `a-phase:${info.phase}`,
                  `a-fg:${String(info.isForeground)}`,
                  // `template` is registration-time, so it lives only on the `exists: true` branch.
                  `a-template:${info.exists ? info.template : ''}`,
                  `b-exists:${String(infoB.exists)}`,
                  `b-open:${String(infoB.isVisible)}`,
                  `unknown-exists:${String(infoUnknown.exists)}`,
                  `unknown-open:${String(infoUnknown.isVisible)}`,
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

  const { Dialog: Dialog2 } = useDialog({
    id: 'lookup-b',
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>Dialog B</p>
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
              `a-open:${String(info.isVisible)}`,
              `a-phase:${info.phase}`,
              `b-exists:${String(infoB.exists)}`,
              `b-open:${String(infoB.isVisible)}`,
            ].join('|')
          );
        }}
      >
        Query Closed
      </button>
      <span data-testid="result">{result}</span>
      {Dialog1}
      {Dialog2}
    </div>
  );
}

/** Collection-level queries — `getOpen`, `getClosed`, counts — over three dialogs, two opened. */
export function LookupCollectionHarness() {
  const [stats, setStats] = useState('');

  const { Dialog: Dialog1, dialogManager } = useDialog<void, 'done'>({
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

  const { Dialog: Dialog2 } = useDialog<void, 'done'>({
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

  const { Dialog: Dialog3 } = useDialog({
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
      {Dialog1}
      {Dialog2}
      {Dialog3}
    </div>
  );
}

/** `getForeground` and `isForeground` with two stacked dialogs. */
export function LookupForegroundHarness() {
  const [foregroundId, setForegroundId] = useState('');
  const [isFgA, setIsFgA] = useState('');
  const [isFgB, setIsFgB] = useState('');

  const { Dialog: Dialog1, dialogManager } = useDialog<void, 'done'>({
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

  const { Dialog: Dialog2 } = useDialog<void, 'done'>({
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
      {Dialog1}
      {Dialog2}
    </div>
  );
}

/** The null-object default `lookup(id)` returns for unregistered ids; queried after mount. */
export function LookupUnregisteredHarness() {
  const [result, setResult] = useState('');

  const { Dialog, dialogManager } = useDialog({
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
              `open:${String(info.isVisible)}`,
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
      {Dialog}
    </div>
  );
}
