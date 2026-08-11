import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useSlideModal } from 'umbra/react';

export const MODAL_ID = 'slide-corner-toast';

const resultStore = createResultStore();

/** How long the toast lives, and how often the countdown ticks. */
const LIFETIME_MS = 5000;
const TICK_MS = 100;

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
 * The countdown lives here rather than in the trigger that opened it, which is what lets the
 * pointer pause it: a toast that expires while you are reading it is a toast you cannot read.
 * Pausing on hover is also the proof that the dialog underneath stays interactive — a modal
 * one would never receive the pointer at all.
 *
 * **A toast is not a dialog**, and this is the one example where that distinction bites. A
 * `<dialog>` carries an implicit `role="dialog"`: a surface the user is meant to attend to and
 * dismiss. A toast is a passing status message — nobody navigates to it, and taking focus for
 * it would be hostile. So the element here is a shell (positioning, the slide, the lifecycle,
 * the typed close) and the *semantics* live inside it: `role="status"` with `aria-live` is what
 * makes a screen reader announce "Changes saved" without moving the user anywhere.
 *
 * **The element does not agree, and that has to be handled rather than asserted.** The dialog
 * focusing steps run on `show()` too, not only on `showModal()` — measured here: focus lands on
 * the Dismiss button within 50ms of opening. For a modal that is the correct behaviour; for a
 * status message it is the caret being taken out of whatever the user was typing. So the trigger
 * remembers where focus was and `prepare` puts it back, which is the whole mitigation.
 *
 * The same reasoning is why `useModal`'s `role` option is `'dialog' | 'alertdialog'` and not
 * every ARIA role: a role that contradicts its own element is not a fix.
 *
 * **It is still named**, and the two facts do not conflict. The announcement comes from the live
 * region; the name is for the other way in — the element stays in the accessibility tree, so a
 * screen reader's virtual cursor can land on it minutes later, and "dialog" is not a useful thing
 * to find there.
 *
 * **What changes once the toast carries actions.** Everything above assumes a passing status
 * message. Put a link or a set of choices in it and three things stop being optional:
 *
 * - The timer must pause on **focus** as well as hover — a keyboard user tabbing to the action
 *   is exactly the person the countdown would rob (WCAG 2.2.1). That is why this one listens to
 *   both, though its only control is Dismiss.
 * - The actions have to be *reachable*. A live region announces text; it does not put anything
 *   in the tab order at a predictable moment, and a toast that leaves after five seconds is a
 *   control the keyboard may never arrive at. Either it stops auto-dismissing once it has an
 *   action, or the app gives the notification region a shortcut to jump to.
 * - If the choice is one the user *must* make, it is not a toast any more: that is a dialog with
 *   `role: 'alertdialog'`, taking focus, dismissible with Escape — which is a different hook
 *   call, not a different style of this one. `dismissKey: false` here is only defensible because
 *   nothing in this toast needs an answer.
 */
export function SlideCornerToastExample() {
  const { result } = useStore(resultStore);
  /** Where focus was when the toast was raised — a status message has no business taking it. */
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const [remaining, setRemaining] = useState(LIFETIME_MS);
  const [hovered, setHovered] = useState(false);
  const [focusedInside, setFocusedInside] = useState(false);
  const isPaused = hovered || focusedInside;

  const toast = useSlideModal<void, 'dismiss' | 'timeout'>({
    id: MODAL_ID,
    direction: 'right',
    ariaLabel: 'Notification',
    align: 'start',
    nonModal: true,
    portal: true,
    dismissKey: false,
    // Runs after the dialog is shown, so this undoes the focusing steps rather than racing them.
    prepare: () => {
      returnFocusTo.current?.focus();
    },
    render: ({ handle }) => {
      return (
        <Box
          // The announcement, and the only thing here assistive technology reacts to.
          // `polite` waits for a pause rather than interrupting; `atomic` reads the whole
          // toast rather than the words that changed.
          role="status"
          aria-live="polite"
          aria-atomic
          onPointerEnter={() => {
            setHovered(true);
          }}
          onPointerLeave={() => {
            setHovered(false);
          }}
          // Focus, not just hover: a keyboard user reaching the Dismiss button gets the same
          // reprieve a pointer user gets, which is what WCAG 2.2.1 asks for and what stops the
          // toast from expiring under someone's hands.
          onFocusCapture={() => {
            setFocusedInside(true);
          }}
          onBlurCapture={() => {
            setFocusedInside(false);
          }}
          sx={{
            // Content-sized on the cross axis (align: start) — the toast defines its own box.
            width: { xs: '86vw', sm: 360 },
            m: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'var(--modal-bg)',
            color: 'text.primary',
            boxShadow: 6,
            overflow: 'hidden',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', p: 2, pb: 1.5 }}>
            <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.25 }} />
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">Changes saved</Typography>
              <Typography variant="body2" color="text.secondary">
                The page stays fully interactive — scroll and click while this is open. Hover here
                and the countdown holds.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {isPaused
                  ? `paused — ${focusedInside ? 'focused' : 'reading'}`
                  : `closing in ${(remaining / 1000).toFixed(1)}s`}
              </Typography>
            </Stack>
            <IconButton
              size="small"
              aria-label="Dismiss notification"
              onClick={() => {
                handle.close('dismiss');
              }}
              sx={{ mt: -0.5, mr: -0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack direction="row" sx={{ px: 2, pb: 1.5, gap: 1, justifyContent: 'flex-end' }}>
            {/* `handle.close('dismiss')`, not `action('dismiss')`: `'dismiss'` is the
                library's reason for a toast nobody acted on, so it is a close you *report*
                rather than an action you declare — and this button wants nothing an action
                provides (no hotkey, no running state, nothing to disable). */}
            <Shared.Button
              size="small"
              variant="text"
              onClick={() => {
                handle.close('dismiss');
              }}
            >
              Dismiss
            </Shared.Button>
          </Stack>
          {/* The timer, made visible — otherwise "it pauses on hover" is a claim, not a demo. */}
          <LinearProgress
            variant="determinate"
            value={(remaining / LIFETIME_MS) * 100}
            color={isPaused ? 'warning' : 'primary'}
            sx={{ height: 3 }}
          />
        </Box>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  const { isVisible, handle } = toast;

  // The countdown: one interval while the toast is open and the pointer is elsewhere.
  useEffect(() => {
    if (!isVisible || isPaused) {
      return;
    }
    // The updater stays pure. React may run one during a render, and closing from inside it
    // writes to the modal store mid-render — “Cannot update a component while rendering a
    // different component”, logged on every toast that ran out on its own.
    const id = window.setInterval(() => {
      setRemaining((left) => {
        return Math.max(0, left - TICK_MS);
      });
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [isVisible, isPaused]);

  // Closing is the side effect the tick implies, so it happens after the render that showed the
  // zero — still the same tick, so the visible number and the actual lifetime remain one thing
  // rather than two timers that drift apart.
  useEffect(() => {
    if (isVisible && remaining <= 0) {
      handle.close('timeout');
    }
  }, [isVisible, remaining, handle]);

  return (
    <ExampleLayout result={result} modals={toast.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          setRemaining(LIFETIME_MS);
          setHovered(false);
          setFocusedInside(false);
          returnFocusTo.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          await toast.open();
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
