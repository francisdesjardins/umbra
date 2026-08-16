import { createEffect, createSignal, onCleanup } from 'solid-js';
import h from 'solid-js/h';
import type { JSX } from 'solid-js';
import { reconcileOpen } from '../../core/reconcile-open.js';
import { createOpenRequest } from '../../manager/dialog-manager.js';
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

/**
 * `prioritize` through Solid — two modal dialogs and a policy that outranks open order.
 *
 * The feature is core and all three bindings inherit it without a line of their own, which is
 * precisely why nothing would fail if one of them stopped reaching it: `binding-parity.test.ts`
 * compares export *names*, and `prioritize` is a method on `DialogManager` reached through the
 * wholesale re-export. So this is the only thing that would notice.
 *
 * `withPolicy` is a parameter of the *factory* rather than a prop, because the React story's channel
 * is the app itself — `SolidRoot` takes a component, not props. The `false` half is the baseline, and
 * it is not padding: a reorder that never happened and a reorder that was not needed look identical
 * from outside.
 *
 * Two details that would silently break this. The policy is installed at **setup**, not in an
 * effect — a Solid component body runs once, so `onCleanup` is where the disposer goes. And the sizes
 * are **strings**: Solid's style is written verbatim through `applyStyle`, so a bare `300` copied from
 * the React harness type-checks and emits an invalid declaration, the two dialogs stop overlapping,
 * and `elementFromPoint` at the centre answers about neither.
 */
function stackPriorityApp(withPolicy: boolean): () => Built {
  return () => {
    const panel = useModal<void, 'close'>({
      id: 'solid-sp-panel',
      template: 'slide',
      style: { width: '300px', height: '300px' },
      render: () => {
        return el(h('div', null, h('p', null, 'Panel')));
      },
    });

    const warning = useModal<void, 'close'>({
      id: 'solid-sp-warning',
      template: 'alert',
      style: { width: '300px', height: '300px' },
      render: () => {
        return el(
          h(
            'div',
            null,
            h('p', null, 'Warning'),
            // Inside the render callback, because a `showModal()` dialog owns the top layer and
            // swallows every click outside itself — the same rule every other harness here follows.
            h(
              'button',
              {
                'data-testid': 'solid-sp-open-panel',
                onClick: () => {
                  warning.dialogManager.open('solid-sp-panel');
                },
              },
              'Open the panel'
            )
          )
        );
      },
    });

    if (withPolicy) {
      // Setup, not an effect: the body of a Solid component runs once, so there is no pass to gate.
      onCleanup(
        warning.dialogManager.prioritize((modal) => {
          return modal.template === 'alert' ? 100 : 0;
        })
      );
    }

    return h(
      'div',
      null,
      h(
        'button',
        {
          'data-testid': 'solid-sp-open-warning',
          onClick: () => {
            void warning.open();
          },
        },
        'Open the warning'
      ),
      warning.Modal,
      panel.Modal
    );
  };
}

export const SolidStackPriorityApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, stackPriorityApp(true)));
};

export const SolidOpenOrderApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, stackPriorityApp(false)));
};

/**
 * The options only React's suite had exercised: `containFocus`, `dismissOnClickOutside`, a custom
 * `dismissKey`, `prepare` aborted by its own close, and `onOpenRequest`.
 *
 * One app rather than five, because they are all the same claim — that these reach the shared
 * `attach*` functions from this binding's effects too — and five Solid roots would be five copies of
 * the wiring under test with nothing else different. Each is asserted through its own probe.
 *
 * **Non-modal on purpose.** `containFocus` is the Tab wrap `show()` does not give a dialog and is
 * inert for a modal one, and `dismissOnClickOutside` belongs to the same variant — the discriminated
 * union would reject the pair on a modal dialog, which is the one type-level constraint in the model.
 */
function NonModalOptionsApp(): Built {
  const [lastReason, setLastReason] = createSignal('none');
  const [prepareOutcome, setPrepareOutcome] = createSignal('idle');
  const [requestOutcome, setRequestOutcome] = createSignal('none');
  const [holdPrepare, setHoldPrepare] = createSignal(false);
  const [refuse, setRefuse] = createSignal(false);

  const modal = useModal<void, 'inside'>({
    id: 'solid-non-modal-options',
    ariaLabel: 'Solid non-modal options',
    nonModal: true,
    // Instant, and load-bearing for the tests rather than cosmetic: with the default 200 ms exit, a
    // panel that *is* closing still reads `isVisible` for that window, so "still open just after the
    // press" would match during a close and the assertion would hold either way. Measured — an
    // earlier version of this harness passed both an assertion and its opposite.
    animation: {
      entrance: { opacity: '1' },
      exit: { opacity: '0' },
      duration: 0,
      exitDuration: 0,
      transitionProperty: 'opacity',
    },
    containFocus: true,
    dismissOnClickOutside: true,
    // Not Escape, so a press that closed it would have to have gone through the declared key rather
    // than through the native path a modal dialog gets for free.
    dismissKey: 'Delete',
    // Not Escape, so a press that closed it would have to have gone through the declared key rather
    // than through the native path a modal dialog gets for free.
    prepare: async (signal) => {
      if (!holdPrepare()) {
        return;
      }
      setPrepareOutcome('running');
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 400);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve(undefined);
        });
      });
      setPrepareOutcome(signal.aborted ? 'aborted' : 'settled');
    },
    // Two parameters: what the caller sent, then the way to say no. Acceptance is the default —
    // the manager cannot infer it, because an open is asynchronous on every binding.
    onOpenRequest: (_payload, request) => {
      if (refuse()) {
        request.refuse('solid said no');
      }
    },
    onClose: (result) => {
      setLastReason(result.reason);
    },
    render: ({ action }) => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'Solid non-modal options'),
          h('button', { 'data-testid': 'first', ...action('inside') }, 'First'),
          h('button', { 'data-testid': 'second' }, 'Second'),
          h('button', { 'data-testid': 'third' }, 'Third')
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
    h(
      'button',
      {
        'data-testid': 'open-held',
        onClick: () => {
          setHoldPrepare(true);
          void modal.open();
        },
      },
      'Open with a slow prepare'
    ),
    h(
      'button',
      {
        'data-testid': 'close-mid-prepare',
        onClick: () => {
          modal.handle.close('inside');
        },
      },
      'Close while preparing'
    ),
    h(
      'button',
      {
        'data-testid': 'request',
        onClick: () => {
          setRefuse(true);
          void modal.dialogManager
            .requestOpenAndWait('solid-non-modal-options', createOpenRequest())
            .then((outcome) => {
              // `reason` is required on the refused branch — the union is what makes that so, and
              // a `??` fallback here is what the type-aware linter calls out as unreachable.
              setRequestOutcome(outcome.accepted ? 'accepted' : `refused: ${outcome.reason}`);
            });
        },
      },
      'Ask, and be refused'
    ),
    // Deliberately outside the panel, and wide, so a click on it is a click outside.
    h('button', { 'data-testid': 'outside', style: 'width: 120px' }, 'Outside'),
    text(() => {
      return modal.isVisible ? 'open' : 'closed';
    }, 'is-visible'),
    text(lastReason, 'last-reason'),
    text(prepareOutcome, 'prepare-outcome'),
    text(requestOutcome, 'request-outcome'),
    modal.Modal
  );
}

export const SolidNonModalOptionsApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, NonModalOptionsApp));
};

/**
 * `reconcileOpen` driven from a Solid signal, and the focus restored after a failed action.
 *
 * Together because both are about what happens *after* something settles, and both were exercised on
 * React and on nothing else. The signal is the Solid equivalent of a controlled `open` prop, and
 * `createEffect` is where the reconciliation runs — the same three lines React writes in `useEffect`.
 *
 * Non-modal, so the buttons that drive the signal stay reachable: a `showModal()` dialog puts every
 * click outside itself out of reach.
 */
function ReconcileApp(): Built {
  const [open, setOpen] = createSignal(false);
  const [openCount, setOpenCount] = createSignal(0);
  const [asked, setAsked] = createSignal<string[]>([]);

  const modal = useModal<void, 'close'>({
    id: 'solid-reconcile',
    ariaLabel: 'Solid reconcile',
    nonModal: true,
    portal: true,
    animation: {
      entrance: { opacity: '1' },
      exit: { opacity: '0' },
      duration: 0,
      // Long enough that `phase` and `isVisible` disagree for a measurable window, which is the whole
      // of what deciding on `phase` buys.
      exitDuration: 120,
      transitionProperty: 'opacity',
    },
    onClose: () => {
      setOpen(false);
    },
    render: ({ handle }) => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'Solid reconcile'),
          h(
            'button',
            {
              'data-testid': 'close-and-lower',
              onClick: () => {
                // Both in one handler: `onClose` runs when the exit finishes, so a call site that only
                // lowers the signal there never lands inside the disagreement window.
                handle.close('close');
                setOpen(false);
              },
            },
            'Close and lower'
          )
        )
      );
    },
  });

  const lookup = useLookup('solid-reconcile');

  createEffect(() => {
    const info = lookup();
    const next = reconcileOpen(info.exists ? info.phase : 'closed', open());
    if (next !== 'none') {
      setAsked((seen) => {
        return [...seen, next];
      });
    }
    if (next === 'open') {
      setOpenCount((n) => {
        return n + 1;
      });
      void modal.open();
    } else if (next === 'close') {
      modal.handle.close('close');
    }
  });

  return h(
    'div',
    null,
    h(
      'button',
      {
        'data-testid': 'raise',
        onClick: () => {
          setOpen(true);
        },
      },
      'Raise'
    ),
    h(
      'button',
      {
        'data-testid': 'lower',
        onClick: () => {
          setOpen(false);
        },
      },
      'Lower'
    ),
    h(
      'button',
      {
        'data-testid': 'open-behind-its-back',
        onClick: () => {
          modal.dialogManager.open('solid-reconcile');
        },
      },
      'Open imperatively'
    ),
    text(() => {
      const info = lookup();
      return info.exists ? info.phase : 'closed';
    }, 'phase'),
    text(() => {
      return open() ? 'true' : 'false';
    }, 'signal'),
    text(() => {
      return String(openCount());
    }, 'open-count'),
    text(() => {
      return asked().join(',');
    }, 'asked'),
    modal.Modal
  );
}

export const SolidReconcileApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, ReconcileApp));
};

/**
 * The focus restored after a failed action, on a **modal** dialog with two focusables in it.
 *
 * Modal and two buttons for the same reason: the restore target is whoever held focus when the action
 * started, so a harness with one focusable cannot tell a restore from focus never having moved, and a
 * non-modal one lets focus sit outside the dialog entirely.
 *
 * The action is async and rejects, which is the shape that escapes: focus can legitimately be
 * elsewhere by the time it settles, and the retry belongs to the button that was pressed.
 *
 * **No test asserts it yet, deliberately.** Measured through this harness, focus lands on the
 * `<dialog>` instead of on the button — on all three engines, so it is not engine-specific. The
 * disabled-button race this was first attributed to is **not** the cause: at restore time the
 * button reports `disabled=false` and takes `focus()` when asked, so nothing is being blurred out
 * from under the coordinator. Shipping a test that asserted the dialog would enshrine the defect;
 * the harness stays because a fix needs it.
 */
function FailedActionApp(): Built {
  const [failures, setFailures] = createSignal(0);

  const modal = useModal<void, 'boom'>({
    id: 'solid-failed-action',
    ariaLabel: 'Solid failed action',
    render: ({ action }) => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'Solid failed action'),
          h('button', { 'data-testid': 'other' }, 'Other'),
          h(
            'button',
            {
              'data-testid': 'fail',
              ...action('boom', {
                onAction: async () => {
                  await new Promise((resolve) => {
                    setTimeout(resolve, 60);
                  });
                  setFailures((n) => {
                    return n + 1;
                  });
                  throw new Error('solid action failed');
                },
              }),
            },
            'Fail'
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
    text(() => {
      return modal.isVisible ? 'open' : 'closed';
    }, 'is-visible'),
    text(() => {
      return String(failures());
    }, 'failures'),
    text(() => {
      return modal.error?.message ?? 'none';
    }, 'error'),
    modal.Modal
  );
}

export const SolidFailedActionApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, FailedActionApp));
};

/**
 * A modal claiming no opening focus, with a non-modal panel opening underneath it.
 *
 * The floor under `reclaimFocus`, on the second hook binding. Every binding reaches the repair
 * through `createFocusCoordinator`, so the function is shared — but *when* each binding syncs it is
 * not, and Solid's component body runs once where React's re-runs, which is the difference worth a
 * measurement rather than an inference.
 *
 * **Neither action claims `focusOnOpen`, and that is what puts this on the floor's path.** With a
 * claim there is a marker to aim at and the reclaim never reaches past it; `lastFocusInside` is
 * empty too, because the coordinator's `focusin` listener is attached after `showModal()` has
 * already placed the opening focus. So both candidates are absent and the floor is the only thing
 * left — which is exactly the arrangement that used to end at `dialog.focus()`.
 *
 * Two focusable actions, because with one "handed to the first focusable" and "focus never moved"
 * are the same element.
 */
function ClaimlessReclaimApp(): Built {
  const modal = useModal<void, 'confirm' | 'cancel'>({
    id: 'solid-claimless',
    ariaLabel: 'Solid modal claiming no opening focus',
    render: (ctx) => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'Claims nothing'),
          h('button', ctx.action('cancel'), 'Cancel'),
          h('button', ctx.action('confirm'), 'Confirm')
        )
      );
    },
  });

  const panel = useModal<void, 'close'>({
    id: 'solid-claimless-panel',
    nonModal: true,
    // Viewport-anchored rather than contained: the contained path lays a library-owned `inset: 0`
    // wrapper over the nearest sized ancestor, and the trigger below would end up beneath it.
    portal: true,
    ariaLabel: 'Panel opening underneath',
    render: () => {
      return el(
        h('div', null, h('button', { 'data-testid': 'solid-panel-button' }, 'In the panel'))
      );
    },
  });

  return h(
    'div',
    null,
    h(
      'button',
      {
        'data-testid': 'solid-open-both',
        onClick: () => {
          // Chained rather than two clicks: once the modal is up it owns the top layer and this
          // button is under its backdrop, so the second open has to be arranged before the first.
          void modal.open().then(() => {
            return panel.open();
          });
        },
      },
      'Open the modal, then the panel underneath'
    ),
    modal.Modal,
    // `null` under `portal: true` — the binding mounts the dialog itself. Kept for the symmetry
    // with the React harness, where it is the node that places the panel.
    panel.Modal
  );
}

export const SolidClaimlessReclaimApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, ClaimlessReclaimApp));
};

/**
 * A `prepare` that throws, reported through `onError` — the second binding.
 *
 * The wiring differs from React's and that is why this is measured rather than inherited: React
 * reads the callback through a ref so a teardown reports to whichever `onError` is current, while
 * Solid passes `options.onError` straight through. Same guarantee, two schedules.
 */
function PrepareFailureApp(): Built {
  const [sources, setSources] = createSignal<string[]>([]);
  const [message, setMessage] = createSignal('none');

  const modal = useModal({
    id: 'solid-prepare-failure',
    ariaLabel: 'Solid prepare that fails',
    prepare: async () => {
      await Promise.resolve();
      throw new Error('report is unavailable');
    },
    onError: ({ error, source }) => {
      setSources((seen) => {
        return [...seen, source];
      });
      setMessage(error.message);
    },
    render: (ctx) => {
      return el(
        h(
          'div',
          null,
          h('p', null, 'The dialog is up either way.'),
          text(() => {
            return ctx.isPreparing ? 'preparing' : 'ready';
          }, 'solid-pf-preparing')
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
        'data-testid': 'solid-pf-open',
        onClick: () => {
          void modal.open();
        },
      },
      'Open'
    ),
    text(() => {
      return modal.isVisible ? 'open' : 'closed';
    }, 'solid-pf-visible'),
    text(() => {
      return sources().join(',') || 'none';
    }, 'solid-pf-sources'),
    text(message, 'solid-pf-message'),
    modal.Modal
  );
}

export const SolidPrepareFailureApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, PrepareFailureApp));
};
