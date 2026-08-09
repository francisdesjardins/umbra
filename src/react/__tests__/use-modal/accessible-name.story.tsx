import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * The three ways a dialog gets an accessible name and a role, and what happens with none of
 * them: a dialog announced as just "dialog", which is the defect the options exist to prevent.
 */
export function AccessibleNameHarness() {
  const labelled = useModal({
    id: 'a11y-labelled',
    ariaLabel: 'Session settings',
    render: () => {
      return <p style={dialogStyle}>Named by a string.</p>;
    },
  });

  const described = useModal({
    id: 'a11y-described',
    ariaLabelledBy: 'a11y-heading',
    ariaDescribedBy: 'a11y-body',
    role: 'alertdialog',
    render: () => {
      return (
        <div style={dialogStyle}>
          <h2 id="a11y-heading">Delete workspace</h2>
          <p id="a11y-body">This cannot be undone.</p>
        </div>
      );
    },
  });

  const anonymous = useModal({
    id: 'a11y-anonymous',
    render: () => {
      return <p style={dialogStyle}>Named by nothing.</p>;
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await labelled.open();
        }}
      >
        Open Labelled
      </button>
      <button
        onClick={async () => {
          await described.open();
        }}
      >
        Open Described
      </button>
      <button
        onClick={async () => {
          await anonymous.open();
        }}
      >
        Open Anonymous
      </button>
      {labelled.Modal}
      {described.Modal}
      {anonymous.Modal}
    </div>
  );
}
