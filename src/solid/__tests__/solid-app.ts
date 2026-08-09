import { createSignal } from 'solid-js';
import h from 'solid-js/h';
import type { JSX } from 'solid-js';
import { DialogManagerProvider } from '../dialog-manager-context.js';
import { ModalOutlet } from '../modal-outlet.js';
import { useMessageModal } from '../templates/use-message-modal.js';
import { useSlideModal } from '../templates/use-slide-modal.js';
import { useDialogManager } from '../use-dialog-manager.js';
import { useLookup } from '../use-lookup.js';
import { useModal } from '../use-modal.js';

/**
 * The Solid half of the binding's component tests.
 *
 * Written with `h` rather than JSX for the same reason the binding is: Solid's JSX needs
 * `babel-preset-solid`, and the CT bundle is React's. Nothing about what is under test depends on
 * that — `h` and compiled JSX produce the same calls, and the props an action returns are tracked
 * either way (hyperscript detects getters through the property descriptor and spreads them).
 *
 * Each harness is wrapped in its own `DialogManagerProvider`, so a Solid test is as isolated as a
 * React one: without it the modals would register with the module-level singleton and leak
 * between tests, since Playwright's global wrapper only provides React's.
 */

/**
 * What `h` hands back: a thunk, which Solid's `JSX.Element` deliberately does not name — the
 * compiler emits that shape, a JSX author never writes it — even though `insert` runs it like any
 * other dynamic child.
 */
type Built = ReturnType<typeof h>;

/** Run the thunk where a `JSX.Element` is required. The node it produces is one. */
const el = (built: Built): JSX.Element => {
  return built();
};

/** Reactive text, as a child function — the shape hyperscript re-runs on change. */
const text = (read: () => string, testId: string): Built => {
  return h('span', { 'data-testid': testId }, read);
};

/**
 * Open, close, dismiss, hotkey, and the live fields — the ordinary surface, asserted through
 * elements *outside* the dialog so a stale read would show.
 */
function BasicApp(): Built {
  const [lastReason, setLastReason] = createSignal('none');
  const [slow, setSlow] = createSignal(false);

  const modal = useModal<void, 'confirm' | 'cancel'>({
    id: 'solid-basic',
    ariaLabel: 'Solid basic',
    prepare: async () => {
      if (slow()) {
        await new Promise((resolve) => {
          setTimeout(resolve, 250);
        });
      }
    },
    // Not destructured: the live fields are getters, and pulling them out of the object would
    // read each one once and freeze it. This is Solid's ordinary props rule, and it applies to
    // the render args for exactly the same reason.
    render: (ctx) => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'Solid content'),
          text(() => {
            return ctx.isPreparing ? 'preparing' : 'ready';
          }, 'preparing'),
          text(() => {
            return ctx.hasRunningAction ? 'running' : 'idle';
          }, 'running'),
          h('button', ctx.action('cancel', { hotkey: 'Escape' }), 'Cancel'),
          h(
            'button',
            ctx.action('confirm', {
              hotkey: 'Enter',
              focusOnOpen: true,
              onAction: async (close) => {
                await new Promise((resolve) => {
                  setTimeout(resolve, 120);
                });
                close();
              },
            }),
            'Confirm'
          )
        )
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  return h(
    'div',
    null,
    text(() => {
      return modal.isVisible ? 'open' : 'closed';
    }, 'is-visible'),
    text(lastReason, 'last-reason'),
    h(
      'button',
      {
        'data-testid': 'open',
        onClick: () => {
          void modal.open();
        },
      },
      'Open'
    ),
    h(
      'button',
      {
        'data-testid': 'open-slow',
        onClick: () => {
          setSlow(true);
          void modal.open();
        },
      },
      'Open slowly'
    ),
    h(
      'button',
      {
        'data-testid': 'open-and-wait',
        onClick: () => {
          void modal.openAndWait().then(([, result]) => {
            setLastReason(`awaited:${result?.reason ?? 'none'}`);
          });
        },
      },
      'Open and wait'
    ),
    modal.Modal
  );
}

/**
 * The declaration window, which a fine-grained renderer has to close by hand.
 *
 * Backdrop dismissal is opt-out without actions and opt-in with them, so whether the modal has
 * *currently drawn* an action is observable from outside: with the button gone, a backdrop click
 * must dismiss again. Without `engine.undeclare` on the button's cleanup it never would.
 */
function DeclarationApp(): Built {
  const [withAction, setWithAction] = createSignal(true);

  const modal = useModal<void, 'confirm'>({
    id: 'solid-declaration',
    ariaLabel: 'Solid declaration',
    render: (ctx) => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'Toggle the action'),
          // Inside the render callback, because a `showModal()` dialog owns the top layer and
          // swallows every click outside itself — the same rule the React stories follow. A plain
          // button, not an action: declaring one would defeat what the test is measuring.
          h(
            'button',
            {
              'data-testid': 'drop-action',
              onClick: () => {
                setWithAction(false);
              },
            },
            'Drop the action'
          ),
          () => {
            return withAction() ? h('button', ctx.action('confirm'), 'Confirm') : null;
          }
        )
      );
    },
  });

  return h(
    'div',
    null,
    text(() => {
      return modal.isVisible ? 'open' : 'closed';
    }, 'is-visible'),
    h(
      'button',
      {
        'data-testid': 'open',
        onClick: () => {
          void modal.open();
        },
      },
      'Open'
    ),
    modal.Modal
  );
}

/** An outlet takes the dialog, and `Modal` becomes `null` — the same contract React's has. */
function OutletInner(): Built {
  const modal = useModal<void, 'confirm'>({
    id: 'solid-outlet',
    ariaLabel: 'Solid outlet',
    render: () => {
      return el(h('p', null, 'Rendered by the outlet'));
    },
  });

  return h(
    'div',
    null,
    text(() => {
      return modal.Modal === null ? 'null' : 'node';
    }, 'modal-slot'),
    h(
      'button',
      {
        'data-testid': 'open',
        onClick: () => {
          void modal.open();
        },
      },
      'Open'
    )
  );
}

/**
 * The slide template, and the one thing only Solid can get wrong about it.
 *
 * `useSlideModal` hands its render callback `args` plus a `direction`, and it composes them with
 * `mergeProps` rather than a spread. A spread would read every getter once and give the template
 * a frozen copy — `direction` would still be right, and `isPreparing` would never come back. So
 * the test reads both, and the second is the assertion.
 */
function SlideApp(): Built {
  const panel = useSlideModal<void, 'close'>({
    id: 'solid-slide',
    ariaLabel: 'Solid slide',
    direction: 'right',
    prepare: async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });
    },
    render: (ctx) => {
      return el(
        h(
          'div',
          null,
          text(() => {
            return ctx.direction;
          }, 'direction'),
          text(() => {
            return ctx.isPreparing ? 'preparing' : 'ready';
          }, 'slide-preparing'),
          h('button', ctx.action('close'), 'Close')
        )
      );
    },
  });

  // The manager hooks, read from outside the panel: `useDialogManager` hands back an object whose
  // fields are getters, `useLookup` an accessor — and both have to be live for these to move.
  const dialogs = useDialogManager();
  const info = useLookup('solid-slide');

  return h(
    'div',
    null,
    text(() => {
      return String(dialogs.openDialogs.length);
    }, 'open-count'),
    text(() => {
      const current = info();
      return current.exists && current.isVisible ? current.modalType : 'none';
    }, 'lookup-type'),
    h(
      'button',
      {
        'data-testid': 'open',
        onClick: () => {
          void panel.open();
        },
      },
      'Open'
    ),
    panel.Modal
  );
}

/** The message template: the same three lines React's is, so this is a smoke test on purpose. */
function MessageApp(): Built {
  const [lastReason, setLastReason] = createSignal('none');

  const modal = useMessageModal<void, 'confirm'>({
    id: 'solid-message',
    ariaLabel: 'Solid message',
    render: (ctx) => {
      return el(
        h('div', null, h('p', null, 'Message body'), h('button', ctx.action('confirm'), 'Confirm'))
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  const info = useLookup('solid-message');

  return h(
    'div',
    null,
    text(lastReason, 'last-reason'),
    text(() => {
      const current = info();
      return current.exists && current.isVisible ? current.modalType : 'none';
    }, 'lookup-type'),
    h(
      'button',
      {
        'data-testid': 'open',
        onClick: () => {
          void modal.open();
        },
      },
      'Open'
    ),
    modal.Modal
  );
}

export const SolidBasicApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, BasicApp));
};

export const SolidDeclarationApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, DeclarationApp));
};

export const SolidOutletApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, h(ModalOutlet, null, OutletInner)));
};

export const SolidSlideApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, SlideApp));
};

export const SolidMessageApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, MessageApp));
};
