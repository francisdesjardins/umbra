import { ExampleLayout } from '@/entities/example';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useAnnouncer } from '@/shared/lib/use-announcer';
import { useStore } from '@/shared/lib/use-store';
import { AppButton } from '@/shared/ui/AppButton';
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
 * `direction: 'right'` slides in from the right edge; `align: 'start'` pins it to the top of the
 * cross axis rather than the default `stretch` (a floor-to-ceiling drawer), which makes the panel
 * content-sized on the cross axis — hence the explicit `width` and no height. `nonModal: true`
 * keeps the page interactive, `portal: true` anchors it to the viewport (a non-modal dialog never
 * enters the top layer, so otherwise it positions against its container), and `dismissKey: false`
 * because a toast ends on its own action or its timer. The countdown lives here rather than in the
 * trigger so the pointer can pause it, which doubles as proof the page underneath is interactive.
 *
 * **A toast is not a dialog.** `<dialog>` carries an implicit `role="dialog"` — a surface to
 * attend to and dismiss — where a toast is a passing status message that taking focus for would be
 * hostile. So the element is only a shell (positioning, slide, lifecycle, typed close) and the
 * announcement goes through a live region **outside** it, because a live region announces
 * *changes*: one rendered by `render` mounts in the same pass that shows the dialog and enters the
 * accessibility tree already holding its text, the case screen readers miss. `useAnnouncer` mounts
 * a hidden `role="status"` beside the trigger on first render, long before there is anything to
 * say; every binding inherits the rule, since markup inside a closed dialog sits under
 * `display: none`, out of the tree, and becomes an insertion when it opens. The element disagrees
 * and that is handled rather than asserted: the focusing steps run on `show()` too — measured,
 * focus lands on Dismiss within 50ms — so the trigger remembers where focus was and `prepare` puts
 * it back. (Same reasoning behind `role` being only `'dialog' | 'alertdialog'`: a role that
 * contradicts its own element is not a fix.) It is still named, for the other way in — the element
 * stays in the tree, so a virtual cursor can land on it later and "dialog" is not useful to find.
 *
 * **Once a toast carries actions, three things stop being optional.** The timer must pause on
 * focus as well as hover, or a keyboard user tabbing to the action is exactly who the countdown
 * robs (WCAG 2.2.1) — this one listens to both. The actions must be *reachable*: a live region
 * announces text and puts nothing in the tab order, so a control that leaves after five seconds
 * may never be arrived at, and either auto-dismiss stops or the app offers a jump to the
 * notification region. And a choice the user *must* make is not a toast — it is `alertdialog`,
 * taking focus, dismissible with Escape, a different hook call rather than a restyling of this
 * one; `dismissKey: false` is defensible here only because nothing in this toast needs an answer.
 */
export function SlideCornerToastExample() {
  const { result } = useStore(resultStore);
  const { announce, region } = useAnnouncer();
  /** Where focus was when the toast was raised; a status message has no business taking it. */
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
        <div
          // No `role="status"` here: mounted in the same pass that shows the dialog, it would be
          // born already holding its text — `useAnnouncer`'s persistent region does the announcing.
          onPointerEnter={() => {
            setHovered(true);
          }}
          onPointerLeave={() => {
            setHovered(false);
          }}
          // Focus, not just hover: a keyboard user reaching Dismiss gets the same reprieve a
          // pointer user gets, which is what WCAG 2.2.1 asks for.
          onFocusCapture={() => {
            setFocusedInside(true);
          }}
          onBlurCapture={() => {
            setFocusedInside(false);
          }}
          style={{
            // Content-sized on the cross axis (align: start) — the toast defines its own box.
            width: 'min(86vw, 360px)',
            margin: 16,
            borderRadius: 8,
            border: '1px solid var(--modal-border)',
            background: 'var(--modal-bg)',
            color: 'var(--modal-text)',
            fontFamily: 'var(--font-family)',
            boxShadow: 'var(--modal-shadow)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 'var(--app-space-3)',
              alignItems: 'flex-start',
              padding: 'var(--app-space-4) var(--app-space-4) var(--app-space-3)',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                marginTop: 2,
                fill: 'var(--color-success)',
              }}
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--app-space-1)',
                flex: 1,
                minWidth: 0,
              }}
            >
              <strong style={{ fontSize: 'var(--font-size-sm)' }}>Changes saved</strong>
              <Shared.Detail>
                The page stays fully interactive — scroll and click while this is open. Hover here
                and the countdown holds.
              </Shared.Detail>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--modal-text-secondary)',
                }}
              >
                {isPaused
                  ? `paused — ${focusedInside ? 'focused' : 'reading'}`
                  : `closing in ${(remaining / 1000).toFixed(1)}s`}
              </span>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => {
                handle.close('dismiss');
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--modal-text-secondary)',
                cursor: 'pointer',
                padding: 'var(--app-space-1)',
                marginTop: -4,
                marginRight: -4,
                display: 'inline-flex',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                style={{ width: 18, height: 18, fill: 'currentColor' }}
              >
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--app-space-2)',
              padding: '0 var(--app-space-4) var(--app-space-3)',
            }}
          >
            {/* `handle.close('dismiss')`, not `action('dismiss')`: a close you *report* rather
                than an action you declare, wanting no hotkey, running state or disabling. */}
            <Shared.Button
              onClick={() => {
                handle.close('dismiss');
              }}
            >
              Dismiss
            </Shared.Button>
          </div>
          {/* The timer made visible — otherwise "it pauses on hover" is a claim, not a demo.
              A track and a scaled fill: three lines of CSS where a component library ships a bar. */}
          <div aria-hidden style={{ height: 3, background: 'var(--modal-border)' }}>
            <div
              style={{
                height: '100%',
                width: `${String((remaining / LIFETIME_MS) * 100)}%`,
                background: isPaused ? 'var(--color-warning)' : 'var(--color-primary)',
              }}
            />
          </div>
        </div>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  const { isVisible, handle } = toast;

  useEffect(() => {
    if (!isVisible || isPaused) {
      return;
    }
    // The updater stays pure: React may run one during a render, and closing from inside it writes
    // to the modal store mid-render — “Cannot update a component while rendering a different
    // component” on every toast that ran out on its own.
    const id = window.setInterval(() => {
      setRemaining((left) => {
        return Math.max(0, left - TICK_MS);
      });
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [isVisible, isPaused]);

  // Closing after the render that showed the zero, off the same tick, so the visible number and
  // the actual lifetime stay one thing rather than two timers that drift.
  useEffect(() => {
    if (isVisible && remaining <= 0) {
      handle.close('timeout');
    }
  }, [isVisible, remaining, handle]);

  return (
    <ExampleLayout result={result} modals={toast.Modal}>
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          setRemaining(LIFETIME_MS);
          setHovered(false);
          setFocusedInside(false);
          returnFocusTo.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          // Through the persistent region, not the toast's own markup.
          announce('Changes saved');
          await toast.open();
        }}
      >
        Show Toast
      </AppButton>
      {region}
      <p
        style={{
          margin: 0,
          fontSize: 'var(--app-text-md)',
          lineHeight: 1.43,
          color: 'var(--app-text-secondary)',
          alignSelf: 'center',
        }}
      >
        direction: right · align: start · non-modal + portal
      </p>
    </ExampleLayout>
  );
}
