import { ExampleLayout } from '@/entities/example';
import * as FormModal from '@/entities/modal-template/ui/vanilla/form-modal';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Key, useMessageModal } from 'umbra/react';

export const MODAL_ID = 'focus-on-open';

/** The chip the MUI `Chip` drew here: a pill of quiet text on the hover wash. */
const chipStyle: CSSProperties = {
  padding: '3px 8px',
  borderRadius: 'var(--app-radius-pill)',
  fontSize: 'var(--app-text-sm)',
  background: 'var(--app-hover)',
  color: 'var(--app-text)',
};

/** Reads what actually holds focus, so the claim on screen is measured rather than asserted. */
function useFocusedLabel(active: boolean) {
  const [label, setLabel] = useState('—');

  useEffect(() => {
    if (!active) {
      return;
    }
    const read = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) {
        setLabel('—');
        return;
      }
      const text = (el.getAttribute('aria-label') ?? el.textContent).trim();
      setLabel(text.slice(0, 28) || el.tagName.toLowerCase());
    };
    read();
    const id = window.setInterval(read, 150);
    return () => {
      window.clearInterval(id);
    };
  }, [active]);

  return label;
}

/**
 * Which button the modal opens on, and where focus goes when an action fails. The text field is
 * first on purpose: `showModal()` would focus it, so focus on *Keep* proves the option did it.
 */
export function FocusOnOpenExample() {
  const [attempts, setAttempts] = useState(0);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const focused = useFocusedLabel(isVisible);

  const modal = useMessageModal<void, 'delete' | 'keep'>({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    // Not `alertdialog`: it announces its description, and this body is focus commentary.
    prepare: () => {
      setIsVisible(true);
      setAttempts(0);
    },
    render: ({ action, error }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="warning" />
            <MessageModal.Title id={`${MODAL_ID}-title`}>Delete this file?</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Shared.Message>
                The field below is first in the DOM, so it is what the browser would focus on its
                own. Focus is on <strong>Keep</strong> instead, because that action asked for it.
              </Shared.Message>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <FormModal.Label htmlFor={`${MODAL_ID}-reason`}>Reason (optional)</FormModal.Label>
                <FormModal.Input id={`${MODAL_ID}-reason`} />
              </div>
              <span
                style={{
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid var(--modal-border)',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                }}
              >
                document.activeElement → {focused}
              </span>
              {error ? (
                <Shared.Alert severity="error">
                  {error.message} — focus came back to Keep, which is where the retry lives.
                </Shared.Alert>
              ) : null}
            </div>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('keep', { focusOnOpen: true })}>Keep</Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('delete', {
                hotkey: Key.Enter,
                onAction: async (close) => {
                  const attempt = attempts + 1;
                  setAttempts(attempt);
                  await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                  });
                  // The first attempt always fails, so the restoration is visible every time.
                  if (attempt === 1) {
                    throw new Error('Delete failed: the server said no');
                  }
                  close();
                },
              })}
            >
              Delete
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
    onClose: (result) => {
      setIsVisible(false);
      setOutcome(result.reason === 'delete' ? 'Deleted' : `Kept (${result.reason})`);
    },
  });

  return (
    <ExampleLayout result={outcome} modals={modal.Modal}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--app-space-3)',
          width: '100%',
        }}
      >
        <AppButton
          variant="contained"
          size="small"
          style={{ alignSelf: 'flex-start' }}
          onClick={async () => {
            setOutcome(null);
            await modal.open();
          }}
        >
          Delete a file
        </AppButton>
        <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
          <span style={chipStyle}>focus: {isVisible ? focused : 'modal closed'}</span>
          <span style={chipStyle}>delete attempts: {String(attempts)}</span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--app-text-xs)',
            lineHeight: 1.66,
            color: 'var(--app-text-secondary)',
          }}
        >
          The first Delete always fails, so you can watch focus return to the button that offers the
          retry. Press <kbd>Enter</kbd> twice: the first fails, the second closes.
        </p>
      </div>
    </ExampleLayout>
  );
}
