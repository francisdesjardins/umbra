import { ExampleCard, ExampleGrid, ExampleSection } from '@/entities/example';
import { FocusOnOpenExample } from '@/pages/dialog-actions/examples/focus-on-open';
import { ConfirmWithHotkeysExample } from '@/pages/dialog-actions/examples/confirm-with-hotkeys';
import { DeleteItemDialogExample } from '@/pages/dialog-actions/examples/delete-item-dialog';
import { ReactiveDepsExample } from '@/pages/dialog-actions/examples/reactive-deps';
import { PerActionStateExample } from '@/pages/dialog-actions/examples/per-action-state';
import styles from '@/pages/dialog-actions/ui/DialogActionsPage.module.css';
import { PageLayout } from '@/shared/ui/PageLayout';
import { InfoIcon } from '@/shared/ui/icons';

export const DialogActionsPage = () => {
  return (
    <PageLayout
      title="Dialog Actions"
      description="An action is declared by being rendered: action('save', handler) inside render names the reason, binds the handler, and returns the button props — loading, disabled, aria-keyshortcuts — in one expression."
    >
      <div className={styles['banner']}>
        <InfoIcon className={styles['bannerIcon']} aria-hidden="true" />
        <p className={styles['bannerText']}>
          The <strong>Delete Item</strong> action fails randomly about 30% of the time, so the error
          and loading states are visible without rigging anything — retry to see the success path.
          The hotkey card beside it always succeeds: its subject is the keyboard.
        </p>
      </div>

      <ExampleSection
        title="Actions & hotkeys"
        description="The reason is the action's identity: it names the action and it is what the dialog closes with. Spread the returned props onto any button you like."
      >
        <ExampleGrid>
          <ExampleCard
            title="Confirm with Hotkeys"
            description="Two actions, each with a hotkey declared on it. Press Enter to confirm, Escape to cancel — the dialog dispatches by clicking the button, so the key path is the click path."
            codeKey="confirm-with-hotkeys"
            example={<ConfirmWithHotkeysExample />}
          />
          <ExampleCard
            title="Which button has the focus?"
            description="showModal() focuses the first thing it finds. On a destructive confirm that is Delete — a trap, with Enter already under the reader's finger. focusOnOpen moves the opening focus to the safe action, leaving tab and reading order alone."
            codeKey="focus-on-open"
            example={<FocusOnOpenExample />}
          />
          <ExampleCard
            title="Delete Item Dialog"
            description="A delete confirmation that reports which item it closed with — the typed close payload, declared once on the hook."
            codeKey="delete-item-dialog"
            example={<DeleteItemDialogExample />}
          />
          <ExampleCard
            title="Which action is running?"
            description="Spreading an action's props gives that button data-loading and disables it while the handler runs. What the rest of the dialog does with that is yours: this one keeps the field editable for a draft and locks it for a publish."
            codeKey="per-action-state"
            example={<PerActionStateExample />}
          />
        </ExampleGrid>
      </ExampleSection>

      <ExampleSection
        title="Reactive dependencies"
        description="No dependency arrays — React Compiler tracks what the render callback reads, so store mutations reach an already-open dialog."
      >
        <ExampleGrid columns={1}>
          <ExampleCard
            title="Reactive State"
            description="Live state mutation via createStore — updates reflect instantly inside the dialog."
            codeKey="reactive-deps"
            example={<ReactiveDepsExample />}
          />
        </ExampleGrid>
      </ExampleSection>
    </PageLayout>
  );
};
