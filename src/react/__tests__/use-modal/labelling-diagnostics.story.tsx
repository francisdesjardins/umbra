import { useEffect, useState } from 'react';
import { ModalOutlet } from '../../modal-outlet.js';
import { useModal } from '../../use-modal.js';
import { setLogLevel } from '../../../utils/logger.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * The three shapes the labelling diagnostic has to tell apart.
 *
 * Two of them are dialogs it must stay **quiet** about, and they are the reason the check is
 * deferred and gated the way it is: a name that only exists once `prepare` has settled, and a
 * dialog rendered through `ModalOutlet`, whose content reaches the DOM one commit behind the hook
 * that references it. A check that warned on either would be worse than no check, because the
 * noise is on correct code.
 *
 * The diagnostic is gated behind the logger like every other warning the library emits, so each
 * harness turns it on for its own lifetime.
 */

/** Enable every namespace while mounted, so the warning is emitted at all. */
function useDebugLogging() {
  useEffect(() => {
    setLogLevel('*');
    return () => {
      setLogLevel(false);
    };
  }, []);
}

/** `ariaLabelledBy` pointing at an id nothing renders — the failure this exists to catch. */
export function DanglingLabelHarness() {
  useDebugLogging();

  const { open, Modal } = useModal({
    id: 'labelling-dangling',
    ariaLabelledBy: 'labelling-dangling-title',
    render: () => {
      // No element carries that id. The attribute is written; the dialog is anonymous.
      return <p style={dialogStyle}>Named by nothing at all.</p>;
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          void open();
        }}
      >
        Open Dangling
      </button>
      {Modal}
    </div>
  );
}

/** The heading arrives only once `prepare` settles — correct, and must not warn. */
export function LateTitleHarness() {
  useDebugLogging();
  const [release, setRelease] = useState<(() => void) | null>(null);

  const { open, Modal } = useModal({
    id: 'labelling-late',
    ariaLabelledBy: 'labelling-late-title',
    prepare: async () => {
      await new Promise<void>((resolve) => {
        setRelease(() => {
          return resolve;
        });
      });
    },
    render: ({ isPreparing }) => {
      return (
        <div style={dialogStyle}>
          {isPreparing ? (
            <p data-testid="late-pending">Loading…</p>
          ) : (
            <h2 id="labelling-late-title">Loaded at last</h2>
          )}
          <button
            data-testid="late-release"
            onClick={() => {
              release?.();
            }}
          >
            Release
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          void open();
        }}
      >
        Open Late
      </button>
      {Modal}
    </div>
  );
}

function OutletInner() {
  const { open } = useModal({
    id: 'labelling-outlet',
    ariaLabelledBy: 'labelling-outlet-title',
    render: () => {
      return (
        <div style={dialogStyle}>
          <h2 id="labelling-outlet-title">Rendered by the outlet</h2>
        </div>
      );
    },
  });

  return (
    <button
      onClick={() => {
        void open();
      }}
    >
      Open Outlet
    </button>
  );
}

/** Correctly labelled, but delivered a commit late — the deferral is what saves this one. */
export function OutletLabelHarness() {
  useDebugLogging();

  return (
    <ModalOutlet>
      <OutletInner />
    </ModalOutlet>
  );
}
