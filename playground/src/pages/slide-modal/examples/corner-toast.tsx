import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSlideModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'slide-corner-toast';

const resultStore = createResultStore();

/**
 * Corner toast — the use case `align` exists for.
 *
 * `direction: 'right'` slides in from the right edge, and `align: 'start'` pins it to the
 * TOP of the cross axis instead of stretching full-height (the default `stretch`, which
 * would give a floor-to-ceiling drawer). Because a non-stretch align makes the panel
 * content-sized on the cross axis, the toast sizes itself — hence the explicit `width`
 * and the absence of any height.
 *
 * `nonModal: true` keeps the page interactive (no backdrop, no focus trap, no scroll lock)
 * and `portal: true` anchors it to the viewport — required for a corner overlay, since a
 * non-modal dialog never enters the top layer and would otherwise be positioned relative
 * to its container. `dismissKey: false` disables Escape: a toast is dismissed by its own
 * action or by its timer, not by a stray keypress.
 *
 * **A toast is not a dialog**, and this is the one example where that distinction bites. A
 * `<dialog>` carries an implicit `role="dialog"`: a surface the user is meant to attend to and
 * dismiss. A toast is a passing status message — nobody navigates to it, and taking focus for
 * it would be hostile. So the element here is a shell (positioning, the slide, the lifecycle,
 * the typed close) and the *semantics* live inside it: `role="status"` with `aria-live` is what
 * makes a screen reader announce "Changes saved" without moving the user anywhere. Nothing
 * names the dialog, deliberately — a non-modal dialog that never receives focus is never
 * announced as one.
 *
 * The same reasoning is why `useModal`'s `role` option is `'dialog' | 'alertdialog'` and not
 * every ARIA role: a role that contradicts its own element is not a fix.
 */
export function SlideCornerToastExample() {
  const { result } = useStore(resultStore);

  const toast = useSlideModal({
    id: MODAL_ID,
    direction: 'right',
    align: 'start',
    nonModal: true,
    portal: true,
    dismissKey: false,
    render: ({ action }) => {
      return (
        <Box
          // The announcement, and the only thing here assistive technology reacts to.
          // `polite` waits for a pause rather than interrupting; `atomic` reads the whole
          // toast rather than the words that changed.
          role="status"
          aria-live="polite"
          aria-atomic
          sx={{
            // Content-sized on the cross axis (align: start) — the toast defines its own box.
            width: { xs: '86vw', sm: 340 },
            m: 2,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'var(--modal-bg)',
            color: 'text.primary',
            boxShadow: 6,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.25 }} />
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">Changes saved</Typography>
              <Typography variant="body2" color="text.secondary">
                The page stays fully interactive — scroll and click while this is open.
              </Typography>
            </Stack>
            <Shared.Button size="small" variant="text" {...action('dismiss')}>
              Dismiss
            </Shared.Button>
          </Stack>
        </Box>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={toast.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await toast.open();
          // Auto-dismiss after a moment, the way a real toast behaves. `close()` is a no-op
          // if the user already dismissed it, so no guard is needed.
          setTimeout(() => {
            toast.handle.close('timeout');
          }, 4000);
        }}
      >
        Show Toast
      </Shared.Button>
      <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
        direction: right · align: start · non-modal + portal
      </Typography>
    </ExampleLayout>
  );
}
