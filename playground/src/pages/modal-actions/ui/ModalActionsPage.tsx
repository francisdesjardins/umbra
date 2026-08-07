import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import {
  MODAL_ID as FOCUS_ON_OPEN_ID,
  FocusOnOpenExample,
} from '@/pages/modal-actions/examples/focus-on-open';
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
      description="An action is declared by being rendered: action('save', handler) inside render names the reason, binds the handler, and returns the button props — loading, disabled, aria-keyshortcuts — in one expression."
    >
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          The <strong>Delete Item</strong> action fails randomly about 30% of the time, so the error
          and loading states are visible without rigging anything — retry to see the success path.
          The hotkey card beside it always succeeds: its subject is the keyboard.
        </Typography>
      </Alert>

      <ExampleSection
        title="Actions & hotkeys"
        description="The reason is the action's identity: it names the action and it is what the modal closes with. Spread the returned props onto any button you like."
      >
        <ExampleGrid>
          <ExampleCard
            title="Confirm with Hotkeys"
            description="Two actions, each with a hotkey declared on it. Press Enter to confirm, Escape to cancel — the modal dispatches by clicking the button, so the key path is the click path."
            codeKey="confirm-with-hotkeys"
            modalId={CONFIRM_ID}
            tryLabel="Open"
            example={<ConfirmWithHotkeysExample />}
          />
          <ExampleCard
            title="Which button has the focus?"
            description="showModal() focuses the first thing it finds — for a form, its first input, which is rarely what a confirmation wants and never what a destructive one wants. action('keep', { focusOnOpen: true }) moves the starting point, and the readout inside the modal names whatever actually holds focus. The first Delete fails on purpose: focus returns to the same button, because that is where the retry lives."
            codeKey="focus-on-open"
            modalId={FOCUS_ON_OPEN_ID}
            tryLabel="Delete a file"
            example={<FocusOnOpenExample />}
          />
          <ExampleCard
            title="Delete Item Modal"
            description="A delete confirmation that reports which item it closed with — the typed close payload, declared once on the hook."
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
