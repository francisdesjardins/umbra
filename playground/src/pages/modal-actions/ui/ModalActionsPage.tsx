import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  MODAL_ID as CONFIRM_ID,
  ConfirmWithHotkeysExample,
} from '@/pages/modal-actions/examples/confirm-with-hotkeys';
import {
  MODAL_ID as DELETE_ITEM_ID,
  DeleteItemModalExample,
} from '@/pages/modal-actions/examples/delete-item-modal';
import {
  MODAL_ID as REACTIVE_DEPS_ID,
  ReactiveDepsExample,
} from '@/pages/modal-actions/examples/reactive-deps';
import { PageLayout } from '@/shared/ui/PageLayout';
import { Alert, Typography } from '@mui/material';

export const ModalActionsPage = () => {
  return (
    <PageLayout
      title="Modal Actions"
      description="useModalActions owns the action state a modal needs — isRunning, error, and hotkey bindings — so buttons stay declarative."
    >
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          Actions on this page <strong>fail randomly about 30% of the time</strong> so the error and
          loading states are visible without rigging anything. Retry to see the success path.
        </Typography>
      </Alert>

      <ExampleSection
        title="Actions & hotkeys"
        description="Declare actions with defineAction — the controller supplies loading, disabled, and aria-keyshortcuts to whatever button you render."
      >
        <ExampleGrid>
          <ExampleCard
            title="Confirm with Hotkeys"
            description="Inline useModalActions with hotkey-bound actions. Press Enter to confirm, Escape to cancel."
            codeKey="confirm-with-hotkeys"
            modalId={CONFIRM_ID}
            tryLabel="Open"
            example={<ConfirmWithHotkeysExample />}
          />
          <ExampleCard
            title="Delete Item Modal"
            description="Delete confirmation with item tracking and module-level controller definition."
            codeKey="delete-item-modal"
            modalId={DELETE_ITEM_ID}
            tryLabel="Delete Document"
            example={<DeleteItemModalExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="Reactive dependencies"
        description="No dependency arrays — React Compiler tracks what the render callback reads, so store mutations reach an already-open modal."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Reactive State"
            description="Live state mutation via createStore — updates reflect instantly inside the modal."
            codeKey="reactive-deps"
            modalId={REACTIVE_DEPS_ID}
            tryLabel="Open Modal"
            example={<ReactiveDepsExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
