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
 * The Solid half of the binding's component tests, written with `h` because Solid's JSX needs
 * `babel-preset-solid` and the CT bundle is React's — harmless, since `h` and compiled JSX produce
 * the same calls and hyperscript detects action getters through the property descriptor. Each
 * harness gets its own `DialogManagerProvider`; Playwright's global wrapper provides React's only.
 */

/** What `h` hands back: a thunk, which Solid's `JSX.Element` deliberately does not name. */
type Built = ReturnType<typeof h>;

/** Run the thunk where a `JSX.Element` is required. The node it produces is one. */
const el = (built: Built): JSX.Element => {
  return built();
};

/** Reactive text, as a child function — the shape hyperscript re-runs on change. */
const text = (read: () => string, testId: string): Built => {
  return h('span', { 'data-testid': testId }, read);
};

/** The ordinary surface, asserted *outside* the dialog so a stale read would show. */
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
    // Not destructured: the live fields are getters, and pulling them out freezes them.
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
          // Off the factory, which Solid wraps to attach an expiry: `isRunning` had to survive it.
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
 * The declaration window a fine-grained renderer closes by hand: backdrop dismissal is opt-out
 * without actions and opt-in with them, so with the button gone a click must dismiss again — which
 * it never would without `engine.undeclare` on the button's cleanup.
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
          // Inside `render` for the top layer; a plain button, since an action would defeat this.
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
 * The slide template, and the one thing only Solid can get wrong: `useSlideModal` composes `args`
 * with `direction` through `mergeProps`, not a spread. A spread freezes every getter — `direction`
 * would still be right and `isPreparing` would never come back, so the second is the assertion.
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

  // `useDialogManager` returns an object of getters, `useLookup` an accessor; both must be live.
  const dialogs = useDialogManager();
  const info = useLookup('solid-slide');

  return h(
    'div',
    null,
    text(() => {
      return String(dialogs.openDialogs.length);
    }, 'open-count'),
    // A getter of its own: `openDialogs` moving is not evidence that `foreground` does.
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
 * The binding's three pieces of `onCleanup` work: unregistering from the manager, retiring the outlet
 * entry, removing a portaled element from `document.body`. A child function disposes them, since
 * hyperscript re-runs it and disposes the owner of the branch it replaces — Solid's unmount.
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
          // Inside `render`: an open dialog owns the top layer, so a button outside is unclickable.
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
 * The live fields on the **hook's return** — the copy a trigger button reads while the modal works.
 * Getters over signals here, so "reaches the return" and "stays live" are two claims and only the
 * first is a type error; all of it is asserted *outside* `render`, where a frozen getter never moves.
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
          // The render args' `error` getter — the same fact on the other side of the seam.
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
 * The accessible name and `aria-busy`, which Solid writes onto its own `<dialog>` from a render
 * effect rather than a one-shot loop — so "written at all" and "still written next transition" are
 * two claims. The gate is released from inside the dialog, which owns the top layer while open.
 */
function BusyApp(): Built {
  // A signal, not a `let`: the gate is set from inside an async callback.
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
 * The labelling diagnostic. Solid's lifecycle effect tracks what its body reads, so the check re-runs
 * when `prepare` settles only because `isPreparing` is passed *in* — the late-title half catches it.
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
 * `prioritize` through Solid — two modal dialogs and a policy that outranks open order. Inherited
 * through the wholesale re-export, so nothing would fail if a binding stopped reaching it
 * (`binding-parity.test.ts` compares export *names*): this is the only thing that notices.
 * `withPolicy` is a factory parameter because `SolidRoot` takes a component, not props; the `false`
 * half is the baseline, a reorder that never happened looking identical to one not needed.
 *
 * Two silent breakers: the policy is installed at **setup**, a Solid body running once, so
 * `onCleanup` owns the disposer; and the sizes are **strings**, since `applyStyle` writes them
 * verbatim and a bare `300` type-checks, emits nothing, and stops the dialogs overlapping.
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
 * `containFocus`, `dismissOnClickOutside`, a custom `dismissKey`, `prepare` aborted by its own close,
 * and `onOpenRequest` — one app rather than five, since they make the same claim (that these reach
 * the shared `attach*` functions from this binding's effects), each with its own probe. Non-modal:
 * `containFocus` is the Tab wrap `show()` does not give, and the union rejects the pair on a modal.
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
    // Instant, and load-bearing: with the default 200 ms exit a closing panel still reads
    // `isVisible` — measured, an earlier harness passed both an assertion and its opposite.
    animation: {
      entrance: { opacity: '1' },
      exit: { opacity: '0' },
      duration: 0,
      exitDuration: 0,
      transitionProperty: 'opacity',
    },
    containFocus: true,
    dismissOnClickOutside: true,
    // Not Escape: a close then has to come through the declared key rather than the native path.
    dismissKey: 'Delete',
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
    // Acceptance is the default: the manager cannot infer it, an open being asynchronous.
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
              // `reason` is required on the refused branch, so a `??` fallback lints as unreachable.
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
 * `reconcileOpen` from a Solid signal — a controlled `open` prop, with `createEffect` where React
 * writes `useEffect`. Non-modal, so the buttons driving the signal stay reachable outside.
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
      // Long enough that `phase` and `isVisible` disagree for a measurable window.
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
                // Both at once: `onClose` runs only when the exit finishes.
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
 * Focus restored after a failed action: **modal**, **two** focusables, since the target is whoever
 * held focus when the action started — one cannot tell a restore from focus never moving, non-modal
 * lets focus sit outside. Async and rejecting, the shape where focus can be elsewhere when it
 * settles. **No test asserts it yet**: measured here, focus lands on the `<dialog>` on all three
 * engines, and the disabled-button race is **not** the cause — at restore time the button reports
 * `disabled=false` and takes `focus()`. Asserting it enshrines the bug; the harness stays for a fix.
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
 * The floor under `reclaimFocus`, on the second hook binding: `createFocusCoordinator` is shared but
 * *when* each syncs it is not, Solid's body running once where React's re-runs. **Neither action
 * claims `focusOnOpen`, which puts this on the floor's path** — a claim would give the reclaim a
 * marker, and `lastFocusInside` is empty too, its `focusin` listener attaching after `showModal()`
 * placed the opening focus. Two actions, since with one a restore and a stay are the same element.
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
    // Viewport-anchored: contained would lay an `inset: 0` wrapper over the trigger below.
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
          // Chained, not two clicks: once the modal is up this button is under its backdrop.
          void modal.open().then(() => {
            return panel.open();
          });
        },
      },
      'Open the modal, then the panel underneath'
    ),
    modal.Modal,
    // `null` under `portal: true`; kept for symmetry with React's harness, where it places the panel.
    panel.Modal
  );
}

export const SolidClaimlessReclaimApp = (): JSX.Element => {
  return el(h(DialogManagerProvider, null, ClaimlessReclaimApp));
};

/**
 * A `prepare` that throws, reported through `onError`. Measured, not inherited: React reads the
 * callback through a ref so a teardown reports to whichever `onError` is current, Solid passes
 * `options.onError` straight through.
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
