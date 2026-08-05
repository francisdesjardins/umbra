import { useState } from 'react';
import { useDialogManagerContext } from '../../dialog-manager-context.js';

/**
 * Tests that calling open/close on an unregistered id is a silent no-op.
 */
export function UnregisteredNoOpHarness() {
  const [error, setError] = useState('');
  const dm = useDialogManagerContext();

  return (
    <div>
      <button
        onClick={() => {
          try {
            dm.open('not-registered');
            dm.close('not-registered', 'test');
          } catch (err) {
            setError(String(err));
          }
        }}
      >
        Try Unregistered
      </button>
      <span data-testid="error">{error}</span>
    </div>
  );
}
