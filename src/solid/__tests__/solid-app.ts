import { createSignal, onCleanup } from 'solid-js';
import h from 'solid-js/h';
import type { JSX } from 'solid-js';
import { setLogLevel } from '../../utils/logger.js';
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
          // The per-action question, read through the factory rather than off a button. Solid
          // wraps the core factory to attach an expiry, so these two also assert that the wrapper
          // carried `isRunning` across — an arrow that only forwarded the call would not have.
          text(() => {
            return ctx.action.isRunning('confirm') ? 'yes' : 'no';
          }, 'confirm-running'),
          text(() => {
            return ctx.action.isRunning('cancel') ? 'yes' : 'no';
          }, 'cancel-running'),
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
    // The snapshot's other field, and a getter of its own — `openDialogs` moving is not evidence
    // that `foreground` does, since each is subscribed to separately on this binding.
    text(() => {
      return dialogs.foreground?.id ?? 'none';
    }, 'foreground'),
    text(() => {
      const current = info();
      return current.exists && current.isVisible ? current.template : 'none';
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
      return current.exists && current.isVisible ? current.template : 'none';
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

/**
 * Disposal, an outlet, and a portal — the three paths the Solid suite never walked.
 *
 * Every one of them is `onCleanup` work the binding does on the way out: unregistering from the
 * manager, retiring the outlet entry, removing a portaled element from `document.body`. React's
 * suite covers all three (it has already regressed on one, when `portal` fell out of the teardown
 * deps and left an orphaned open dialog); nothing here did, which coverage put at 0 executions
 * for `teardownModal`, `outlet.unregister` and the portal branch alike.
 *
 * A child function is what disposes them: hyperscript re-runs it, and the owner of the branch it
 * replaces is disposed — which is exactly what unmounting a component is in Solid.
 */
function DisposalInner(props: { readonly dispose: () => void }): Built {
  const modal = useModal<void, 'ok'>({
    id: 'solid-disposal',
    ariaLabel: 'Solid disposal',
    render: () => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'Disposable content'),
          // Inside `render`: the dialog owns the top layer while it is open, so a button outside
          // it cannot be clicked. Same rule every story here follows.
          h(
            'button',
            {
              'data-testid': 'unmount-from-inside',
              onClick: () => {
                props.dispose();
              },
            },
            'Unmount from inside'
          )
        )
      );
    },
  });

  return h(
    'div',
    null,
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

function DisposalApp(): Built {
  const [mounted, setMounted] = createSignal(true);
  const info = useLookup('solid-disposal');

  return h(
    'div',
    null,
    text(() => {
      return info().exists ? 'registered' : 'gone';
    }, 'registration'),
    text(() => {
      return info().isVisible ? 'open' : 'closed';
    }, 'is-visible'),
    h(
      'button',
      {
        'data-testid': 'unmount',
        onClick: () => {
          setMounted(false);
        },
      },
      'Unmount'
    ),
    () => {
      return mounted()
        ? el(
            h(DisposalInner, {
              dispose: () => {
                setMounted(false);
              },
            })
          )
        : null;
    }
  );
}

/** The same disposal, one level down: the outlet has to forget it too. */
function OutletDisposalInner(props: { readonly dispose: () => void }): Built {
  const modal = useModal<void, 'ok'>({
    id: 'solid-outlet-disposal',
    ariaLabel: 'Solid outlet disposal',
    render: () => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'Outlet disposable'),
          h(
            'button',
            {
              'data-testid': 'unmount-from-inside',
              onClick: () => {
                props.dispose();
              },
            },
            'Unmount from inside'
          )
        )
      );
    },
  });

  return h(
    'button',
    {
      'data-testid': 'open',
      onClick: () => {
        void modal.open();
      },
    },
    'Open'
  );
}

function OutletDisposalApp(): Built {
  const [mounted, setMounted] = createSignal(true);

  return h(
    'div',
    null,
    h(
      'button',
      {
        'data-testid': 'unmount',
        onClick: () => {
          setMounted(false);
        },
      },
      'Unmount'
    ),
    h(ModalOutlet, null, () => {
      return mounted()
        ? el(
            h(OutletDisposalInner, {
              dispose: () => {
                setMounted(false);
              },
            })
          )
        : null;
    })
  );
}

/** `portal: true` — the binding mounts the element itself, and `Modal` stays null. */
function PortalApp(): Built {
  const modal = useModal<void, 'ok'>({
    id: 'solid-portal',
    ariaLabel: 'Solid portal',
    portal: true,
    render: () => {
      return el(h('p', null, 'Portaled content'));
    },
  });

  return h(
    'div',
    { 'data-testid': 'portal-host' },
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
    ),
    modal.Modal
  );
}

/** A contained non-modal panel: positioned against a host the binding creates. */
function ContainedApp(): Built {
  const modal = useModal<void, 'ok'>({
    id: 'solid-contained',
    ariaLabel: 'Solid contained',
    nonModal: true,
    render: () => {
      return el(h('p', null, 'Contained content'));
    },
  });

  return h(
    'div',
    { 'data-testid': 'contained-host', style: 'position: relative; width: 300px; height: 200px' },
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

/**
 * The live fields on the **hook's return**, read from outside the dialog.
 *
 * `hasRunningAction` and `error` reach both the render args and the return, and the reason the
 * second copy exists is a trigger button that has to show a spinner or an error while the modal
 * is the thing doing the work. On this binding they are getters over signals rather than
 * re-rendered values, so "reaches the return" and "stays live once there" are two claims, and only
 * the first is a type error when it breaks.
 *
 * Everything asserted here is therefore *outside* `render`: a frozen getter would read once at
 * setup and never move again, which is exactly what a passing type-check cannot rule out.
 */
function LiveStateApp(): Built {
  const modal = useModal<void, 'boom'>({
    id: 'solid-live-state',
    ariaLabel: 'Solid live state',
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
          h('p', null, 'Live state'),
          // The render args' own `error` getter — the same fact, on the other side of the seam.
          text(() => {
            return ctx.error?.message ?? 'none';
          }, 'inner-error'),
          h(
            'button',
            ctx.action('boom', {
              onAction: async () => {
                await new Promise((resolve) => {
                  setTimeout(resolve, 120);
                });
                throw new Error('boom failed');
              },
            }),
            'Boom'
          )
        )
      );
    },
  });

  return h(
    'div',
    null,
    text(() => {
      return modal.isPreparing ? 'preparing' : 'ready';
    }, 'outer-preparing'),
    text(() => {
      return modal.hasRunningAction ? 'running' : 'idle';
    }, 'outer-running'),
    text(() => {
      return modal.error?.message ?? 'none';
    }, 'outer-error'),
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

/**
 * The accessible name and `aria-busy`, on the binding where they are most likely to be wrong.
 *
 * Solid owns its `<dialog>` and writes the attributes itself, and `aria-busy` is the one that had
 * to move out of a one-shot loop into a render effect — so "written at all" and "still written on
 * the next transition" are two claims here, not one.
 *
 * The gate is released from a button *inside* the dialog: a `showModal()` dialog is in the top
 * layer, and nothing outside it is clickable while it is open.
 */
function BusyApp(): Built {
  // A signal rather than a `let`: the gate is set from inside an async callback, and state is
  // what the compiler's immutability rule asks for there.
  const [release, setRelease] = createSignal<(() => void) | undefined>();

  const modal = useModal({
    id: 'solid-busy',
    ariaLabel: 'Solid loading',
    prepare: async () => {
      await new Promise<void>((resolve) => {
        setRelease(() => {
          return resolve;
        });
      });
    },
    render: (ctx) => {
      return el(
        h(
          'div',
          null,
          text(() => {
            return ctx.isPreparing ? 'preparing' : 'ready';
          }, 'busy-preparing'),
          h(
            'button',
            {
              'data-testid': 'busy-release',
              onClick: () => {
                release()?.();
              },
            },
            'Release'
          )
        )
      );
    },
  });

  return h(
    'div',
    null,
    h(
      'button',
      {
        'data-testid': 'open-busy',
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

export const SolidBusyApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, BusyApp));
};

/**
 * The labelling diagnostic on the binding that can get it wrong.
 *
 * Solid's lifecycle effect tracks whatever its body reads, so the check only comes back when
 * `prepare` settles because `isPreparing` is passed *in* rather than read behind the function —
 * which is exactly what the late-title half of this harness would catch if that ever changed.
 */
function LabellingApp(): Built {
  const [release, setRelease] = createSignal<(() => void) | undefined>();

  setLogLevel('*');
  onCleanup(() => {
    setLogLevel(false);
  });

  const dangling = useModal({
    id: 'solid-dangling',
    ariaLabelledBy: 'solid-dangling-title',
    render: () => {
      // Nothing here carries that id.
      return el(h('p', null, 'Named by nothing at all.'));
    },
  });

  const late = useModal({
    id: 'solid-late',
    ariaLabelledBy: 'solid-late-title',
    prepare: async () => {
      await new Promise<void>((resolve) => {
        setRelease(() => {
          return resolve;
        });
      });
    },
    render: (ctx) => {
      return el(
        h(
          'div',
          null,
          () => {
            return ctx.isPreparing
              ? h('p', { 'data-testid': 'solid-late-pending' }, 'Loading…')()
              : h('h2', { id: 'solid-late-title' }, 'Loaded at last')();
          },
          h(
            'button',
            {
              'data-testid': 'solid-late-release',
              onClick: () => {
                release()?.();
              },
            },
            'Release'
          )
        )
      );
    },
  });

  return h(
    'div',
    null,
    h(
      'button',
      {
        'data-testid': 'open-dangling',
        onClick: () => {
          void dangling.open();
        },
      },
      'Open dangling'
    ),
    h(
      'button',
      {
        'data-testid': 'open-late',
        onClick: () => {
          void late.open();
        },
      },
      'Open late'
    ),
    dangling.Modal,
    late.Modal
  );
}

export const SolidLabellingApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, LabellingApp));
};

export const SolidLiveStateApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, LiveStateApp));
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

export const SolidDisposalApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, DisposalApp));
};

export const SolidOutletDisposalApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, OutletDisposalApp));
};

export const SolidPortalApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, PortalApp));
};

export const SolidContainedApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, ContainedApp));
};
