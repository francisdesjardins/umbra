import { useEffect, useState } from 'react';
import { ModalOutlet } from '../../modal-outlet.js';
import { useDialog } from '../../use-dialog.js';
import { setLogLevel } from '../../../utils/logger.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * The three shapes the labelling diagnostic must tell apart. Two it has to stay quiet about — a
 * name that exists only once `prepare` settles, and one delivered a commit late through
 * `ModalOutlet` — which is why the check is deferred and gated behind the logger; noise on correct
 * code is worse than no check.
 */

/**
 * Every namespace on, so the warning is emitted at all — but the level is global, so it is claimed
 * for the open that needs it and dropped at the close. Enabled while merely mounted, one of these
 * would run a page hosting a hundred harnesses with the whole log on.
 */
const claimLogging = () => {
  setLogLevel('*');
};
const dropLogging = () => {
  setLogLevel(false);
};

/** The unmount half, for a harness torn down with its dialog still open. */
function useDebugLogging() {
  useEffect(() => {
    return dropLogging;
  }, []);
}

/** `ariaLabelledBy` pointing at an id nothing renders — the failure this exists to catch. */
export function DanglingLabelHarness() {
  useDebugLogging();

  const { open, Modal } = useDialog({
    id: 'labelling-dangling',
    onClose: dropLogging,
    ariaLabelledBy: 'labelling-dangling-title',
    render: () => {
      return <p style={dialogStyle}>Named by nothing at all.</p>;
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          claimLogging();
          void open();
        }}
      >
        Open Dangling
      </button>
      {Modal}
    </div>
  );
}

export function LateTitleHarness() {
  useDebugLogging();
  const [release, setRelease] = useState<(() => void) | null>(null);

  const { open, Modal } = useDialog({
    id: 'labelling-late',
    onClose: dropLogging,
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
          claimLogging();
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
  const { open } = useDialog({
    id: 'labelling-outlet',
    onClose: dropLogging,
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
        claimLogging();
        void open();
      }}
    >
      Open Outlet
    </button>
  );
}

export function OutletLabelHarness() {
  useDebugLogging();

  return (
    <ModalOutlet>
      <OutletInner />
    </ModalOutlet>
  );
}
