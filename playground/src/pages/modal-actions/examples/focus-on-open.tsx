import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Key, useMessageModal } from 'umbra/react';

export const MODAL_ID = 'focus-on-open';

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
 * Which button the modal opens on — and where focus goes when an action fails.
 *
 * The text field is deliberately first: it is what `showModal()` focuses on its own, so focus
 * landing on *Keep* proves the option did it rather than the browser agreeing by accident.
 */
export function FocusOnOpenExample() {
  const [attempts, setAttempts] = useState(0);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const focused = useFocusedLabel(isVisible);

  const modal = useMessageModal<void, 'delete' | 'keep'>({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    // Deliberately *not* `role: 'alertdialog'`, though the copy is a delete confirm. An
    // alertdialog is announced with its description, and everything in this one's body is
    // commentary about where focus went — announcing that immediately would be worse than not
    // announcing anything. The role travels with a description worth interrupting for; see
    // `delete-item-modal` for the pair done properly.
    prepare: () => {
      setIsVisible(true);
      setAttempts(0);
    },
    render: ({ action, error }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type="warning" sx={{ mb: 0 }} />
            <Typography id={`${MODAL_ID}-title`} variant="h6">
              Delete this file?
            </Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack spacing={2}>
              <Shared.Message>
                The field below is first in the DOM, so it is what the browser would focus on its
                own. Focus is on <strong>Keep</strong> instead, because that action asked for it.
              </Shared.Message>
              <TextField
                size="small"
                label="Reason (optional)"
                fullWidth
                sx={{ maxWidth: '100%' }}
              />
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                }}
              >
                document.activeElement → {focused}
              </Box>
              {error ? (
                <Shared.AlertContent severity="error">
                  {error.message} — focus came back to Keep, which is where the retry lives.
                </Shared.AlertContent>
              ) : null}
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('keep', { focusOnOpen: true })}>
              Keep
            </Shared.Button>
            <Shared.Button
              variant="contained"
              color="error"
              {...action('delete', {
                hotkey: Key.Enter,
                onAction: async (close) => {
                  const attempt = attempts + 1;
                  setAttempts(attempt);
                  await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                  });
                  // The first attempt always fails, so the restoration is visible on purpose
                  // rather than one time in three.
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
      <Stack sx={{ gap: 1.5, width: '100%' }}>
        <Shared.Button
          variant="contained"
          size="small"
          onClick={async () => {
            setOutcome(null);
            await modal.open();
          }}
        >
          Delete a file
        </Shared.Button>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={`focus: ${isVisible ? focused : 'modal closed'}`} />
          <Chip size="small" label={`delete attempts: ${String(attempts)}`} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          The first Delete always fails, so you can watch focus return to the button that offers the
          retry. Press <kbd>Enter</kbd> twice: the first fails, the second closes.
        </Typography>
      </Stack>
    </ExampleLayout>
  );
}
